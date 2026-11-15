// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { MIN_LANDING_WINDOW_HOURS } from './config.js'
import { computeEphemeris } from './ephemeris.js'
import { latLonToUnit, localFrame } from './geometry.js'
import {
  GRID_DIRECTIONS, decodeGridHorizon, encodeGridHorizon, evaluateLandingGrid, globalGridPoints, globalGridVectors, gridHorizonOf,
} from './landingAreas.js'
import { computeSeries, findLandingWindows } from './series.js'

const GRAU = Math.PI / 180
const NOV_14 = Date.UTC(2026, 10, 14)

describe('o horizonte de um ponto da grade em um byte por direção', () => {
  it('guarda cada direção em passos de 0,2°, de −5° a 46°', () => {
    const horizonte = Float32Array.from({ length: GRID_DIRECTIONS }, (_, a) => (-5 + (a % 250) * 0.2) * GRAU)
    const bytes = encodeGridHorizon(horizonte)
    expect(bytes).toHaveLength(GRID_DIRECTIONS)
    expect(bytes[0]).toBe(0)
    expect(bytes[25]).toBe(25)
    const volta = decodeGridHorizon(bytes, 0)
    for (let a = 0; a < GRID_DIRECTIONS; a++) expect(Math.abs(volta[a] - horizonte[a]) / GRAU).toBeLessThan(0.1001)
  })

  it('fora da faixa, para no extremo em vez de dar a volta', () => {
    const bytes = encodeGridHorizon(Float32Array.from({ length: GRID_DIRECTIONS }, (_, a) => (a === 0 ? -90 : 80) * GRAU))
    expect(bytes[0]).toBe(0)
    expect(bytes[1]).toBe(255)
  })

  it('lê o horizonte do ponto certo num arquivo com vários pontos', () => {
    const arquivo = new Uint8Array(GRID_DIRECTIONS * 3)
    arquivo.fill(50, GRID_DIRECTIONS, GRID_DIRECTIONS * 2)
    expect(decodeGridHorizon(arquivo, 1)[7] / GRAU).toBeCloseTo(5, 5)
    expect(decodeGridHorizon(arquivo, 2)[7] / GRAU).toBeCloseTo(-5, 5)
  })
})

describe('quais pontos da grade têm janela de pouso no período (evaluateLandingGrid)', () => {
  const ephemeris = computeEphemeris(NOV_14, 30 * 24, 1)
  const pontos = [[-89.5, 0], [-88, 40], [-86, -120], [-85, 170], [-84.5, 20], [-87, 90]].map(([lat, lon]) => latLonToUnit(lat, lon))
  // três horizontes: livre (−5°), um muro de 20° em volta e um intermediário, de 2°
  const alturas = [-5, 20, 2, -5, 2, 20]
  const horizons = new Uint8Array(GRID_DIRECTIONS * pontos.length)
  alturas.forEach((graus, i) => horizons.fill(Math.round((graus + 5) / 0.2), i * GRID_DIRECTIONS, (i + 1) * GRID_DIRECTIONS))
  const grade = { horizons, points: Float64Array.from(pontos.flat()) }

  it('dá, para cada ponto, o mesmo sim ou não que as janelas de pouso do painel com o mesmo horizonte', () => {
    const resultado = evaluateLandingGrid(grade, ephemeris, { minWindowHours: MIN_LANDING_WINDOW_HOURS, mastM: 2 })
    expect(resultado).toHaveLength(pontos.length)
    pontos.forEach((point, i) => {
      const horizon = gridHorizonOf(grade, i, 2)
      const janelas = findLandingWindows(computeSeries(horizon, ephemeris), MIN_LANDING_WINDOW_HOURS)
      expect(resultado[i], `ponto ${i}`).toBe(janelas.length > 0 ? 1 : 0)
    })
  })

  it('atrás de um muro de 20° não há janela; com o horizonte livre perto do polo, há', () => {
    const resultado = evaluateLandingGrid(grade, ephemeris, { minWindowHours: MIN_LANDING_WINDOW_HOURS, mastM: 2 })
    expect(resultado[1]).toBe(0)
    expect(resultado[5]).toBe(0)
    expect(resultado[0]).toBe(1)
  })

  it('o horizonte do ponto da grade tem o referencial do próprio ponto', () => {
    const horizon = gridHorizonOf(grade, 2, 2)
    expect(horizon.directions).toBe(GRID_DIRECTIONS)
    expect(horizon.observerHeightM).toBe(2)
    expect(horizon.frame).toEqual(localFrame(pontos[2]))
    expect(horizon.elevationsRad[10] / GRAU).toBeCloseTo(2, 5)
  })
})

describe('a grade da Lua inteira (globalGridPoints)', () => {
  const pontos = globalGridPoints(2, -84)

  it('tem faixas de 2° de latitude, com 180 pontos no equador e menos perto dos polos', () => {
    const equador = pontos.filter((ponto) => ponto.lat === 1)
    expect(equador).toHaveLength(180)
    expect(equador[0].lon).toBeCloseTo(1, 12)
    const perto = pontos.filter((ponto) => ponto.lat === 89)
    expect(perto.length).toBeLessThan(6)
    expect(perto.length).toBeGreaterThan(0)
  })

  it('deixa de fora a área do polo sul, que tem a grade própria', () => {
    expect(Math.min(...pontos.map((ponto) => ponto.lat))).toBe(-83)
    expect(Math.max(...pontos.map((ponto) => ponto.lat))).toBe(89)
  })

  it('o espaçamento em quilômetros é parecido em toda latitude: a área por ponto varia pouco', () => {
    // a área de uma faixa é proporcional ao cosseno da latitude; dividida pelos pontos dela, dá a área de cada um
    const areaPorPonto = (lat) => Math.cos((lat * Math.PI) / 180) / pontos.filter((ponto) => ponto.lat === lat).length
    expect(areaPorPonto(61) / areaPorPonto(1)).toBeGreaterThan(0.9)
    expect(areaPorPonto(61) / areaPorPonto(1)).toBeLessThan(1.1)
  })

  it('os vetores saem na mesma ordem, com tamanho 1', () => {
    const vetores = globalGridVectors(pontos)
    expect(vetores).toHaveLength(pontos.length * 3)
    expect(Math.hypot(vetores[0], vetores[1], vetores[2])).toBeCloseTo(1, 12)
  })
})

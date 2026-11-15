// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { computeEphemeris } from './ephemeris.js'
import { latLonToUnit } from './geometry.js'
import { ECLIPTIC_SKY_MATRIX, moonOrbitPath, systemStateAt } from './system.js'

const GRAU = 180 / Math.PI
const NOV_14 = Date.UTC(2026, 10, 14)
const DIA = 24 * 3600e3
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const tamanho = (v) => Math.hypot(...v)
const angulo = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (tamanho(a) * tamanho(b))))) * GRAU
// a matriz 4 × 4 em colunas: a coluna c é a direção de um eixo do corpo no desenho
const coluna = (m, c) => [m[4 * c], m[4 * c + 1], m[4 * c + 2]]
// no desenho, o y aponta para o norte do plano da órbita da Terra (a eclíptica)
const NORTE = [0, 1, 0]

describe('a Terra, a Lua e o Sol num instante (systemStateAt)', () => {
  const estado = systemStateAt(NOV_14)

  it('a Lua fica à distância que ela tem da Terra: entre o perigeu e o apogeu', () => {
    expect(estado.distanceKm).toBeGreaterThan(356000)
    expect(estado.distanceKm).toBeLessThan(407000)
    expect(tamanho(estado.moonKm)).toBeCloseTo(estado.distanceKm, 3)
  })

  it('a órbita da Lua fica a uns 5° do plano da órbita da Terra, e nunca longe dele', () => {
    let maior = 0
    for (let d = 0; d < 28; d++) {
      const { moonKm } = systemStateAt(NOV_14 + d * DIA)
      maior = Math.max(maior, Math.abs(90 - angulo(moonKm, NORTE)))
    }
    expect(maior).toBeGreaterThan(4.5)
    expect(maior).toBeLessThan(5.5)
  })

  it('o eixo da Terra está inclinado 23,4° e o da Lua, 1,5°, em relação ao norte da eclíptica', () => {
    // o eixo y do corpo, no desenho, é o polo norte dele
    expect(angulo(coluna(estado.earthMatrix, 1), NORTE)).toBeCloseTo(23.44, 1)
    expect(angulo(coluna(estado.moonMatrix, 1), NORTE)).toBeGreaterThan(1.4)
    expect(angulo(coluna(estado.moonMatrix, 1), NORTE)).toBeLessThan(1.7)
  })

  it('a Lua mostra sempre a mesma face para a Terra, a menos da libração', () => {
    for (let d = 0; d < 28; d += 3) {
      const { moonKm, moonMatrix, subEarth } = systemStateAt(NOV_14 + d * DIA)
      // o eixo x da Lua, no desenho, é o meio do lado visível (latitude 0°, longitude 0°)
      const paraATerra = moonKm.map((v) => -v)
      const desvio = angulo(coluna(moonMatrix, 0), paraATerra)
      expect(desvio).toBeLessThan(9)
      // o desvio é a própria libração: o ponto da Lua com a Terra a pino
      const meioDoLadoVisivel = latLonToUnit(0, 0)
      expect(desvio).toBeCloseTo(angulo(latLonToUnit(subEarth.lat, subEarth.lon), meioDoLadoVisivel), 1)
    }
  })

  it('a direção do Sol e o ponto com o Sol a pino batem com o motor do horizonte', () => {
    const { sunDirection } = computeEphemeris(NOV_14, 1, 1)
    const { subSolar } = estado
    const esperado = Array.from(sunDirection)
    expect(angulo(latLonToUnit(subSolar.lat, subSolar.lon), esperado)).toBeLessThan(0.01)
    expect(tamanho(estado.sunDirection)).toBeCloseTo(1, 12)
  })

  it('a parte iluminada da Lua vista da Terra vai de quase 0 a quase 1 ao longo de um mês', () => {
    const fracoes = Array.from({ length: 30 }, (_, d) => systemStateAt(NOV_14 + d * DIA).phaseFraction)
    expect(Math.min(...fracoes)).toBeLessThan(0.05)
    expect(Math.max(...fracoes)).toBeGreaterThan(0.95)
  })
})

describe('o caminho da Lua em volta da Terra (moonOrbitPath)', () => {
  it('dá uma volta inteira em um mês sideral: o fim encosta no começo', () => {
    const caminho = moonOrbitPath(NOV_14, 120)
    expect(caminho).toHaveLength(121)
    // a órbita não fecha exatamente (ela gira devagar), mas a Lua volta à mesma direção
    expect(angulo(caminho[0], caminho[120])).toBeLessThan(3)
    expect(angulo(caminho[0], caminho[60])).toBeGreaterThan(170)
  })
})

describe('o céu de estrelas no desenho da eclíptica (ECLIPTIC_SKY_MATRIX)', () => {
  it('põe o polo norte celeste a 23,4° do norte da eclíptica, e não muda o tamanho das direções', () => {
    // a coluna 2 é para onde vai o eixo z do catálogo, o polo norte celeste
    expect(angulo(coluna(ECLIPTIC_SKY_MATRIX, 2), NORTE)).toBeCloseTo(23.44, 1)
    for (let c = 0; c < 3; c++) expect(tamanho(coluna(ECLIPTIC_SKY_MATRIX, c))).toBeCloseTo(1, 12)
  })
})

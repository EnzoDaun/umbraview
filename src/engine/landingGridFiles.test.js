// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HORIZON, MIN_LANDING_WINDOW_HOURS, PERIOD_DAYS } from './config.js'
import { computeEphemeris } from './ephemeris.js'
import { unitToLatLon } from './geometry.js'
import { GRID_DIRECTIONS, evaluateLandingGrid } from './landingAreas.js'
import { globalLandingMask, landingMask, loadLandingGrid } from './landingGridFiles.js'
import { createSiteSky } from './siteSky.js'

const DATA = join(import.meta.dirname, '..', '..', 'public', 'data')
const doDisco = (pasta) => async (caminho) => {
  const bytes = await readFile(join(DATA, pasta, caminho))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}
const NOV_14 = Date.UTC(2026, 10, 14)

describe('a grade de pouso do site (public/data/landing-grid/)', () => {
  it('tem um horizonte por ponto, e todo ponto fica na área em que dá para escolher', async () => {
    const { horizons, points, layout } = await loadLandingGrid(doDisco('landing-grid'))
    expect(horizons.length).toBe(layout.points * GRID_DIRECTIONS)
    expect(points.length).toBe(layout.points * 3)
    expect(layout.points).toBeGreaterThan(3000)
    for (let i = 0; i < layout.points; i += 97) {
      const { lat } = unitToLatLon([points[3 * i], points[3 * i + 1], points[3 * i + 2]])
      expect(lat).toBeLessThanOrEqual(-84 + 1e-9)
    }
  })

  it('recusa o arquivo cortado', async () => {
    const leitura = doDisco('landing-grid')
    const cortado = async (caminho) => (caminho.endsWith('.bin') ? (await leitura(caminho)).slice(0, 1000) : leitura(caminho))
    await expect(loadLandingGrid(cortado)).rejects.toThrow(/bytes/)
  })

  it('o mapa diz o mesmo que o painel: nos pontos da grade, ter janela de pouso é ter janela na lista do ponto', async () => {
    const grade = await loadLandingGrid(doDisco('landing-grid'))
    const ephemeris = computeEphemeris(NOV_14, PERIOD_DAYS * 24, 1)
    const mapa = evaluateLandingGrid(grade, ephemeris, { minWindowHours: MIN_LANDING_WINDOW_HOURS, mastM: HORIZON.mastM })
    const ceuDoPonto = createSiteSky(doDisco('relief'))
    let iguais = 0
    const indices = [0, 500, 1000, 1500, 2000, 2076, 2500, 3000, 3500, 4000]
    for (const i of indices) {
      const { lat, lon } = unitToLatLon([grade.points[3 * i], grade.points[3 * i + 1], grade.points[3 * i + 2]])
      const sky = await ceuDoPonto({ lat, lon }, NOV_14)
      if ((sky.landingWindows.length > 0 ? 1 : 0) === mapa[i]) iguais++
    }
    // o horizonte da grade é arredondado em passos de 0,2°: um ponto no limite pode trocar de lado
    expect(iguais).toBeGreaterThanOrEqual(indices.length - 1)
  })
})

describe('a máscara do mapa (landingMask)', () => {
  it('marca o quadrado de cada ponto com janela, com a linha de baixo da grade primeiro', () => {
    const layout = { columns: 3, rows: 2, cells: [0, 0, 2, 0, 1, 1] }
    // o ponto 0 (coluna 0, linha de cima) e o 2 (coluna 1, linha de baixo) têm janela
    const mascara = landingMask(layout, Uint8Array.from([1, 0, 1]))
    expect(Array.from(mascara)).toEqual([0, 255, 0, 255, 0, 0])
  })
})

describe('a grade da Lua inteira do site', () => {
  it('tem um horizonte por ponto da grade de 2°, fora da área do polo sul', async () => {
    const { global } = await loadLandingGrid(doDisco('landing-grid'))
    expect(global.layout.stepDeg).toBe(2)
    expect(global.horizons.length).toBe(global.layout.gridPoints.length * GRID_DIRECTIONS)
    expect(global.points.length).toBe(global.layout.gridPoints.length * 3)
    expect(Math.min(...global.layout.gridPoints.map((ponto) => ponto.lat))).toBeGreaterThan(-84)
  })

  it('no lado oculto não há janela de pouso em lugar nenhum: a Terra nunca aparece de lá', async () => {
    const { global } = await loadLandingGrid(doDisco('landing-grid'))
    const ephemeris = computeEphemeris(NOV_14, PERIOD_DAYS * 24, 1)
    const mapa = evaluateLandingGrid(global, ephemeris, { minWindowHours: MIN_LANDING_WINDOW_HOURS, mastM: HORIZON.mastM })
    let ladoOculto = 0
    let ladoVisivel = 0
    let comJanelaNoLadoVisivel = 0
    global.layout.gridPoints.forEach(({ lat, lon }, i) => {
      // longe da borda entre os dois lados, onde a libração decide
      if (Math.abs(lat) > 60) return
      if (lon > 110 && lon < 250) ladoOculto += mapa[i]
      if (lon < 60 || lon > 300) {
        ladoVisivel++
        comJanelaNoLadoVisivel += mapa[i]
      }
    })
    expect(ladoOculto).toBe(0)
    // no lado visível, longe dos polos, o Sol e a Terra ficam juntos no céu por dias: quase todo ponto tem janela
    expect(comJanelaNoLadoVisivel / ladoVisivel).toBeGreaterThan(0.95)
  })
})

describe('a máscara do mapa da Lua inteira (globalLandingMask)', () => {
  it('pinta o quadrado do ponto, e perto do polo a fatia inteira de longitude dele', () => {
    const layout = {
      stepDeg: 90,
      gridPoints: [
        { band: 0, index: 0, count: 1 },
        { band: 1, index: 1, count: 4 },
        { band: 1, index: 3, count: 4 },
      ],
    }
    const { mask, width, height } = globalLandingMask(layout, Uint8Array.from([1, 1, 0]))
    expect([width, height]).toEqual([4, 2])
    // a faixa 0 tem um ponto só, que cobre as quatro colunas; na faixa 1, só a coluna do ponto com janela
    expect(Array.from(mask)).toEqual([255, 255, 255, 255, 0, 255, 0, 0])
  })
})

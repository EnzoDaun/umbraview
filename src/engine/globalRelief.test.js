// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HORIZON } from './config.js'
import { MOON_RADIUS_M, latLonToUnit } from './geometry.js'
import { computeHorizon } from './horizon.js'
import { cylindricalWindowRelief } from './relief.js'
import { globalWindow, loadGlobalReliefLayers, loadReliefLayers } from './reliefFiles.js'
import { createSiteSky } from './siteSky.js'

const RELIEF = join(import.meta.dirname, '..', '..', 'public', 'data', 'relief')
const lidos = []
const doDisco = async (caminho) => {
  lidos.push(caminho)
  const bytes = await readFile(join(RELIEF, caminho))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}
const manifesto = async (caminho) => JSON.parse(await readFile(join(RELIEF, caminho), 'utf8'))
const GLOBAL = await manifesto('global/manifest.json')
const NOV_14 = Date.UTC(2026, 10, 14)

describe('um pedaço da grade da Lua inteira (cylindricalWindowRelief)', () => {
  // uma grade de 4 pixels por grau em que a altura é a própria coluna, de 0° a 360°
  const pixelsPerDegree = 4
  const totalColumns = 360 * pixelsPerDegree
  const janela = (firstColumn, columns) =>
    cylindricalWindowRelief({
      heights: Int16Array.from({ length: 8 * columns }, (_, i) => (((firstColumn + (i % columns)) % totalColumns) + totalColumns) % totalColumns),
      pixelsPerDegree, totalColumns, firstRow: 356, firstColumn, rows: 8, columns,
    })

  it('lê a altura pela latitude e longitude, no meio do pixel', () => {
    const relevo = janela(40, 40)
    // longitude 12,625° é o centro da coluna 50; latitude 0° fica entre as linhas 359 e 360
    expect(relevo.sample(...latLonToUnit(0, 12.625))).toBeCloseTo(50, 6)
  })

  it('um pedaço que atravessa a longitude 0° lê dos dois lados dela', () => {
    const relevo = janela(-20, 40)
    expect(relevo.sample(...latLonToUnit(0, -2.375))).toBeCloseTo(totalColumns - 10, 6)
    expect(relevo.sample(...latLonToUnit(0, 2.625))).toBeCloseTo(10, 6)
  })

  it('fora do pedaço, não tem dado', () => {
    expect(janela(40, 40).sample(...latLonToUnit(0, 100))).toBeNaN()
    expect(janela(40, 40).sample(...latLonToUnit(30, 12))).toBeNaN()
  })
})

describe('o pedaço do relevo da Lua inteira em volta de um ponto (globalWindow)', () => {
  it('no equador, cobre os 200 km do horizonte para cada lado: uns 6,6° de latitude e de longitude', () => {
    const { firstRow, rows, firstColumn, columns } = globalWindow(GLOBAL, latLonToUnit(0, 90))
    const graus = (HORIZON.maxDistanceM / MOON_RADIUS_M) * (180 / Math.PI)
    expect(rows / GLOBAL.pixelsPerDegree).toBeGreaterThan(2 * graus)
    expect(rows / GLOBAL.pixelsPerDegree).toBeLessThan(2 * graus + 2)
    expect(columns / GLOBAL.pixelsPerDegree).toBeGreaterThan(2 * graus)
    expect(columns / GLOBAL.pixelsPerDegree).toBeLessThan(2 * graus + 2)
    expect(firstRow).toBeGreaterThan(0)
    expect(firstColumn / GLOBAL.pixelsPerDegree).toBeLessThan(90 - graus)
  })

  it('longe do equador, a faixa de longitude alarga; perto do polo, dá a volta inteira', () => {
    const emSessenta = globalWindow(GLOBAL, latLonToUnit(60, 10))
    expect(emSessenta.columns).toBeGreaterThan(globalWindow(GLOBAL, latLonToUnit(0, 10)).columns * 1.8)
    const noPolo = globalWindow(GLOBAL, latLonToUnit(87, 10))
    // a volta inteira, mais uma coluna repetida para a interpolação na emenda
    expect(noPolo.columns).toBe(GLOBAL.columns + 1)
    expect(noPolo.firstRow).toBe(0)
  })
})

describe('o relevo da Lua inteira do site (public/data/relief/global/)', () => {
  it('bate com o relevo do polo sul, que vem de outro arquivo da NASA, onde os dois se cobrem', async () => {
    const polar = await manifesto('manifest.json')
    let soma = 0
    let pior = 0
    const pontos = [[-85, 0], [-85, 90], [-85, 180], [-85, 270], [-86.5, 45], [-84.5, 135], [-87, 300], [-84.2, 210]]
    for (const [lat, lon] of pontos) {
      const p = latLonToUnit(lat, lon)
      const grosso = (await loadReliefLayers(polar, p, doDisco))[1].relief.sample(...p)
      const global = (await loadGlobalReliefLayers(GLOBAL, p, doDisco))[0].relief.sample(...p)
      const diferenca = Math.abs(grosso - global)
      soma += diferenca
      if (diferenca > pior) pior = diferenca
    }
    // os dois têm pixels de tamanhos diferentes (960 m e 1,9 km): numa encosta, a diferença passa
    // de 100 m; um relevo deslocado ou espelhado daria quilômetros
    expect(soma / pontos.length).toBeLessThan(250)
    expect(pior).toBeLessThan(900)
  })

  it('baixa só os ladrilhos em volta do ponto, e não a Lua inteira', async () => {
    lidos.length = 0
    await loadGlobalReliefLayers(GLOBAL, latLonToUnit(26.13, 3.63), doDisco)
    const ladrilhos = lidos.filter((caminho) => caminho.startsWith('global/r'))
    expect(ladrilhos.length).toBeGreaterThan(0)
    // o pedaço de uns 14° pode pegar três ladrilhos de 10° em cada direção: 9 dos 648
    expect(ladrilhos.length).toBeLessThanOrEqual(9)
  })

  it('dá um horizonte completo para um ponto fora do polo, sem direção sem dado', async () => {
    const p = latLonToUnit(26.13, 3.63)
    const horizonte = computeHorizon(await loadGlobalReliefLayers(GLOBAL, p, doDisco), p, HORIZON)
    for (const elevacao of horizonte.elevationsRad) {
      expect(elevacao).toBeGreaterThan(-Math.PI / 4)
      expect(elevacao).toBeLessThan(Math.PI / 4)
    }
  })
})

describe('o céu de um ponto fora do polo sul', () => {
  const ceu = createSiteSky(doDisco)

  it('no meio do lado virado para a Terra, a Terra fica no alto e à vista o período inteiro', async () => {
    const sky = await ceu({ lat: 0, lon: 0 }, NOV_14)
    expect(sky.earthFraction).toBe(1)
    expect(sky.earthNow.elevationDeg).toBeGreaterThan(80)
    expect(sky.earthBelowHorizonFraction).toBe(0)
    expect(sky.terrain).toEqual({ coarse: true, metersPerPixel: 1895 })
  })

  it('no meio do lado oculto, a Terra nunca aparece, e não é o relevo que esconde', async () => {
    const sky = await ceu({ lat: 0, lon: 180 }, NOV_14)
    expect(sky.earthFraction).toBe(0)
    expect(sky.earthBelowHorizonFraction).toBe(1)
    expect(sky.earthNow.belowHorizon).toBe(true)
    expect(sky.landingWindows).toEqual([])
  })

  it('no equador, o Sol fica à vista perto de metade do período, e de noite está abaixo do horizonte', async () => {
    const sky = await ceu({ lat: 0, lon: 90 }, NOV_14)
    expect(sky.sunFraction).toBeGreaterThan(0.44)
    expect(sky.sunFraction).toBeLessThan(0.56)
    const noite = sky.groundView.sun.find((hora) => hora.elevationDeg < -10)
    expect(noite.visible).toBe(false)
  })

  it('dentro de 84°S, o céu continua vindo do relevo fino do polo', async () => {
    const sky = await ceu({ lat: -85, lon: 30 }, NOV_14)
    expect(sky.terrain).toEqual({ coarse: false, metersPerPixel: 80 })
  })
})

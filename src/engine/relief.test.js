// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { latLonToUnit, polarXYToUnit } from './geometry.js'
import { cylindricalGridRelief, polarGridRelief, tiledPolarRelief } from './relief.js'

/* Um plano inclinado é a prova da interpolação: a média ponderada de quatro cantos de um plano
   cai exatamente no plano, em qualquer ponto entre eles. Se a conta trocar linha com coluna ou
   errar meio pixel, o valor sai do plano. */

const A = 0.37
const B = -0.21
const C = 812.5

function polarPlane({ columns = 50, rows = 40, resolutionM = 80, x0 = -2000, y0 = 1600 } = {}) {
  const heights = new Float64Array(columns * rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const x = x0 + (c + 0.5) * resolutionM
      const y = y0 - (r + 0.5) * resolutionM
      heights[r * columns + c] = A * x + B * y + C
    }
  }
  return { heights, resolutionM, x0, y0, columns, rows }
}

const sampleXY = (relief, x, y) => relief.sample(...polarXYToUnit(x, y))

describe('relevo em grade polar (arquivos LOLA do polo)', () => {
  it('a interpolação cai exatamente no plano, em qualquer ponto de dentro', () => {
    const relief = polarGridRelief(polarPlane())
    for (const [x, y] of [[-1900, 1500], [-1234.5, 678.9], [1700, -1300], [0, 0], [-333.3, -555.5]]) {
      expect(Math.abs(sampleXY(relief, x, y) - (A * x + B * y + C)), `${x}, ${y}`).toBeLessThan(1e-6)
    }
  })

  it('aplica a escala: altura guardada em meio metro volta em metros', () => {
    const heights = Int16Array.from([100, 100, 100, 100])
    const relief = polarGridRelief({ heights, scale: 0.5, resolutionM: 80, x0: 0, y0: 160, columns: 2, rows: 2 })
    expect(sampleXY(relief, 80, 80)).toBe(50)
  })

  it('fora da grade não tem valor', () => {
    const relief = polarGridRelief(polarPlane())
    expect(sampleXY(relief, 5000, 0)).toBeNaN()
    expect(sampleXY(relief, 0, 9000)).toBeNaN()
  })

  it('pixel sem dado deixa o ponto sem valor, e não com altura inventada', () => {
    const plano = polarPlane()
    plano.heights[20 * plano.columns + 25] = -32768
    const relief = polarGridRelief({ ...plano, noData: -32768 })
    const xSemDado = plano.x0 + 25.5 * plano.resolutionM
    const ySemDado = plano.y0 - 20.5 * plano.resolutionM
    expect(sampleXY(relief, xSemDado + 10, ySemDado - 10)).toBeNaN()
    expect(sampleXY(relief, xSemDado + 400, ySemDado)).not.toBeNaN()
  })
})

describe('relevo em grade cilíndrica (arquivos LOLA da Lua inteira)', () => {
  /* Grade de 4 pixels por grau, no formato dos rótulos PDS: linha = LINE_PROJECTION_OFFSET −
     latitude·resolução; coluna = SAMPLE_PROJECTION_OFFSET + resolução·(longitude − CENTER_LONGITUDE). */
  const PPD = 4

  function cylindricalPlane() {
    const grid = { pixelsPerDegree: PPD, lineOffset: 40, sampleOffset: -20, centerLongitude: 0, rows: 80, columns: 120 }
    const heights = new Float64Array(grid.rows * grid.columns)
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.columns; c++) {
        const lat = (grid.lineOffset - r) / PPD
        const lon = grid.centerLongitude + (c - grid.sampleOffset) / PPD
        heights[r * grid.columns + c] = A * lat + B * lon + C
      }
    }
    return { ...grid, heights }
  }

  it('a interpolação cai exatamente no plano de latitude e longitude', () => {
    const relief = cylindricalGridRelief(cylindricalPlane())
    for (const [lat, lon] of [[0, 10], [-3.3, 7.7], [8.1, 30.2], [-9.5, 5.6]]) {
      const altura = relief.sample(...latLonToUnit(lat, lon))
      expect(Math.abs(altura - (A * lat + B * lon + C)), `${lat}, ${lon}`).toBeLessThan(1e-6)
    }
  })

  it('fora da grade não tem valor', () => {
    const relief = cylindricalGridRelief(cylindricalPlane())
    expect(relief.sample(...latLonToUnit(30, 10))).toBeNaN()
    expect(relief.sample(...latLonToUnit(0, 100))).toBeNaN()
  })

  it('na grade da Lua inteira, a longitude dá a volta em 0°/360°', () => {
    const columns = 360 * PPD
    const heights = new Float64Array(2 * columns)
    for (let r = 0; r < 2; r++) for (let c = 0; c < columns; c++) heights[r * columns + c] = c
    const relief = cylindricalGridRelief({
      heights, pixelsPerDegree: PPD, lineOffset: 0.5, sampleOffset: 0, centerLongitude: 0,
      rows: 2, columns, wrap: true,
    })
    const em = (lon) => relief.sample(...latLonToUnit(0, lon))
    expect(em(-0.1)).toBeCloseTo(em(359.9), 9)
    // entre a última coluna (valor 1439) e a primeira (valor 0): mistura das duas, sem NaN
    const meio = em(359.875)
    expect(meio).toBeGreaterThan(0)
    expect(meio).toBeLessThan(columns - 1)
  })
})

describe('relevo polar em ladrilhos (o relevo fino do site, card E2)', () => {
  /* 3 × 3 ladrilhos de 800 m, com pixel de 80 m: 10 pixels de miolo e 1 de borda de cada lado,
     a borda repetindo o vizinho, como o script de preparação grava. Um plano inclinado de novo:
     se a conta esquecer a borda, trocar linha com coluna ou errar o ladrilho na emenda, o valor
     sai do plano (A·80 m já são quase 30 m). */
  const GRID = { tileM: 800, resolutionM: 80, marginPx: 1, tilePx: 12, originX: -1200, originY: 1200, tileColumns: 3, tileRows: 3 }

  function tiledPlane() {
    const { tileM, resolutionM, marginPx, tilePx, originX, originY, tileColumns, tileRows } = GRID
    const tiles = []
    for (let tr = 0; tr < tileRows; tr++) {
      for (let tc = 0; tc < tileColumns; tc++) {
        const left = originX + tc * tileM - marginPx * resolutionM
        const top = originY - tr * tileM + marginPx * resolutionM
        const heights = new Float64Array(tilePx * tilePx)
        for (let r = 0; r < tilePx; r++) {
          for (let c = 0; c < tilePx; c++) {
            heights[r * tilePx + c] = A * (left + (c + 0.5) * resolutionM) + B * (top - (r + 0.5) * resolutionM) + C
          }
        }
        tiles.push(heights)
      }
    }
    return { ...GRID, tiles }
  }

  it('a interpolação cai exatamente no plano, inclusive na emenda e no canto de quatro ladrilhos', () => {
    const relief = tiledPolarRelief(tiledPlane())
    // −400 e 400 são as emendas entre ladrilhos, nos dois eixos
    for (const [x, y] of [[-1100, 1100], [-400, 0], [-400.01, 0], [-399.99, 123.4], [400, 400], [399.9, 400.1], [0, -400], [1150, -1150]]) {
      expect(Math.abs(sampleXY(relief, x, y) - (A * x + B * y + C)), `${x}, ${y}`).toBeLessThan(1e-6)
    }
  })

  it('ladrilho que não foi carregado deixa o ponto sem valor, e o vizinho continua valendo', () => {
    const plano = tiledPlane()
    plano.tiles[1 * GRID.tileColumns + 1] = undefined // o do meio
    const relief = tiledPolarRelief(plano)
    expect(sampleXY(relief, 0, 0)).toBeNaN()
    expect(Math.abs(sampleXY(relief, -500, 0) - (A * -500 + C))).toBeLessThan(1e-6)
  })

  it('fora da grade de ladrilhos não tem valor', () => {
    const relief = tiledPolarRelief(tiledPlane())
    expect(sampleXY(relief, 1300, 0)).toBeNaN()
    expect(sampleXY(relief, 0, 1250)).toBeNaN()
    expect(sampleXY(relief, -1250, -1250)).toBeNaN()
    expect(sampleXY(relief, 1199, -1199)).not.toBeNaN()
  })

  it('aplica a escala: altura guardada em meio metro volta em metros', () => {
    const tiles = Array.from({ length: 9 }, () => new Int16Array(GRID.tilePx * GRID.tilePx).fill(100))
    const relief = tiledPolarRelief({ ...GRID, tiles, scale: 0.5 })
    expect(sampleXY(relief, 123, -456)).toBe(50)
  })
})

import { describe, expect, it } from 'vitest'

import { latLonToUnit, polarXYToUnit } from './geometry.js'
import { cylindricalGridRelief, polarGridRelief } from './relief.js'

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

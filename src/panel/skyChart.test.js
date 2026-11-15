// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { bodySegments, chartPosition, elevationRange, horizonAreaPath, hourOfDate, visibleRuns, windowRuns } from './skyChart.js'

const hora = (azimuthDeg, elevationDeg, visible) => ({ azimuthDeg, elevationDeg, visible })

describe('trechos seguidos com o astro à vista (visibleRuns)', () => {
  it('junta as horas seguidas, e o trecho vai até o começo da hora seguinte', () => {
    const horas = [true, true, false, false, true, false, true, true, true].map((v) => hora(0, 0, v))
    expect(visibleRuns(horas)).toEqual([{ start: 0, end: 2 }, { start: 4, end: 5 }, { start: 6, end: 9 }])
  })

  it('sempre escondido não dá trecho nenhum; sempre à vista dá um só', () => {
    expect(visibleRuns([hora(0, 0, false), hora(0, 0, false)])).toEqual([])
    expect(visibleRuns([hora(0, 0, true), hora(0, 0, true)])).toEqual([{ start: 0, end: 2 }])
  })
})

describe('as janelas de pouso em horas do período (windowRuns)', () => {
  it('conta as horas a partir do começo do período, com a fração', () => {
    const period = { startUtc: new Date('2026-11-14T00:00:00Z'), endUtc: new Date('2026-12-13T23:00:00Z') }
    const janelas = [{ startUtc: new Date('2026-11-14T06:30:00Z'), endUtc: new Date('2026-11-16T00:00:00Z') }]
    expect(windowRuns(janelas, period)).toEqual([{ start: 6.5, end: 48 }])
  })
})

describe('a hora do período em que uma data cai (hourOfDate)', () => {
  const period = { startUtc: new Date('2026-11-14T00:00:00Z') }
  it('arredonda para a hora calculada mais perto e não sai do período', () => {
    expect(hourOfDate(new Date('2026-11-14T05:20:00Z'), period, 720)).toBe(5)
    expect(hourOfDate(new Date('2026-11-13T00:00:00Z'), period, 720)).toBe(0)
    expect(hourOfDate(new Date('2027-03-01T00:00:00Z'), period, 720)).toBe(719)
  })
})

describe('a escala de altura do gráfico (elevationRange)', () => {
  it('cobre o relevo, o Sol e a Terra, com folga, em graus inteiros', () => {
    const range = elevationRange({
      horizonDeg: [-2.4, 15.3, 3],
      sun: [hora(0, -3.3, false), hora(0, 3.3, true)],
      earth: [hora(0, -6.6, false), hora(0, 7.5, true)],
    })
    expect(range).toEqual({ min: -8, max: 17 })
  })

  it('num ponto plano, ainda abre uma faixa que dá para ler', () => {
    const range = elevationRange({ horizonDeg: [0, 0.1], sun: [hora(0, 0.2, true)], earth: [hora(0, 0.5, true)] })
    expect(range.max - range.min).toBeGreaterThanOrEqual(6)
    expect(range.min).toBeLessThan(0)
  })

  it('sem o contorno do relevo, usa só o Sol e a Terra', () => {
    expect(elevationRange({ horizonDeg: [], sun: [hora(0, 40, true)], earth: [hora(0, 10, true)] })).toEqual({ min: -2, max: 41 })
  })
})

describe('onde um ponto do céu cai no gráfico (chartPosition)', () => {
  it('o azimute vai da esquerda (0°) à direita (360°), e a altura maior fica em cima', () => {
    const range = { min: -5, max: 15 }
    expect(chartPosition(0, 15, range)).toEqual({ x: 0, y: 0 })
    expect(chartPosition(180, 5, range)).toEqual({ x: 0.5, y: 0.5 })
    expect(chartPosition(360, -5, range)).toEqual({ x: 1, y: 1 })
  })
})

describe('o contorno do relevo como área (horizonAreaPath)', () => {
  it('passa por cada grau, fecha a volta em 360° com a altura de 0° e desce até a base', () => {
    const horizonDeg = Array.from({ length: 360 }, (_, a) => (a === 90 ? 10 : 0))
    const d = horizonAreaPath(horizonDeg, { min: -10, max: 10 }, 360, 100)
    expect(d.startsWith('M0,100 L0,50')).toBe(true)
    expect(d).toContain('L90,0')
    expect(d.endsWith('L360,50 L360,100 Z')).toBe(true)
  })

  it('sem contorno, não desenha nada', () => {
    expect(horizonAreaPath([], { min: -10, max: 10 }, 360, 100)).toBe('')
  })
})

describe('o caminho de um astro em pedaços (bodySegments)', () => {
  it('troca de pedaço quando o astro some ou aparece, e os dois pedaços se encostam', () => {
    const pedacos = bodySegments([hora(10, 1, true), hora(20, 1, true), hora(30, 1, false), hora(40, 1, false)])
    expect(pedacos).toEqual([
      { visible: true, points: [[10, 1], [20, 1], [30, 1]] },
      { visible: false, points: [[30, 1], [40, 1]] },
    ])
  })

  it('quando o astro dá a volta em 360°, o pedaço para na borda e continua do outro lado', () => {
    const pedacos = bodySegments([hora(350, 2, true), hora(355, 2, true), hora(5, 2, true), hora(10, 2, true)])
    expect(pedacos).toEqual([
      { visible: true, points: [[350, 2], [355, 2]] },
      { visible: true, points: [[5, 2], [10, 2]] },
    ])
  })
})

import { describe, expect, it } from 'vitest'

import { summarizeSky } from './summary.js'

/* Série montada à mão, dez horas a partir de 14/11/2026, 03:00 UTC:
   o Sol está à vista nas horas 0 a 2, some entre a 2 e a 3 (o pôr), fica inteiro escondido nas
   horas 4 a 6 e volta na 7. A Terra fica à vista o tempo todo. */
const INICIO = Date.UTC(2026, 10, 14, 3)
const SERIE = {
  startMs: INICIO,
  count: 10,
  stepHours: 1,
  sunElevationDeg: Float32Array.from([1.5, 1.2, 0.9, 0.6, 0.3, 0, -0.3, 0.4, 0.8, 1.1]),
  sunFraction: Float32Array.from([1, 1, 0.8, 0.2, 0, 0, 0, 0.6, 1, 1]),
  earthElevationDeg: Float32Array.from([2, 2, 2, 2, 2, 2, 2, 2, 2, 2]),
  earthMarginDeg: Float32Array.from([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
}

describe('resultado no formato que a tela espera (docs/backlog.md, "O que a ponte entrega")', () => {
  it('tem exatamente os campos combinados', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    expect(Object.keys(sky).sort()).toEqual(
      ['earthNow', 'landingWindows', 'longestDarkHours', 'nextSunsetUtc', 'sunFraction', 'sunNow'],
    )
    expect(Object.keys(sky.sunNow).sort()).toEqual(['elevationDeg', 'visible'])
    expect(Object.keys(sky.earthNow).sort()).toEqual(['elevationDeg', 'visible'])
  })

  it('o agora é o primeiro instante da série', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    expect(sky.sunNow).toEqual({ elevationDeg: 1.5, visible: true })
    expect(sky.earthNow).toEqual({ elevationDeg: 2, visible: true })
  })

  it('o pôr do Sol vira data e hora em UTC', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    expect(sky.nextSunsetUtc.toISOString()).toBe('2026-11-14T05:30:00.000Z')
  })

  it('média do Sol à vista e maior escuridão no período', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    expect(sky.sunFraction).toBeCloseTo(0.56, 6)
    expect(sky.longestDarkHours).toBe(3)
  })

  it('janelas de pouso viram início e fim em UTC, só as que duram o mínimo pedido', () => {
    const janelas = (minWindowHours) => summarizeSky(SERIE, { minWindowHours }).landingWindows
      .map((j) => [j.startUtc.toISOString(), j.endUtc.toISOString()])
    expect(janelas(2)).toEqual([
      ['2026-11-14T03:00:00.000Z', '2026-11-14T06:00:00.000Z'],
      ['2026-11-14T10:00:00.000Z', '2026-11-14T13:00:00.000Z'],
    ])
    expect(janelas(4)).toEqual([])
  })

  it('Sol que não se põe no período: nextSunsetUtc é null, e a escuridão é zero', () => {
    const sempreSol = { ...SERIE, sunFraction: new Float32Array(10).fill(1) }
    const sky = summarizeSky(sempreSol, { minWindowHours: 2 })
    expect(sky.nextSunsetUtc).toBeNull()
    expect(sky.longestDarkHours).toBe(0)
  })
})

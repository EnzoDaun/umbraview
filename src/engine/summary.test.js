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

  it('janelas de pouso viram início e fim em UTC, com o corte nas pontas do período marcado', () => {
    // a série é de hora em hora, e o cruzamento no meio dela não tem precisão de milissegundo:
    // a comparação é até o minuto
    const minuto = (d) => new Date(Math.round(d.getTime() / 60000) * 60000).toISOString()
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    expect(sky.landingWindows.map((j) => ({ ...j, startUtc: minuto(j.startUtc), endUtc: minuto(j.endUtc) }))).toEqual([
      // já aberta no primeiro instante; fecha no pôr do Sol
      { startUtc: '2026-11-14T03:00:00.000Z', endUtc: '2026-11-14T05:30:00.000Z', startsBeforePeriod: true, endsAfterPeriod: false },
      // o Sol passa da metade do disco entre as horas 6 (0) e 7 (0,6); continua depois do último instante
      { startUtc: '2026-11-14T09:50:00.000Z', endUtc: '2026-11-14T12:00:00.000Z', startsBeforePeriod: false, endsAfterPeriod: true },
    ])
  })

  it('nenhuma janela de pouso passa do pôr do Sol', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    const antesDoPor = sky.landingWindows.filter((j) => j.startUtc < sky.nextSunsetUtc)
    expect(antesDoPor).toHaveLength(1)
    expect(antesDoPor[0].endUtc.getTime()).toBeLessThanOrEqual(sky.nextSunsetUtc.getTime())
  })

  it('janela inteira dentro do período só entra se durar o mínimo pedido', () => {
    // o Sol passa da metade do disco entre as horas 1 e 2 e volta a ficar abaixo entre a 5 e a 6:
    // de 1,83 h a 5,17 h, 3 h e pouco, inteira dentro das dez horas
    const dentro = { ...SERIE, sunFraction: Float32Array.from([0, 0, 0.6, 1, 1, 0.6, 0, 0, 0, 0]) }
    expect(summarizeSky(dentro, { minWindowHours: 4 }).landingWindows).toEqual([])
    expect(summarizeSky(dentro, { minWindowHours: 3 }).landingWindows).toHaveLength(1)
  })

  it('Sol que não se põe no período: nextSunsetUtc é null, e a escuridão é zero', () => {
    const sempreSol = { ...SERIE, sunFraction: new Float32Array(10).fill(1) }
    const sky = summarizeSky(sempreSol, { minWindowHours: 2 })
    expect(sky.nextSunsetUtc).toBeNull()
    expect(sky.longestDarkHours).toBe(0)
  })
})

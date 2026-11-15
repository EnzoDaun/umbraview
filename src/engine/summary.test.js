// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { TERRAIN_GRAZE_DEG } from './config.js'
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
  // o computeSeries entrega também as direções e o relevo nelas; aqui, neutros (C2)
  sunAzimuthDeg: new Float32Array(10),
  sunHorizonDeg: new Float32Array(10),
  earthAzimuthDeg: new Float32Array(10),
  earthHorizonDeg: new Float32Array(10),
}

describe('resultado no formato que a tela espera (docs/backlog.md, "O que a ponte entrega")', () => {
  it('tem exatamente os campos combinados', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    expect(Object.keys(sky).sort()).toEqual(
      ['earthFraction', 'earthNow', 'groundView', 'landingWindows', 'longestDarkHours', 'nextEarthriseUtc',
        'nextEarthsetUtc', 'nextSunriseUtc', 'nextSunsetUtc', 'notes', 'period', 'sunFraction', 'sunNow'],
    )
    expect(Object.keys(sky.sunNow).sort()).toEqual(['elevationDeg', 'visible'])
    expect(Object.keys(sky.earthNow).sort()).toEqual(['elevationDeg', 'visible'])
  })

  it('o período vai do primeiro ao último instante calculado, onde termina a janela que continua', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    // dez instantes de hora em hora: o último é a hora 9, e não a 10
    expect(sky.period).toEqual({
      startUtc: new Date('2026-11-14T03:00:00Z'),
      endUtc: new Date('2026-11-14T12:00:00Z'),
    })
    const continues = sky.landingWindows.find((j) => j.endsAfterPeriod)
    expect(continues.endUtc).toEqual(sky.period.endUtc)
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
      { startUtc: '2026-11-14T03:00:00.000Z', endUtc: '2026-11-14T05:30:00.000Z', durationHours: expect.any(Number), startsBeforePeriod: true, endsAfterPeriod: false },
      // o Sol passa da metade do disco entre as horas 6 (0) e 7 (0,6); continua depois do último instante
      { startUtc: '2026-11-14T09:50:00.000Z', endUtc: '2026-11-14T12:00:00.000Z', durationHours: expect.any(Number), startsBeforePeriod: false, endsAfterPeriod: true },
    ])
  })

  it('a duração de cada janela é exatamente o fim menos o começo, e na cortada só a parte dentro do período', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    // a mesma série do teste do mínimo: uma janela de 3 h e pouco, inteira dentro das dez horas
    const inteira = summarizeSky({ ...SERIE, sunFraction: Float32Array.from([0, 0, 0.6, 1, 1, 0.6, 0, 0, 0, 0]) }, { minWindowHours: 3 })
    const janelas = [...sky.landingWindows, ...inteira.landingWindows]
    expect(janelas).toHaveLength(3)
    // conta a partir dos próprios Date: o Date corta a fração de milissegundo, e a conta pelas horas
    // da série discordaria do startUtc e do endUtc que a tela mostra
    for (const j of janelas) expect(j.durationHours).toBe((j.endUtc - j.startUtc) / 3600e3)
    // cortada no começo: das 03:00, o começo do período, até o pôr das 05:30
    expect(sky.landingWindows[0].durationHours).toBe(2.5)
    expect(inteira.landingWindows[0].durationHours).toBeCloseTo(3.33, 2)
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

/* Para os campos da Terra e da volta do Sol (card E18), as mesmas dez horas com outro céu.
   Na TERRA_SOME, a Terra está à vista nas horas 0 a 3, some entre a 3 (0,5) e a 4 (−0,5), uma hora
   depois do pôr do Sol da SERIE, fica escondida até a 6 e volta na 7. Na TERRA_VOLTA, ela começa escondida e volta entre a 1 (−0,5) e a
   2 (0,5). Na NOITE, o Sol começa escondido e passa da metade do disco entre a 2 (0,25) e a 3
   (0,75). */
const comCeu = (mudancas) => ({ ...SERIE, ...mudancas })
const TERRA_SOME = comCeu({ earthMarginDeg: Float32Array.from([1, 1, 1, 0.5, -0.5, -1, -0.2, 0.6, 1, 1]) })
const TERRA_VOLTA = comCeu({ earthMarginDeg: Float32Array.from([-1, -0.5, 0.5, 1, 1, 1, 1, 1, 1, 1]) })
const NOITE = comCeu({ sunFraction: Float32Array.from([0, 0, 0.25, 0.75, 1, 1, 1, 1, 1, 1]) })
const SEMPRE_ESCURO = comCeu({ sunFraction: new Float32Array(10) })
const TERRA_SEMPRE_ESCONDIDA = comCeu({ earthMarginDeg: new Float32Array(10).fill(-1) })

describe('a Terra e a volta do Sol no resumo (card E18)', () => {
  it('earthFraction: a parte das horas do período com alguma parte da Terra à vista', () => {
    expect(summarizeSky(TERRA_SOME, { minWindowHours: 2 }).earthFraction).toBeCloseTo(0.7, 12)
    expect(summarizeSky(SERIE, { minWindowHours: 2 }).earthFraction).toBe(1)
    expect(summarizeSky(TERRA_SEMPRE_ESCONDIDA, { minWindowHours: 2 }).earthFraction).toBe(0)
  })

  it('nextEarthsetUtc: quando a última parte da Terra some, entre duas horas', () => {
    expect(summarizeSky(TERRA_SOME, { minWindowHours: 2 }).nextEarthsetUtc).toEqual(new Date('2026-11-14T06:30:00Z'))
  })

  it('nextEarthsetUtc é null quando a Terra não se põe no período, à vista ou escondida o tempo todo', () => {
    expect(summarizeSky(SERIE, { minWindowHours: 2 }).nextEarthsetUtc).toBeNull()
    expect(summarizeSky(TERRA_SEMPRE_ESCONDIDA, { minWindowHours: 2 }).nextEarthsetUtc).toBeNull()
  })

  it('nextSunriseUtc: com o Sol escondido agora, quando metade do disco volta', () => {
    expect(summarizeSky(NOITE, { minWindowHours: 2 }).nextSunriseUtc).toEqual(new Date('2026-11-14T05:30:00Z'))
  })

  it('nextSunriseUtc é null com o Sol à vista agora (e não o pôr), e com o Sol escondido o período todo', () => {
    expect(summarizeSky(SERIE, { minWindowHours: 2 }).nextSunriseUtc).toBeNull()
    expect(summarizeSky(SEMPRE_ESCURO, { minWindowHours: 2 }).nextSunriseUtc).toBeNull()
  })

  it('nextEarthriseUtc: com a Terra escondida agora, quando a primeira parte dela volta', () => {
    expect(summarizeSky(TERRA_VOLTA, { minWindowHours: 2 }).nextEarthriseUtc).toEqual(new Date('2026-11-14T04:30:00Z'))
  })

  it('nextEarthriseUtc é null com a Terra à vista agora (e não o pôr), e com a Terra escondida o período todo', () => {
    expect(summarizeSky(TERRA_SOME, { minWindowHours: 2 }).nextEarthriseUtc).toBeNull()
    expect(summarizeSky(TERRA_SEMPRE_ESCONDIDA, { minWindowHours: 2 }).nextEarthriseUtc).toBeNull()
  })
})

/* C2: a vista do horizonte (groundView) e as notas automáticas embaixo dela. A série é a SERIE de
   cima com os azimutes e a altura do relevo na direção de cada astro. */
const HORIZONTE = { elevationsRad: Float32Array.from({ length: 360 }, (_, a) => ((a % 7) * Math.PI) / 180), directions: 360 }
const COM_DIRECOES = comCeu({
  sunAzimuthDeg: Float32Array.from({ length: 10 }, (_, i) => 100 + i),
  sunHorizonDeg: Float32Array.from([1.3, 1.0, 0.8, 0.7, 0.5, 0.4, 0.2, 0.3, 0.5, 1.0]),
  earthAzimuthDeg: new Float32Array(10).fill(2),
  earthElevationDeg: Float32Array.from([3, 3, 3, 3, -1, -1, 2, 2, 2, 2]),
  earthMarginDeg: Float32Array.from([1, 1, 1, 0.5, -0.5, -1, -0.2, 0.6, 1, 1]),
})

describe('a vista do horizonte no resumo (C2)', () => {
  const sky = summarizeSky(COM_DIRECOES, { minWindowHours: 2, horizon: HORIZONTE })

  it('horizonDeg: a altura do relevo em cada grau de azimute, igual ao computeHorizon', () => {
    expect(sky.groundView.horizonDeg).toHaveLength(360)
    for (let a = 0; a < 360; a++) expect(sky.groundView.horizonDeg[a]).toBeCloseTo((HORIZONTE.elevationsRad[a] * 180) / Math.PI, 5)
  })

  it('um ponto do Sol e um da Terra por hora, com o azimute e a elevação da série', () => {
    expect(sky.groundView.sun).toHaveLength(10)
    expect(sky.groundView.earth).toHaveLength(10)
    expect(sky.groundView.sun[3]).toEqual({ azimuthDeg: 103, elevationDeg: expect.closeTo(0.6, 5), visible: false })
    expect(sky.groundView.earth[0]).toEqual({ azimuthDeg: 2, elevationDeg: 3, visible: true })
  })

  it('o visible de cada hora segue as regras do painel: metade do Sol, alguma parte da Terra', () => {
    sky.groundView.sun.forEach((p, i) => expect(p.visible).toBe(COM_DIRECOES.sunFraction[i] >= 0.5))
    sky.groundView.earth.forEach((p, i) => expect(p.visible).toBe(COM_DIRECOES.earthMarginDeg[i] > 0))
  })
})

describe('as notas embaixo da vista do horizonte (C2, decididas pelo motor)', () => {
  const sky = summarizeSky(COM_DIRECOES, { minWindowHours: 2, horizon: HORIZONTE })

  it('conta as horas em que a Terra está acima do horizonte plano, mas o relevo esconde', () => {
    // horas 4 e 5: abaixo do plano, não conta; hora 6: acima do plano (2°) e escondida (−0,2)
    expect(sky.notes.earthHiddenByTerrainHours).toBe(1)
  })

  it(`conta as horas em que o Sol à vista passa a menos de ${TERRAIN_GRAZE_DEG}° do relevo`, () => {
    // Sol − relevo: 0,2 0,2 0,1 −0,1 −0,2 −0,4 −0,5 0,1 0,3 0,1; com alguma parte à vista (fração > 0)
    // e a menos de 0,5° acima do relevo: horas 0, 1, 2, 3, 7, 8 e 9
    expect(sky.notes.sunNearTerrainHours).toBe(7)
  })

  it('diz quando a Terra não sobe acima do horizonte plano no período inteiro', () => {
    expect(sky.notes.earthNeverAboveHorizon).toBe(false)
    const ladoOculto = comCeu({ ...COM_DIRECOES, earthElevationDeg: new Float32Array(10).fill(-5), earthMarginDeg: new Float32Array(10).fill(-6) })
    expect(summarizeSky(ladoOculto, { minWindowHours: 2, horizon: HORIZONTE }).notes.earthNeverAboveHorizon).toBe(true)
  })
})

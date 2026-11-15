// @vitest-environment node
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
  sunAzimuthDeg: Float32Array.from([10, 22, 34, 46, 58, 70, 82, 94, 106, 118]),
  sunFraction: Float32Array.from([1, 1, 0.8, 0.2, 0, 0, 0, 0.6, 1, 1]),
  earthElevationDeg: Float32Array.from([2, 2, 2, 2, 2, 2, 2, 2, 2, 2]),
  earthAzimuthDeg: Float32Array.from([60, 60.5, 61, 61.5, 62, 62.5, 63, 63.5, 64, 64.5]),
  earthMarginDeg: Float32Array.from([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
  earthHorizonDeg: Float32Array.from([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
}

describe('resultado no formato que a tela espera (docs/backlog.md, "O que a ponte entrega")', () => {
  it('tem exatamente os campos combinados', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    expect(Object.keys(sky).sort()).toEqual(
      ['earthBelowHorizonFraction', 'earthFraction', 'earthNow', 'groundView', 'landingWindows', 'longestDarkHours', 'nextEarthriseUtc', 'nextEarthsetUtc',
        'nextSunriseUtc', 'nextSunsetUtc', 'period', 'sunFraction', 'sunNow'],
    )
    expect(Object.keys(sky.sunNow).sort()).toEqual(['belowHorizon', 'elevationDeg', 'visible'])
    expect(Object.keys(sky.earthNow).sort()).toEqual(['belowHorizon', 'elevationDeg', 'visible'])
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
    expect(sky.sunNow).toEqual({ elevationDeg: 1.5, visible: true, belowHorizon: false })
    expect(sky.earthNow).toEqual({ elevationDeg: 2, visible: true, belowHorizon: false })
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

describe('a vista do chão: o horizonte do ponto e o caminho do Sol e da Terra por cima dele', () => {
  const GRAU = Math.PI / 180
  // um horizonte de 360 direções, com um morro de 5° em volta do azimute 60°
  const horizonte = {
    directions: 360,
    elevationsRad: Float32Array.from({ length: 360 }, (_, a) => (Math.abs(a - 60) <= 3 ? 5 : 1) * GRAU),
  }

  it('o horizonte sai em graus, um número por grau de azimute, igual ao que o computeHorizon deu', () => {
    const { groundView } = summarizeSky(SERIE, { minWindowHours: 2, horizon: horizonte })
    expect(groundView.horizonDeg).toHaveLength(360)
    expect(groundView.horizonDeg[60]).toBeCloseTo(5, 5)
    expect(groundView.horizonDeg[0]).toBeCloseTo(1, 5)
    expect(groundView.horizonDeg[359]).toBeCloseTo(1, 5)
  })

  it('com um horizonte de mais direções, continua um número por grau', () => {
    const fino = { directions: 720, elevationsRad: Float32Array.from({ length: 720 }, (_, a) => (a / 2) * 0.01 * GRAU) }
    const { groundView } = summarizeSky(SERIE, { minWindowHours: 2, horizon: fino })
    expect(groundView.horizonDeg).toHaveLength(360)
    expect(groundView.horizonDeg[90]).toBeCloseTo(0.9, 5)
  })

  it('tem o Sol e a Terra hora a hora, com o azimute e a altura da série', () => {
    const { groundView } = summarizeSky(SERIE, { minWindowHours: 2, horizon: horizonte })
    expect(groundView.sun).toHaveLength(SERIE.count)
    expect(groundView.earth).toHaveLength(SERIE.count)
    expect(groundView.sun[3]).toEqual({ azimuthDeg: 46, elevationDeg: SERIE.sunElevationDeg[3], visible: false })
    expect(groundView.earth[9]).toEqual({ azimuthDeg: 64.5, elevationDeg: 2, visible: true })
  })

  it('o "à vista" de cada hora segue a regra do painel: metade do Sol, qualquer parte da Terra', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2, horizon: horizonte })
    const { sun, earth } = sky.groundView
    expect(sun.map((hora) => hora.visible)).toEqual(Array.from(SERIE.sunFraction, (f) => f >= 0.5))
    expect(earth.map((hora) => hora.visible)).toEqual(Array.from(SERIE.earthMarginDeg, (m) => m > 0))
    // o resumo e o gráfico não podem discordar: a parte das horas com a Terra à vista é a mesma
    expect(earth.filter((hora) => hora.visible).length / earth.length).toBe(sky.earthFraction)
    expect(sun[0].visible).toBe(sky.sunNow.visible)
  })

  it('sem o horizonte, o gráfico fica sem o contorno, e o resto do resumo não muda', () => {
    const sky = summarizeSky(SERIE, { minWindowHours: 2 })
    expect(sky.groundView.horizonDeg).toEqual([])
    expect(sky.groundView.sun).toHaveLength(SERIE.count)
  })
})

describe('abaixo do horizonte não é o mesmo que escondido pelo relevo', () => {
  it('o Sol 10° abaixo do plano do horizonte está abaixo do horizonte; a 0,5° atrás de um morro, não', () => {
    const noite = { ...SERIE, sunElevationDeg: Float32Array.from([-10, 1.2, 0.9, 0.6, 0.3, 0, -0.3, 0.4, 0.8, 1.1]), sunFraction: Float32Array.from([0, 1, 0.8, 0.2, 0, 0, 0, 0.6, 1, 1]) }
    expect(summarizeSky(noite, { minWindowHours: 2 }).sunNow).toEqual({ elevationDeg: -10, visible: false, belowHorizon: true })
    const morro = { ...SERIE, sunElevationDeg: Float32Array.from([0.5, 1.2, 0.9, 0.6, 0.3, 0, -0.3, 0.4, 0.8, 1.1]), sunFraction: Float32Array.from([0, 1, 0.8, 0.2, 0, 0, 0, 0.6, 1, 1]) }
    expect(summarizeSky(morro, { minWindowHours: 2 }).sunNow.belowHorizon).toBe(false)
  })

  it('a Terra inteira abaixo do plano do horizonte conta como abaixo, e a parte das horas assim sai no resumo', () => {
    // a borda de cima da Terra é a margem mais o relevo: −3 + 1 = −2° nas cinco primeiras horas
    const libracao = { ...SERIE, earthMarginDeg: Float32Array.from([-3, -3, -3, -3, -3, 1, 1, 1, 1, 1]) }
    const sky = summarizeSky(libracao, { minWindowHours: 2 })
    expect(sky.earthNow.belowHorizon).toBe(true)
    expect(sky.earthBelowHorizonFraction).toBe(0.5)
    // atrás de um morro de 1°, com a borda de cima a 0,5°: escondida, mas acima do horizonte
    const morro = { ...SERIE, earthMarginDeg: Float32Array.from([-0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1]) }
    const comMorro = summarizeSky(morro, { minWindowHours: 2 })
    expect(comMorro.earthNow).toEqual({ elevationDeg: 2, visible: false, belowHorizon: false })
    expect(comMorro.earthBelowHorizonFraction).toBe(0)
  })
})

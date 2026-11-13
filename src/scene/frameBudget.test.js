/* O medidor que decide se a máquina aguenta o relevo fino (card C6). Ele recebe a hora de cada
 * quadro desenhado e devolve 'on' ou 'off' quando decide; os testes dão as horas na mão. Ele só
 * mede os quadros que ele mesmo pediu (wantsFrame): a cena obedece e pede o quadro seguinte. */
import { describe, expect, it } from 'vitest'

import { FRAME_LIMIT_MS, FRAME_SAMPLES, MAX_GAP_MS, RECHECK_SKIP, WARMUP_MS, createFrameBudget } from './frameBudget.js'

/* Empurra quadros com os intervalos dados (um número repete `count` vezes), a partir de `startMs`.
   Devolve as decisões que saíram e a hora do último quadro. afterEach(i) roda depois do quadro i,
   como o resto do useFrame, que vem depois do push. */
function pushFrames(budget, { count, intervalMs, startMs = 0, intervals, afterEach }) {
  const steps = intervals ?? Array.from({ length: count }, () => intervalMs)
  const decisions = []
  let now = startMs
  steps.forEach((step, i) => {
    if (i > 0) now += step
    const decision = budget.push(now)
    if (decision) decisions.push(decision)
    afterEach?.(i)
  })
  return { decisions, lastMs: now }
}

// liga o medidor com quadros rápidos e devolve a hora do último quadro
function switchedOn(budget, intervalMs = 6.9) {
  const { decisions, lastMs } = pushFrames(budget, { count: FRAME_SAMPLES + 1, intervalMs })
  expect(decisions).toEqual(['on'])
  return lastMs
}

describe('createFrameBudget, a primeira decisão', () => {
  it('liga quando os quadros seguidos ficam abaixo do limite: o notebook do Marco, a 144 Hz', () => {
    const budget = createFrameBudget({ warmupMs: 0 })
    const { decisions } = pushFrames(budget, { count: FRAME_SAMPLES + 1, intervalMs: 6.9 })
    expect(decisions).toEqual(['on'])
    expect(budget.state).toBe('on')
    expect(budget.averageMs).toBeCloseTo(6.9, 6)
  })

  it('o começo não conta: a cena ainda está montando o relevo, e os primeiros quadros saem lentos', () => {
    // sem isto, um notebook rápido podia decidir "não aguenta" no primeiro segundo, para sempre
    const budget = createFrameBudget()
    const slowStart = pushFrames(budget, { count: Math.floor(WARMUP_MS / 50), intervalMs: 50 })
    const { decisions } = pushFrames(budget, { count: FRAME_SAMPLES + 1, intervalMs: 6.9, startMs: slowStart.lastMs + 50 })
    expect([...slowStart.decisions, ...decisions]).toEqual(['on'])
  })

  it('não decide antes de juntar as amostras', () => {
    const budget = createFrameBudget({ warmupMs: 0 })
    const { decisions } = pushFrames(budget, { count: FRAME_SAMPLES, intervalMs: 6.9 })
    expect(decisions).toEqual([])
    expect(budget.state).toBe('measuring')
  })

  it('não liga quando os quadros passam do limite: o notebook do Miguel com a Lua girando', () => {
    // medido no C4: 55,2 fps com a Lua girando, ou 18,1 ms por quadro
    const budget = createFrameBudget({ warmupMs: 0 })
    const { decisions } = pushFrames(budget, { count: FRAME_SAMPLES + 1, intervalMs: 18.1 })
    expect(decisions).toEqual(['off'])
  })

  it('numa tela de 60 Hz que perde um quadro em 60, liga; sem a folga, desligaria', () => {
    // 59 quadros a 16,67 ms e um que perdeu a vez da tela (33,3 ms): média de 16,94 ms
    const intervals = [0, ...Array.from({ length: FRAME_SAMPLES }, (_, i) => (i === 30 ? 2000 / 60 : 1000 / 60))]
    const withMargin = pushFrames(createFrameBudget({ warmupMs: 0 }), { intervals })
    const withoutMargin = pushFrames(createFrameBudget({ warmupMs: 0, limitMs: 16.7 }), { intervals })
    expect(withMargin.decisions).toEqual(['on'])
    expect(withoutMargin.decisions).toEqual(['off'])
    expect(FRAME_LIMIT_MS).toBeGreaterThan(16.7)
  })

  it('com quadros soltos, a mais de 100 ms um do outro, não decide nada', () => {
    // o navegador escondido, por exemplo: os quadros soltos pareceriam uma máquina lenta
    const budget = createFrameBudget({ warmupMs: 0 })
    const { decisions } = pushFrames(budget, { count: 200, intervalMs: MAX_GAP_MS + 1 })
    expect(decisions).toEqual([])
    expect(budget.state).toBe('measuring')
  })

  it('o intervalo entre duas rodadas de quadros seguidos não conta, mas as rodadas somam', () => {
    const budget = createFrameBudget({ warmupMs: 0 })
    const half = Math.ceil(FRAME_SAMPLES / 2) + 1
    const first = pushFrames(budget, { count: half, intervalMs: 6.9 })
    const second = pushFrames(budget, { count: half, intervalMs: 6.9, startMs: first.lastMs + 5000 })
    expect([...first.decisions, ...second.decisions]).toEqual(['on'])
  })
})

describe('createFrameBudget, em degraus', () => {
  // dois degraus, como no NearRelief: 2 = o centro e o anel do relevo fino, 1 = só o centro
  const stepped = () => createFrameBudget({ warmupMs: 0, levels: 2 })

  it('sem degraus, é liga e desliga: ligado é o degrau 1', () => {
    const budget = createFrameBudget({ warmupMs: 0 })
    switchedOn(budget)
    expect(budget.level).toBe(1)
  })

  it('liga no degrau de cima, e antes de decidir não tem degrau', () => {
    const budget = stepped()
    expect(budget.level).toBe(0)
    switchedOn(budget)
    expect(budget.level).toBe(2)
  })

  it('a rajada que estoura desce um degrau, sem desligar, e abre outra rajada sozinha', () => {
    // a máquina que aguenta o centro e não o anel perde só o anel
    const budget = stepped()
    const lastMs = switchedOn(budget)
    budget.recheck()
    const { decisions } = pushFrames(budget, { count: FRAME_SAMPLES + RECHECK_SKIP, intervalMs: 25, startMs: lastMs + 25 })
    expect(decisions).toEqual(['down'])
    expect(budget.level).toBe(1)
    expect(budget.state).toBe('on')
    // a rajada nova mede o degrau de baixo, sem ninguém pedir
    expect(budget.wantsFrame).toBe(true)
  })

  it('a rajada de um bloco novo não conta os 6 primeiros intervalos: a troca deixa trabalho para os quadros seguintes', () => {
    /* No quadro da troca, o React põe os ladrilhos na tela e o grosso refaz o buraco (uns 4 ms, e
       duas vezes no npm run dev); no seguinte, o buffer do buraco (3 MB) sobe para a placa de vídeo,
       que pode terminar isso um quadro depois, e a página pode coletar o lixo dos mapas de normais
       montados. Numa tela de 60 Hz, a folga do limite é de 3 quadros em 60 que perdem a vez da tela:
       com só os 2 primeiros de fora, 4 quadros lentos logo depois da troca tiravam o anel numa
       máquina que aguenta (revisão de 13/11). */
    const budget = stepped()
    const lastMs = switchedOn(budget, 10)
    budget.recheck()
    const intervals = [...Array.from({ length: 6 }, () => 2000 / 60), ...Array.from({ length: FRAME_SAMPLES }, () => 1000 / 60)]
    const { decisions } = pushFrames(budget, { intervals, startMs: lastMs + 2000 / 60 })
    expect(decisions).toEqual([])
    expect(budget.level).toBe(2)
    expect(budget.averageMs).toBeCloseTo(1000 / 60, 6)
  })

  it('a rajada que ele abre sozinho também pula os primeiros quadros, que tiram o anel da tela', () => {
    // contados, os quadros da troca (60 ms cada) levariam a média a 21 ms e tirariam o centro
    // também, numa máquina em que ele cabe
    const budget = stepped()
    const lastMs = switchedOn(budget, 10)
    budget.recheck()
    const slow = pushFrames(budget, { count: FRAME_SAMPLES + RECHECK_SKIP, intervalMs: 25, startMs: lastMs + 25 })
    expect(slow.decisions).toEqual(['down'])
    const intervals = [...Array.from({ length: RECHECK_SKIP }, () => 60), ...Array.from({ length: FRAME_SAMPLES }, () => 1000 / 60)]
    const { decisions } = pushFrames(budget, { intervals, startMs: slow.lastMs + 60 })
    expect(decisions).toEqual([])
    expect(budget.level).toBe(1)
    expect(budget.averageMs).toBeCloseTo(1000 / 60, 6)
  })

  it('no degrau de baixo, a rajada que estoura desliga', () => {
    const budget = stepped()
    const lastMs = switchedOn(budget)
    budget.recheck()
    const { decisions } = pushFrames(budget, { count: 2 * (FRAME_SAMPLES + RECHECK_SKIP), intervalMs: 25, startMs: lastMs + 25 })
    expect(decisions).toEqual(['down', 'off'])
    expect(budget.level).toBe(0)
    expect(budget.state).toBe('off')
    expect(budget.wantsFrame).toBe(false)
  })

  it('o degrau não sobe: subir de novo faria o anel piscar numa máquina no limite', () => {
    const budget = stepped()
    const lastMs = switchedOn(budget)
    budget.recheck()
    const slow = pushFrames(budget, { count: FRAME_SAMPLES + RECHECK_SKIP, intervalMs: 25, startMs: lastMs + 25 })
    // a rajada que ele abriu sozinho, rápida: fica no degrau 1
    const fast = pushFrames(budget, { count: FRAME_SAMPLES + RECHECK_SKIP, intervalMs: 6.9, startMs: slow.lastMs + 6.9 })
    budget.recheck()
    pushFrames(budget, { count: FRAME_SAMPLES + RECHECK_SKIP + 1, intervalMs: 6.9, startMs: fast.lastMs + 6.9 })
    expect(budget.level).toBe(1)
    expect(budget.state).toBe('on')
  })

  it('a abertura que estoura desliga direto: a cena sem relevo fino já não aguenta', () => {
    const budget = stepped()
    const { decisions } = pushFrames(budget, { count: FRAME_SAMPLES + 1, intervalMs: 18.1 })
    expect(decisions).toEqual(['off'])
    expect(budget.level).toBe(0)
  })
})

describe('createFrameBudget, os quadros que ele pede', () => {
  it('conta cada medição que termina, também a que não muda nada: o console mostra a folga', () => {
    // sem isto, com a máquina aguentando, o console ficava calado depois do "ligado", e ninguém via
    // a que distância do limite cada rajada ficou (em 13/11, só apareceram as linhas que desligaram)
    const budget = createFrameBudget({ warmupMs: 0 })
    expect(budget.measurements).toBe(0)
    const lastMs = switchedOn(budget, 10)
    expect(budget.measurements).toBe(1)
    budget.recheck()
    pushFrames(budget, { count: FRAME_SAMPLES + RECHECK_SKIP, intervalMs: 1000 / 60, startMs: lastMs + 1000 / 60 })
    expect(budget.measurements).toBe(2)
    expect(budget.state).toBe('on')
    expect(budget.averageMs).toBeCloseTo(1000 / 60, 6)
  })

  it('pede quadros enquanto mede, e para de pedir quando decide', () => {
    // com a cena parada (card C9) ninguém desenharia: sem pedir, o medidor nunca decidiria
    const budget = createFrameBudget({ warmupMs: 0 })
    expect(budget.wantsFrame).toBe(true)
    switchedOn(budget)
    expect(budget.wantsFrame).toBe(false)
  })

  it('ligado, os quadros que ele não pediu não contam: a roda do mouse, a cada 50 ms', () => {
    // cada passo da roda desenha um quadro solto; o intervalo entre eles é a mão, não a máquina
    const budget = createFrameBudget({ warmupMs: 0 })
    const lastMs = switchedOn(budget)
    const { decisions } = pushFrames(budget, { count: 100, intervalMs: 50, startMs: lastMs + 50 })
    expect(decisions).toEqual([])
    expect(budget.state).toBe('on')
  })

  it('ligado, a rajada depois de um bloco novo desliga se os quadros passarem do limite, e não liga mais', () => {
    const budget = createFrameBudget({ warmupMs: 0 })
    const lastMs = switchedOn(budget)
    budget.recheck()
    expect(budget.wantsFrame).toBe(true)
    const slow = pushFrames(budget, { count: FRAME_SAMPLES + RECHECK_SKIP + 1, intervalMs: 25, startMs: lastMs + 25 })
    expect(slow.decisions).toEqual(['off'])
    expect(budget.wantsFrame).toBe(false)
    // desligado, não pede mais quadro nenhum: seriam quadros desenhados à toa
    budget.recheck()
    expect(budget.wantsFrame).toBe(false)
    const fastAgain = pushFrames(budget, { count: FRAME_SAMPLES * 2, intervalMs: 6.9, startMs: slow.lastMs + 6.9 })
    expect(fastAgain.decisions).toEqual([])
    expect(budget.state).toBe('off')
  })

  it('a rajada não conta os primeiros quadros, que trocam o relevo na tela, e termina sozinha', () => {
    // ligado antes a 10 ms: a média de 16,67 ms no fim mostra que a rajada decidiu, e não só que
    // ela acabou sem decidir
    const budget = createFrameBudget({ warmupMs: 0 })
    const lastMs = switchedOn(budget, 10)
    budget.recheck()
    // numa tela de 60 Hz, os primeiros intervalos levam a troca (uns 80 ms), depois a cena volta
    // ao ritmo; contados, os de 80 ms dariam 23 ms de média e desligariam
    const intervals = [80, ...Array.from({ length: RECHECK_SKIP - 1 }, () => 80), ...Array.from({ length: FRAME_SAMPLES }, () => 1000 / 60)]
    const { decisions } = pushFrames(budget, { intervals, startMs: lastMs + 80 })
    expect(decisions).toEqual([])
    expect(budget.state).toBe('on')
    expect(budget.averageMs).toBeCloseTo(1000 / 60, 6)
    expect(budget.wantsFrame).toBe(false)
  })

  it('um ladrilho montado no meio da rajada não tira a decisão dela: a máquina lenta desliga', () => {
    // a rajada junta os intervalos que contam; com um número fixo de quadros, o intervalo pulado
    // deixava 59 dos 60, ela acabava sem decidir, e nenhuma outra vinha se a câmera voltasse
    // para o bloco que já estava na tela
    const budget = createFrameBudget({ warmupMs: 0 })
    const lastMs = switchedOn(budget, 12)
    budget.recheck()
    const { decisions } = pushFrames(budget, {
      count: FRAME_SAMPLES + RECHECK_SKIP + 5,
      intervalMs: 25,
      startMs: lastMs + 25,
      afterEach: (i) => i === 29 && budget.skipNext(),
    })
    expect(decisions).toEqual(['off'])
  })

  it('uma pausa no meio da rajada (a aba escondida, a conta de um ponto) também não tira a decisão', () => {
    const budget = createFrameBudget({ warmupMs: 0 })
    const lastMs = switchedOn(budget, 12)
    budget.recheck()
    const intervals = Array.from({ length: FRAME_SAMPLES + RECHECK_SKIP + 5 }, (_, i) => (i === 30 ? MAX_GAP_MS + 50 : 25))
    const { decisions } = pushFrames(budget, { intervals, startMs: lastMs + 25 })
    expect(decisions).toEqual(['off'])
  })

  it('numa página que só tem pausas, a rajada para de pedir quadros depois de um teto', () => {
    // sem o teto, ela pediria quadros para sempre, sem nunca juntar os intervalos
    const budget = createFrameBudget({ warmupMs: 0 })
    const lastMs = switchedOn(budget, 12)
    budget.recheck()
    const ceiling = 2 * FRAME_SAMPLES + RECHECK_SKIP
    const almost = pushFrames(budget, { count: ceiling - 1, intervalMs: MAX_GAP_MS + 50, startMs: lastMs + MAX_GAP_MS + 50 })
    expect(budget.wantsFrame).toBe(true)
    pushFrames(budget, { count: 1, intervalMs: 0, startMs: almost.lastMs + MAX_GAP_MS + 50 })
    expect(budget.wantsFrame).toBe(false)
    expect(budget.state).toBe('on')
  })

  it('a rajada decide só pelos quadros dela, e não pelos da medição de antes', () => {
    // ligou a 17,4 ms, perto do limite; na rajada, 10 quadros a 20 ms e 50 a 16,67 ms: 17,2 ms
    // de média, liga. Misturando com os de antes, os 10 lentos dariam 17,8 ms e desligariam.
    const budget = createFrameBudget({ warmupMs: 0 })
    const lastMs = switchedOn(budget, 17.4)
    budget.recheck()
    const intervals = [
      ...Array.from({ length: RECHECK_SKIP }, () => 17.4),
      ...Array.from({ length: 10 }, () => 20),
      ...Array.from({ length: FRAME_SAMPLES - 10 }, () => 1000 / 60),
    ]
    const { decisions } = pushFrames(budget, { intervals, startMs: lastMs + 17.4 })
    expect(decisions).toEqual([])
    expect(budget.state).toBe('on')
    expect(budget.averageMs).toBeCloseTo((10 * 20 + (FRAME_SAMPLES - 10) * (1000 / 60)) / FRAME_SAMPLES, 6)
  })

  it('o quadro avisado com skipNext não conta: é o que montou um ladrilho', () => {
    // numa tela de 60 Hz, quatro ladrilhos montados na rajada, cada um num quadro que perde a vez
    // da tela (33,3 ms). Ligado antes a 10 ms: a média de 16,67 ms no fim mostra que a rajada
    // decidiu, e sem os quadros da montagem
    const slowAt = new Set([10, 20, 30, 40])
    const intervals = Array.from({ length: FRAME_SAMPLES + RECHECK_SKIP + slowAt.size + 1 }, (_, i) =>
      slowAt.has(i) ? 2000 / 60 : 1000 / 60,
    )
    function run(useSkip) {
      const budget = createFrameBudget({ warmupMs: 0 })
      const lastMs = switchedOn(budget, 10)
      budget.recheck()
      const { decisions } = pushFrames(budget, {
        intervals,
        startMs: lastMs + 1000 / 60,
        // o skipNext vem no quadro que monta, depois do push: o intervalo lento é o seguinte
        afterEach: (i) => useSkip && slowAt.has(i + 1) && budget.skipNext(),
      })
      return { decisions, averageMs: budget.averageMs, wantsFrame: budget.wantsFrame }
    }
    const withSkip = run(true)
    expect(withSkip.decisions).toEqual([])
    expect(withSkip.averageMs).toBeCloseTo(1000 / 60, 6)
    expect(withSkip.wantsFrame).toBe(false)
    // contados, os quatro quadros da montagem dariam 17,8 ms de média
    expect(run(false).decisions).toEqual(['off'])
  })
})

/* Se a máquina aguenta o relevo fino (card C6): mede o tempo entre quadros seguidos e decide.
 *
 * Decidido em 09/11 (Marco), com os números do C4: o relevo fino liga só se os quadros ficarem
 * abaixo de 16,7 ms (60 por segundo), e desliga se passarem disso depois de ligado. No notebook do
 * Miguel, a cena sem o relevo fino já custa uns 20 ms (55 por segundo numa tela de 60 Hz, com a Lua
 * girando): lá ele fica desligado.
 *
 * Ele só mede os quadros que ele mesmo pede (wantsFrame), em rajadas: ao abrir a página, até
 * decidir; e, depois de ligado, a cada bloco novo de relevo fino que entra na tela (recheck). Por
 * que não medir os quadros que já acontecem: com o C9, a cena parada não desenha, e o intervalo entre
 * dois quadros soltos (um passo da roda do mouse, um ladrilho que chega) é o ritmo da mão ou da
 * rede, e não o custo de desenhar. Contados, eles desligavam o relevo fino numa máquina que aguenta.
 * Pelo mesmo motivo não serve o PerformanceMonitor do Drei, que o card sugeria: ele conta quadros
 * por segundo em janelas de tempo, e a cena parada pareceria "0 por segundo".
 *
 * Sem React e sem three: recebe a hora de cada quadro e devolve a decisão, testado no Node. Quem usa
 * obedece: depois de cada push, se wantsFrame for true, pede o quadro seguinte (invalidate).
 */

/* O limite da média do tempo entre quadros. A média de 60 intervalos seguidos é praticamente
   (último quadro − primeiro) / 60, então a variação de cada quadro se cancela: numa tela de 60 Hz
   que acompanha a cena, ela fica em 16,67 ms. A folga de 0,8 ms sobre os 16,7 ms da decisão de 09/11
   aceita até 3 quadros que perdem a vez da tela em cada 60 (uns 57 por segundo); sem ela, um único
   quadro atrasado numa tela de 60 Hz desligaria o relevo fino para sempre. O notebook do Miguel,
   com a Lua girando, fica em 18,1 ms, acima dela. */
export const FRAME_LIMIT_MS = 17.5

/* Quantos intervalos entram na média: uns 0,4 s a 144 Hz e 1 s a 60 Hz. Poucos, e um quadro lento
   solto decidiria sozinho; muitos, e a rajada que mede demoraria e gastaria bateria à toa. */
export const FRAME_SAMPLES = 60

/* O intervalo acima do qual dois quadros não contam como seguidos, mesmo dentro de uma rajada: com o
   navegador escondido ou ocupado, o quadro pedido pode demorar, e isso não é o custo de desenhar. */
export const MAX_GAP_MS = 100

/* Quanto tempo, a partir do primeiro quadro, não conta. No começo a cena ainda monta o relevo e
   prepara o desenho na placa de vídeo, e alguns quadros saem lentos; contados, eles podiam fazer um
   notebook rápido decidir "não aguenta" para sempre. */
export const WARMUP_MS = 1000

/* Quantos intervalos do começo de uma rajada de recheck não contam, uns 100 ms numa tela de 60 Hz.
   A troca do relevo acontece uma vez só e não é o custo de desenhar: no quadro em que o bloco novo
   entra na tela, o React põe os ladrilhos e o grosso refaz o buraco; no seguinte, o buffer do
   buraco (3 MB) sobe para a placa de vídeo, que pode terminar isso um quadro depois, e a página
   pode coletar o lixo dos mapas de normais montados. Com 2, como era, sobravam esses quadros nos
   contados, e a folga do limite é de só 3 quadros em 60 que perdem a vez da tela (revisão de
   13/11). Também é o começo da rajada que o degrau "só o centro" abre sozinho, quando o anel sai. */
export const RECHECK_SKIP = 6

/* levels: quantos degraus de relevo fino a cena tem (no NearRelief, 2: o centro e o anel; 1: só o
   centro). Devolve { state, level, averageMs, measurements, wantsFrame, push, recheck, skipNext }.
   - state: 'measuring' até a primeira decisão, depois 'on' ou 'off'. Desligado é para sempre nesta
     página: ligar de novo faria o relevo fino piscar, ligando e desligando, numa máquina no limite.
   - level: o degrau de agora, de levels (tudo) a 0 (desligado, ou ainda medindo). Ele só desce,
     pelo mesmo motivo do desligado.
   - averageMs: a última média calculada, para o aviso no console.
   - measurements: quantas medições já terminaram, também as que não mudaram nada. Quem usa
     compara com o número de antes para mostrar no console toda média, e não só as que decidem:
     sem isso, com a máquina aguentando, ninguém via a que distância do limite ela ficou.
   - wantsFrame: se o medidor quer o próximo quadro; quem usa pede (invalidate) quando for true.
   - push(nowMs): a hora do quadro (performance.now()). Conta o intervalo só se o push anterior pediu
     este quadro. Devolve 'on', 'down' (desceu um degrau) ou 'off' quando decide, ou null.
   - recheck(): depois de ligado, mede de novo, numa rajada de quadros (o bloco novo na tela), até
     juntar os intervalos para decidir.
   - skipNext(): o próximo intervalo não conta (o quadro que montou um ladrilho). */
export function createFrameBudget({
  limitMs = FRAME_LIMIT_MS,
  samples = FRAME_SAMPLES,
  maxGapMs = MAX_GAP_MS,
  warmupMs = WARMUP_MS,
  levels = 1,
} = {}) {
  let state = 'measuring'
  let level = 0
  let firstMs = null
  let lastMs = null
  let averageMs
  let measurements = 0
  // se o push anterior pediu o quadro seguinte; enquanto mede pela primeira vez, sempre
  let wanted = true
  // quantos quadros da rajada de recheck ainda faltam, e quantos intervalos não contam
  let burstLeft = 0
  let skip = 0
  const intervals = []

  function startBurst() {
    // o teto da rajada: o dobro do que ela precisa. Numa página que só tem pausas, ela pararia
    // de pedir quadros sem decidir, em vez de pedir para sempre; o próximo bloco tenta de novo
    burstLeft = 2 * samples + RECHECK_SKIP
    skip = RECHECK_SKIP
    wanted = true
    // a rajada decide sozinha: misturada com a medição de antes, uns poucos quadros lentos do
    // começo dela desligariam o relevo fino numa máquina que, na média da rajada, aguenta
    intervals.length = 0
  }

  function decide(average) {
    averageMs = average
    measurements++
    if (state === 'measuring') {
      // a abertura mede a cena sem relevo fino: se ela já não aguenta, nenhum degrau aguenta
      state = average <= limitMs ? 'on' : 'off'
      level = state === 'on' ? levels : 0
      return state
    }
    if (average <= limitMs) return null
    level--
    if (level === 0) {
      state = 'off'
      return state
    }
    // desceu um degrau: quem usa tira o de cima da tela, e a rajada nova mede o de baixo, sem
    // esperar outro bloco entrar
    startBurst()
    return 'down'
  }

  return {
    get state() {
      return state
    },
    get level() {
      return level
    },
    get averageMs() {
      return averageMs
    },
    get measurements() {
      return measurements
    },
    get wantsFrame() {
      return wanted
    },
    push(nowMs) {
      firstMs ??= nowMs
      const previousMs = lastMs
      const chained = wanted
      lastMs = nowMs
      let decision = null

      if (state !== 'off' && previousMs !== null && chained) {
        const interval = nowMs - previousMs
        if (skip > 0) skip--
        else if (previousMs - firstMs >= warmupMs && interval > 0 && interval <= maxGapMs) {
          intervals.push(interval)
          if (intervals.length > samples) intervals.shift()
          if (intervals.length === samples) {
            decision = decide(intervals.reduce((sum, value) => sum + value, 0) / samples)
          }
        }
      }

      if (burstLeft > 0) burstLeft--
      // a rajada termina quando junta os intervalos para decidir, e não depois de um número certo
      // de quadros: com um número certo, um intervalo que não conta (um ladrilho montado, uma
      // pausa) deixava 59 dos 60, e ela acabava sem decidir
      wanted = state === 'measuring' || (state === 'on' && burstLeft > 0 && intervals.length < samples)
      return decision
    },
    recheck() {
      if (state === 'on') startBurst()
    },
    skipNext() {
      skip = Math.max(skip, 1)
    },
  }
}

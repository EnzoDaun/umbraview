/* As contas de desenho da vista do chão e da linha do tempo: de horas e graus para trechos e
 * pontos na tela. Nenhuma conta de astronomia aqui: os números chegam prontos do motor
 * (sky.groundView, em src/engine/summary.js), e este arquivo só decide onde cada um aparece.
 * Sem o React, para ser testado no Node.
 */
const HOUR_MS = 3600e3

/* hours: a lista hora a hora de um astro (sky.groundView.sun ou .earth). Devolve os trechos
   seguidos com ele à vista, em horas do período: { start, end }, com o end no começo da hora
   seguinte à última do trecho. */
export function visibleRuns(hours) {
  const runs = []
  let start = null
  hours.forEach((hour, i) => {
    if (hour.visible && start === null) start = i
    if (!hour.visible && start !== null) {
      runs.push({ start, end: i })
      start = null
    }
  })
  if (start !== null) runs.push({ start, end: hours.length })
  return runs
}

/* windows: sky.landingWindows. period: sky.period. Os mesmos trechos { start, end }, em horas a
   partir do começo do período, para a linha do tempo desenhar as janelas na mesma régua. */
export function windowRuns(windows, period) {
  const hoursFromStart = (date) => (date - period.startUtc) / HOUR_MS
  return windows.map((landingWindow) => ({
    start: hoursFromStart(landingWindow.startUtc),
    end: hoursFromStart(landingWindow.endUtc),
  }))
}

/* A hora calculada mais perto de uma data, dentro do período de count horas. */
export function hourOfDate(date, period, count) {
  const hour = Math.round((date - period.startUtc) / HOUR_MS)
  return Math.min(count - 1, Math.max(0, hour))
}

/* A faixa de altura do gráfico, em graus inteiros, para o ponto: do relevo, do Sol e da Terra, com
   1° de folga. Cada ponto tem a sua: perto do polo tudo cabe em poucos graus, e fora dele o Sol
   sobe dezenas. A faixa mínima evita que um ponto plano vire uma linha esticada na tela inteira. */
const PADDING_DEG = 1
const MIN_SPAN_DEG = 6
/* Fora do polo, o Sol desce dezenas de graus abaixo do horizonte de noite. Mostrar isso tudo
   espremeria a parte que interessa, que é o Sol e a Terra perto do relevo: a escala para aqui, e o
   caminho mais fundo sai pela base do gráfico. */
const FLOOR_DEG = -12

export function elevationRange({ horizonDeg, sun, earth }) {
  let min = Infinity
  let max = -Infinity
  const include = (value) => {
    if (value < min) min = value
    if (value > max) max = value
  }
  horizonDeg.forEach(include)
  sun.forEach((hour) => include(hour.elevationDeg))
  earth.forEach((hour) => include(hour.elevationDeg))
  // o plano do horizonte (0°) sempre aparece, com espaço embaixo dele
  min = Math.max(FLOOR_DEG, Math.floor(Math.min(min, -PADDING_DEG) - PADDING_DEG))
  max = Math.ceil(max + PADDING_DEG)
  if (max - min < MIN_SPAN_DEG) max = min + MIN_SPAN_DEG
  return { min, max }
}

/* Onde um ponto do céu cai no gráfico, de 0 a 1: x da esquerda (azimute 0°, o norte) à direita
   (360°), y de cima (a altura máxima) para baixo. */
export function chartPosition(azimuthDeg, elevationDeg, { min, max }) {
  return { x: azimuthDeg / 360, y: (max - elevationDeg) / (max - min) }
}

const round = (value) => Math.round(value * 100) / 100

/* O contorno do relevo como uma área fechada, no atributo d de um <path> do SVG de width × height:
   sobe da base em 0°, passa por cada grau, repete a altura de 0° em 360° para fechar a volta, e
   desce de novo à base. */
export function horizonAreaPath(horizonDeg, range, width, height) {
  if (horizonDeg.length === 0) return ''
  const point = (azimuthDeg, elevationDeg) => {
    const { x, y } = chartPosition(azimuthDeg, elevationDeg, range)
    return `${round(x * width)},${round(y * height)}`
  }
  const step = 360 / horizonDeg.length
  const outline = horizonDeg.map((elevation, a) => `L${point(a * step, elevation)}`)
  return [`M0,${height}`, ...outline, `L${point(360, horizonDeg[0])}`, `L${width},${height}`, 'Z'].join(' ')
}

/* Um salto de azimute maior que isto entre duas horas seguidas é o astro dando a volta em 360°, e
   não um movimento de verdade: o Sol anda meio grau por hora, e a Terra quase nada. */
const WRAP_JUMP_DEG = 180

/* hours: a lista hora a hora de um astro. Devolve o caminho dele em pedaços seguidos,
   { visible, points: [[azimute, altura], ...] }: um pedaço novo quando ele some ou aparece (os dois
   pedaços se encostam no ponto da troca, para a linha não ficar com um buraco) e quando dá a volta
   em 360° (aí sem encostar: a linha recomeça do outro lado do gráfico). */
export function bodySegments(hours) {
  const segments = []
  let current = null
  hours.forEach((hour, i) => {
    const point = [hour.azimuthDeg, hour.elevationDeg]
    const previous = hours[i - 1]
    const wrapped = previous && Math.abs(hour.azimuthDeg - previous.azimuthDeg) > WRAP_JUMP_DEG
    if (!current || wrapped) {
      current = { visible: hour.visible, points: [point] }
      segments.push(current)
    } else if (hour.visible !== current.visible) {
      current.points.push(point)
      current = { visible: hour.visible, points: [point] }
      segments.push(current)
    } else {
      current.points.push(point)
    }
  })
  return segments
}

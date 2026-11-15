/* O resultado do motor no formato que a tela espera: o objeto sky de "O que a ponte entrega para a
 * tela", no docs/backlog.md. Se aquele formato mudar, muda aqui e no teste deste arquivo, no mesmo
 * PR, para o painel (card I1) e a cena (card C2) não lerem um campo que não existe mais.
 */
import { TERRAIN_GRAZE_DEG } from './config.js'
import { findLandingWindows, nextChange, nextSetting, nextSunset } from './series.js'

const HOUR_MS = 3600e3
const DEG = 180 / Math.PI

/* A altura do relevo em cada grau de azimute, de 0 (norte) a 359, crescendo para o leste: a linha do
   chão da vista do horizonte. Com 360 direções (HORIZON.directions), é o próprio computeHorizon; com
   outro número, a direção mais perto de cada grau. null sem horizonte. */
function horizonByDegree(horizon) {
  if (!horizon) return null
  const { elevationsRad, directions } = horizon
  return Array.from({ length: 360 }, (_, a) => elevationsRad[Math.round((a * directions) / 360) % directions] * DEG)
}

/* O caminho do Sol e da Terra hora a hora, para a vista do horizonte (C2). O visible segue as
   regras do painel (BODIES, series.js): o Sol com metade do disco, a Terra com alguma parte. */
function bodyPath(series, kind) {
  const path = new Array(series.count)
  for (let i = 0; i < series.count; i++) {
    path[i] = kind === 'sun'
      ? { azimuthDeg: series.sunAzimuthDeg[i], elevationDeg: series.sunElevationDeg[i], visible: series.sunFraction[i] >= 0.5 }
      : { azimuthDeg: series.earthAzimuthDeg[i], elevationDeg: series.earthElevationDeg[i], visible: series.earthMarginDeg[i] > 0 }
  }
  return path
}

/* O que vale a pena dizer embaixo da vista do horizonte, contado aqui para a tela só encaixar o
   número na frase (src/data/). earthHiddenByTerrainHours: horas com a Terra acima do horizonte
   plano, mas escondida pelo relevo: é a montanha, e não a geometria, que tira a Terra.
   sunNearTerrainHours: horas com alguma parte do Sol à vista e o centro dele a menos de
   TERRAIN_GRAZE_DEG acima do relevo (config.js diz por que isso importa).
   earthNeverAboveHorizon: a Terra fica abaixo do horizonte plano o período inteiro, como no lado
   oculto: nenhum relevo resolve. */
function buildNotes(series) {
  let earthHidden = 0
  let sunNear = 0
  let earthAbove = false
  for (let i = 0; i < series.count; i++) {
    const earthUp = series.earthElevationDeg[i] > 0
    if (earthUp) earthAbove = true
    if (earthUp && series.earthMarginDeg[i] <= 0) earthHidden++
    if (series.sunFraction[i] > 0 && series.sunElevationDeg[i] - series.sunHorizonDeg[i] < TERRAIN_GRAZE_DEG) sunNear++
  }
  return {
    earthHiddenByTerrainHours: earthHidden * series.stepHours,
    sunNearTerrainHours: sunNear * series.stepHours,
    earthNeverAboveHorizon: !earthAbove,
  }
}

/* series: o resultado de computeSeries; o "agora" é o primeiro instante dela.
   minWindowHours: a duração mínima de uma janela de pouso (MIN_LANDING_WINDOW_HOURS, config.js).
   horizon: o resultado de computeHorizon, para a linha do chão da vista do horizonte (C2). */
export function summarizeSky(series, { minWindowHours, horizon = null }) {
  const { startMs, stepHours, sunFraction } = series
  const at = (hours) => new Date(startMs + hours * HOUR_MS)

  let sunTotal = 0
  let earthHours = 0
  let dark = 0
  let longestDark = 0
  for (let i = 0; i < series.count; i++) {
    sunTotal += sunFraction[i]
    if (series.earthMarginDeg[i] > 0) earthHours++
    // escuridão: o Sol inteiro escondido, e não só metade
    if (sunFraction[i] <= 0) {
      dark++
      if (dark > longestDark) longestDark = dark
    } else {
      dark = 0
    }
  }

  const sunsetHours = nextSunset(series, 0)
  const earthsetHours = nextSetting('earth', series, 0)
  /* A volta só existe com o astro escondido agora: com ele à vista, o nextChange devolve o pôr, e
     não a volta (card E18). */
  const returnUtc = (kind) => {
    const { visibleNow, hours } = nextChange(kind, series, 0)
    return visibleNow || hours === null ? null : at(hours)
  }
  return {
    sunNow: { elevationDeg: series.sunElevationDeg[0], visible: sunFraction[0] >= 0.5 },
    earthNow: { elevationDeg: series.earthElevationDeg[0], visible: series.earthMarginDeg[0] > 0 },
    nextSunsetUtc: sunsetHours === null ? null : at(sunsetHours),
    nextSunriseUtc: returnUtc('sun'),
    nextEarthsetUtc: earthsetHours === null ? null : at(earthsetHours),
    nextEarthriseUtc: returnUtc('earth'),
    sunFraction: sunTotal / series.count,
    earthFraction: earthHours / series.count,
    longestDarkHours: longestDark * stepHours,
    landingWindows: findLandingWindows(series, minWindowHours).map((w) => {
      const startUtc = at(w.startHours)
      const endUtc = at(w.endHours)
      return {
        startUtc,
        endUtc,
        // dos próprios Date, e não das horas da série: o Date corta a fração de milissegundo, e a
        // duração discordaria do começo e do fim que a tela mostra
        durationHours: (endUtc - startUtc) / HOUR_MS,
        startsBeforePeriod: w.startsBeforePeriod,
        endsAfterPeriod: w.endsAfterPeriod,
      }
    }),
    // o fim é o último instante calculado, e não o começo mais PERIOD_DAYS: é onde termina uma
    // janela com endsAfterPeriod, e assim a duração do período fica só no siteSky.js
    period: { startUtc: at(0), endUtc: at((series.count - 1) * stepHours) },
    groundView: { horizonDeg: horizonByDegree(horizon), sun: bodyPath(series, 'sun'), earth: bodyPath(series, 'earth') },
    notes: buildNotes(series),
  }
}

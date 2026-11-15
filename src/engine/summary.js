/* O resultado do motor no formato que a tela espera: o objeto sky de "O que a ponte entrega para a
 * tela", no docs/backlog.md. Se aquele formato mudar, muda aqui e no teste deste arquivo, no mesmo
 * PR, para o painel (card I1) e a cena (card C2) não lerem um campo que não existe mais.
 */
import { horizonElevationAt } from './horizon.js'
import { findLandingWindows, isVisibleAt, nextChange, nextSetting, nextSunset } from './series.js'

const HOUR_MS = 3600e3
const DEG = 180 / Math.PI
// Um número do contorno do relevo por grau de azimute, qualquer que seja o número de direções do
// horizonte: é o que o gráfico da tela desenha.
const GROUND_VIEW_DIRECTIONS = 360

/* A vista do chão: o contorno do relevo em volta do ponto e onde o Sol e a Terra estão a cada hora,
   para a tela mostrar por que o ponto tem ou não tem luz e Terra. horizon: o resultado de
   computeHorizon, ou undefined (aí o contorno sai vazio). O "à vista" vem da mesma regra do resto
   do resumo (isVisibleAt), para o gráfico e os números nunca discordarem. */
function buildGroundView(series, horizon) {
  const horizonDeg = horizon
    ? Array.from({ length: GROUND_VIEW_DIRECTIONS }, (_, a) =>
        horizonElevationAt(horizon, (a * 2 * Math.PI) / GROUND_VIEW_DIRECTIONS) * DEG,
      )
    : []
  const path = (kind, azimuth, elevation) =>
    Array.from({ length: series.count }, (_, i) => ({
      azimuthDeg: azimuth[i],
      elevationDeg: elevation[i],
      visible: isVisibleAt(kind, series, i),
    }))
  return {
    horizonDeg,
    sun: path('sun', series.sunAzimuthDeg, series.sunElevationDeg),
    earth: path('earth', series.earthAzimuthDeg, series.earthElevationDeg),
  }
}

/* series: o resultado de computeSeries; o "agora" é o primeiro instante dela.
   minWindowHours: a duração mínima de uma janela de pouso (MIN_LANDING_WINDOW_HOURS, config.js).
   horizon: o horizonte do ponto (computeHorizon), para a vista do chão. */
export function summarizeSky(series, { minWindowHours, horizon }) {
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
    groundView: buildGroundView(series, horizon),
  }
}

/* O resultado do motor no formato que a tela espera: o objeto sky de "O que a ponte entrega para a
 * tela", no docs/backlog.md. Se aquele formato mudar, muda aqui e no teste deste arquivo, no mesmo
 * PR, para o painel (card I1) e a cena (card C2) não lerem um campo que não existe mais.
 */
import { findLandingWindows, nextSunset } from './series.js'

const HOUR_MS = 3600e3

/* series: o resultado de computeSeries; o "agora" é o primeiro instante dela.
   minWindowHours: a duração mínima de uma janela de pouso (MIN_LANDING_WINDOW_HOURS, config.js). */
export function summarizeSky(series, { minWindowHours }) {
  const { startMs, stepHours, sunFraction } = series
  const at = (hours) => new Date(startMs + hours * HOUR_MS)

  let sunTotal = 0
  let dark = 0
  let longestDark = 0
  for (let i = 0; i < series.count; i++) {
    sunTotal += sunFraction[i]
    // escuridão: o Sol inteiro escondido, e não só metade
    if (sunFraction[i] <= 0) {
      dark++
      if (dark > longestDark) longestDark = dark
    } else {
      dark = 0
    }
  }

  const sunsetHours = nextSunset(series, 0)
  return {
    sunNow: { elevationDeg: series.sunElevationDeg[0], visible: sunFraction[0] >= 0.5 },
    earthNow: { elevationDeg: series.earthElevationDeg[0], visible: series.earthMarginDeg[0] > 0 },
    nextSunsetUtc: sunsetHours === null ? null : at(sunsetHours),
    sunFraction: sunTotal / series.count,
    longestDarkHours: longestDark * stepHours,
    landingWindows: findLandingWindows(series, minWindowHours).map((w) => ({
      startUtc: at(w.start * stepHours),
      endUtc: at(w.start * stepHours + w.hours),
    })),
  }
}

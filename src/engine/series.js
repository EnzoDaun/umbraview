/* O céu de um ponto hora a hora: onde estão o Sol e a Terra, quanto deles as montanhas escondem,
 * e quando isso muda.
 *
 * O Sol conta pela fração do disco acima das montanhas, a mesma conta da comparação com os mapas
 * da NASA (config.js); o pôr do Sol é quando metade do disco some. A Terra está à vista quando
 * qualquer parte dela aparece.
 */
import { MOON_RADIUS_M } from './geometry.js'
import { horizonElevationAt } from './horizon.js'

const SUN_RADIUS_KM = 696000
const EARTH_RADIUS_KM = 6378.137
const DEG = 180 / Math.PI

/* Fração de um disco acima de uma linha reta, com o centro do disco a d raios acima dela
   (d negativo: abaixo). É a área do segmento circular dividida pela do disco. */
export function diskFraction(d) {
  if (d >= 1) return 1
  if (d <= -1) return 0
  return 1 - (Math.acos(d) - d * Math.sqrt(1 - d * d)) / Math.PI
}

/* horizon: o resultado de computeHorizon. ephemeris: o de computeEphemeris.
   Cada campo tem um número por instante. Ângulos em graus; azimute de 0° a 360°, a partir do norte
   e crescendo para o leste. sunHorizonDeg e earthHorizonDeg: altura das montanhas na direção do
   astro. sunFraction: de 0 a 1, quanto do disco do Sol está acima das montanhas.
   earthMarginDeg: quanto a borda de cima da Terra passa das montanhas (positivo: alguma parte à
   vista). */
export function computeSeries(horizon, ephemeris) {
  const { east, north, up } = horizon.frame
  const n = ephemeris.count
  const observerKm = (MOON_RADIUS_M + horizon.observerHeightM) / 1000
  const P = [horizon.point[0] * observerKm, horizon.point[1] * observerKm, horizon.point[2] * observerKm]
  const series = {
    startMs: ephemeris.startMs,
    count: n,
    stepHours: ephemeris.stepHours,
    sunElevationDeg: new Float32Array(n),
    sunAzimuthDeg: new Float32Array(n),
    sunHorizonDeg: new Float32Array(n),
    sunFraction: new Float32Array(n),
    earthElevationDeg: new Float32Array(n),
    earthAzimuthDeg: new Float32Array(n),
    earthHorizonDeg: new Float32Array(n),
    earthMarginDeg: new Float32Array(n),
  }

  for (let i = 0; i < n; i++) {
    // O Sol está tão longe que a posição do observador não muda a direção dele.
    const sx = ephemeris.sunDirection[3 * i]
    const sy = ephemeris.sunDirection[3 * i + 1]
    const sz = ephemeris.sunDirection[3 * i + 2]
    const sunEl = Math.asin(sx * up[0] + sy * up[1] + sz * up[2])
    const sunAz = Math.atan2(sx * east[0] + sy * east[1] + sz * east[2], sx * north[0] + sy * north[1] + sz * north[2])
    const sunHz = horizonElevationAt(horizon, sunAz)
    const sunRadius = Math.asin(SUN_RADIUS_KM / ephemeris.sunDistanceKm[i])
    series.sunElevationDeg[i] = sunEl * DEG
    series.sunAzimuthDeg[i] = (sunAz * DEG + 360) % 360
    series.sunHorizonDeg[i] = sunHz * DEG
    series.sunFraction[i] = diskFraction((sunEl - sunHz) / sunRadius)

    // A Terra está perto: a direção dela é a partir do observador, e não do centro da Lua.
    const ex = ephemeris.earthPositionKm[3 * i] - P[0]
    const ey = ephemeris.earthPositionKm[3 * i + 1] - P[1]
    const ez = ephemeris.earthPositionKm[3 * i + 2] - P[2]
    const distance = Math.hypot(ex, ey, ez)
    const earthEl = Math.asin((ex * up[0] + ey * up[1] + ez * up[2]) / distance)
    const earthAz = Math.atan2(ex * east[0] + ey * east[1] + ez * east[2], ex * north[0] + ey * north[1] + ez * north[2])
    const earthHz = horizonElevationAt(horizon, earthAz)
    const earthRadius = Math.asin(EARTH_RADIUS_KM / distance)
    series.earthElevationDeg[i] = earthEl * DEG
    series.earthAzimuthDeg[i] = (earthAz * DEG + 360) % 360
    series.earthHorizonDeg[i] = earthHz * DEG
    series.earthMarginDeg[i] = (earthEl + earthRadius - earthHz) * DEG
  }
  return series
}

const sunValue = (series, i) => series.sunFraction[i] - 0.5
const earthValue = (series, i) => series.earthMarginDeg[i]
const isSunVisible = (series, i) => sunValue(series, i) >= 0
const isEarthVisible = (series, i) => earthValue(series, i) > 0

/* O valor que cruza zero quando cada astro muda de estado, e a regra de "à vista", num lugar só:
   nextChange, nextSetting e as janelas de pouso leem daqui, para o Sol e a Terra não terem duas
   regras que se desencontram. */
const BODIES = {
  sun: { value: sunValue, visible: isSunVisible },
  earth: { value: earthValue, visible: isEarthVisible },
}

/* kind: 'sun' ou 'earth'. Se o astro está à vista no instante i, pela regra de cima. Para quem
   mostra hora a hora (a vista do chão, em summary.js) dizer o mesmo que o pôr e as janelas. */
export function isVisibleAt(kind, series, i) {
  return BODIES[kind].visible(series, i)
}

/* Hora (fracionária) entre i − 1 e i em que o valor cruza zero, em linha reta. */
function crossing(value, series, i) {
  const a = value(series, i - 1)
  const b = value(series, i)
  return i - 1 + (a === b ? 0 : a / (a - b))
}

/* Arredonda ao microssegundo de hora, para o resultado não carregar ruído de ponto flutuante. */
const round = (hours) => Math.round(hours * 1e6) / 1e6

/* kind: 'sun' ou 'earth'. Quantas horas faltam, a partir do instante fromIndex, para o astro mudar
   de estado (aparecer ou sumir). hours é null se ele não muda até o fim da série. */
export function nextChange(kind, series, fromIndex) {
  const { value, visible } = BODIES[kind]
  const now = visible(series, fromIndex)
  for (let i = fromIndex + 1; i < series.sunFraction.length; i++) {
    if (visible(series, i) !== now) {
      return { visibleNow: now, hours: round((crossing(value, series, i) - fromIndex) * series.stepHours) }
    }
  }
  return { visibleNow: now, hours: null }
}

/* kind: 'sun' ou 'earth'. Quantas horas faltam para o próximo pôr do astro: a primeira vez, a
   partir de fromIndex, em que ele passa de à vista a escondido (o Sol, quando metade do disco some;
   a Terra, quando a última parte dela some). Com o astro escondido agora, é o pôr depois da próxima
   volta, e não a volta: para a volta, nextChange. null se ele não se põe até o fim da série. */
export function nextSetting(kind, series, fromIndex) {
  const { value, visible } = BODIES[kind]
  for (let i = fromIndex + 1; i < series.sunFraction.length; i++) {
    if (visible(series, i - 1) && !visible(series, i)) {
      return round((crossing(value, series, i) - fromIndex) * series.stepHours)
    }
  }
  return null
}

/* O pôr do Sol, que o resumo e as janelas de pouso usam desde o card E1. */
export function nextSunset(series, fromIndex) {
  return nextSetting('sun', series, fromIndex)
}

const CONDITIONS = [BODIES.sun, BODIES.earth]

/* Trechos seguidos em que pelo menos metade do Sol e alguma parte da Terra estão à vista ao mesmo
   tempo. O começo e o fim caem entre duas horas, pela mesma conta do pôr do Sol: a janela abre
   quando o último dos dois aparece e fecha quando o primeiro some. Assim uma janela que fecha pelo
   Sol fecha exatamente no pôr do Sol (nextSunset).
   startHours e endHours: horas desde o primeiro instante da série. startsBeforePeriod: a janela já
   estava aberta no primeiro instante, e o começo dela é o começo da série. endsAfterPeriod: continua
   depois do último instante, que é o fim dela. Só a janela inteira dentro da série precisa durar
   minHours; a cortada numa das pontas entra mesmo mais curta, porque pode durar mais fora dela. */
export function findLandingWindows(series, minHours) {
  const n = series.sunFraction.length
  const ok = (i) => isSunVisible(series, i) && isEarthVisible(series, i)
  const windows = []
  let i = 0
  while (i < n) {
    if (!ok(i)) {
      i++
      continue
    }
    const first = i
    while (i < n && ok(i)) i++
    const last = i - 1
    const startsBeforePeriod = first === 0
    const endsAfterPeriod = last === n - 1
    // na entrada, cada condição que estava escondida cruza zero entre first − 1 e first; vale a mais tarde
    const start = startsBeforePeriod
      ? 0
      : Math.max(...CONDITIONS.filter((c) => !c.visible(series, first - 1)).map((c) => crossing(c.value, series, first)))
    // na saída, cada condição que some cruza zero entre last e last + 1; vale a mais cedo
    const end = endsAfterPeriod
      ? last
      : Math.min(...CONDITIONS.filter((c) => !c.visible(series, last + 1)).map((c) => crossing(c.value, series, last + 1)))
    const startHours = round(start * series.stepHours)
    const endHours = round(end * series.stepHours)
    if (startsBeforePeriod || endsAfterPeriod || endHours - startHours >= minHours) {
      windows.push({ startHours, endHours, startsBeforePeriod, endsAfterPeriod })
    }
  }
  return windows
}

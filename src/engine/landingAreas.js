/* O mapa das áreas com janela de pouso: para uma grade de pontos com o horizonte já calculado
 * (scripts/prepare-data/prepare-landing-grid.mjs), quais têm janela de pouso no período de uma data.
 *
 * O horizonte de um ponto não depende da data: é só o relevo em volta dele. Por isso ele é calculado
 * uma vez, fora do site, e guardado; a cada data, o site só compara o Sol e a Terra com ele, que é a
 * parte rápida. A regra é a mesma da lista de janelas do painel (computeSeries e
 * findLandingWindows, em series.js): o mapa e o painel não podem discordar.
 */
import { latLonToUnit, localFrame } from './geometry.js'
import { computeSeries, findLandingWindows } from './series.js'

/* Cada ponto da grade guarda o horizonte em um byte por direção, uma direção por grau: a altura em
   passos de 0,2°, de −5° (o byte 0) a 46° (o byte 255). O erro de até 0,1° é menor que o do relevo
   de 960 m por pixel a alguns quilômetros de distância, e o arquivo fica com um quarto do tamanho
   de guardar em float. */
export const GRID_DIRECTIONS = 360
const GRID_MIN_DEG = -5
const GRID_STEP_DEG = 0.2
const DEG = 180 / Math.PI

/* elevationsRad: o horizonte de um ponto (computeHorizon), com GRID_DIRECTIONS direções. */
export function encodeGridHorizon(elevationsRad) {
  const bytes = new Uint8Array(elevationsRad.length)
  for (let a = 0; a < elevationsRad.length; a++) {
    const step = Math.round((elevationsRad[a] * DEG - GRID_MIN_DEG) / GRID_STEP_DEG)
    bytes[a] = Math.min(255, Math.max(0, step))
  }
  return bytes
}

/* horizons: o arquivo da grade (Uint8Array, um ponto depois do outro). index: qual ponto. Devolve o
   horizonte dele em radianos, como o computeHorizon dá. */
export function decodeGridHorizon(horizons, index) {
  const elevationsRad = new Float32Array(GRID_DIRECTIONS)
  const offset = index * GRID_DIRECTIONS
  for (let a = 0; a < GRID_DIRECTIONS; a++) {
    elevationsRad[a] = (horizons[offset + a] * GRID_STEP_DEG + GRID_MIN_DEG) / DEG
  }
  return elevationsRad
}

/* O horizonte do ponto index da grade, no formato que o computeSeries espera. grid: { horizons,
   points }, com points em três números por ponto (o vetor de tamanho 1, geometry.js). mastM: a
   altura do observador (HORIZON.mastM). A altura do chão no ponto não entra: ela só muda de onde
   a Terra é vista, e alguns quilômetros em 384 mil não mexem na direção. */
export function gridHorizonOf(grid, index, mastM) {
  const point = [grid.points[3 * index], grid.points[3 * index + 1], grid.points[3 * index + 2]]
  return {
    elevationsRad: decodeGridHorizon(grid.horizons, index),
    point,
    frame: localFrame(point),
    observerHeightM: mastM,
    directions: GRID_DIRECTIONS,
  }
}

/* ephemeris: o resultado de computeEphemeris para o período. Devolve um byte por ponto da grade: 1
   se ele tem pelo menos uma janela de pouso no período, 0 se não. */
export function evaluateLandingGrid(grid, ephemeris, { minWindowHours, mastM }) {
  const count = grid.horizons.length / GRID_DIRECTIONS
  const result = new Uint8Array(count)
  for (let i = 0; i < count; i++) {
    const series = computeSeries(gridHorizonOf(grid, i, mastM), ephemeris)
    result[i] = findLandingWindows(series, minWindowHours).length > 0 ? 1 : 0
  }
  return result
}

/* A grade da Lua inteira: faixas de latitude de stepDeg em stepDeg graus, cada uma com tantos
   pontos quantos cabem com o mesmo espaçamento em quilômetros (menos pontos perto dos polos, onde
   as longitudes se juntam). Fica de fora o que está na área do polo sul (latitude até
   polarMaxLatDeg), que tem a grade própria, mais fina. Devolve a lista, na ordem do arquivo:
   { lat, lon, band, index, count }, com a faixa do ponto, a posição dele nela e quantos ela tem.
   O script que calcula os horizontes e o site usam esta mesma função: a posição de cada ponto não
   precisa ser guardada. */
export function globalGridPoints(stepDeg, polarMaxLatDeg) {
  const points = []
  const bands = Math.round(180 / stepDeg)
  for (let band = 0; band < bands; band++) {
    const lat = -90 + (band + 0.5) * stepDeg
    if (lat <= polarMaxLatDeg) continue
    const count = Math.max(1, Math.round((360 / stepDeg) * Math.cos((lat * Math.PI) / 180)))
    for (let index = 0; index < count; index++) {
      points.push({ lat, lon: ((index + 0.5) * 360) / count, band, index, count })
    }
  }
  return points
}

/* Os pontos de globalGridPoints como vetores de tamanho 1, três números por ponto, no formato de
   evaluateLandingGrid. */
export function globalGridVectors(gridPoints) {
  const vectors = new Float64Array(gridPoints.length * 3)
  gridPoints.forEach(({ lat, lon }, i) => vectors.set(latLonToUnit(lat, lon), 3 * i))
  return vectors
}

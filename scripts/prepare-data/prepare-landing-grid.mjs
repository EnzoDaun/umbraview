/* Calcula o horizonte de uma grade de pontos, para o mapa das áreas com janela de pouso.
 *
 * O horizonte de um ponto é só o relevo em volta dele, e não depende da data. Este script calcula
 * o de cada ponto da grade uma vez, com o mesmo motor e o mesmo relevo do site (computeHorizon e os
 * arquivos de public/data/relief/), e grava em public/data/landing-grid/. No site, a cada data,
 * src/engine/landingAreas.js só compara o Sol e a Terra com esses horizontes.
 *
 * A grade do polo sul: um ponto a cada 5 km na projeção polar, até 84°S (a área em que dá para
 * escolher um ponto com o relevo fino). Formato: polar.bin, com 360 bytes por ponto (o horizonte,
 * encodeGridHorizon), e manifest.json, com a coluna e a linha de cada ponto na grade.
 *
 * Como rodar, na raiz do repositório: node scripts/prepare-data/prepare-landing-grid.mjs
 * Leva alguns minutos. No fim, confere uma amostra: o sim ou não do mapa contra o das janelas de
 * pouso com o horizonte inteiro, sem o arredondamento do byte.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { HORIZON, MIN_LANDING_WINDOW_HOURS, PERIOD_DAYS } from '../../src/engine/config.js'
import { computeEphemeris } from '../../src/engine/ephemeris.js'
import { MOON_RADIUS_M, polarXYToUnit, unitToLatLon } from '../../src/engine/geometry.js'
import { computeHorizon } from '../../src/engine/horizon.js'
import { encodeGridHorizon, evaluateLandingGrid, GRID_DIRECTIONS } from '../../src/engine/landingAreas.js'
import { isInsideReliefArea, loadReliefLayers } from '../../src/engine/reliefFiles.js'
import { computeSeries, findLandingWindows } from '../../src/engine/series.js'

const ROOT = join(import.meta.dirname, '..', '..')
const RELIEF = join(ROOT, 'public', 'data', 'relief')
const OUT = join(ROOT, 'public', 'data', 'landing-grid')

// O passo da grade do polo. Com 5 km, a área até 84°S dá uns 4 mil pontos: o site avalia todos em
// menos de um segundo, e uma cratera de 20 km ainda aparece no mapa.
const POLAR_STEP_M = 5000
// A data da conferência do fim: qualquer uma serve, e esta é a do começo do hackathon.
const CHECK_DATE_MS = Date.UTC(2026, 10, 14)
const CHECK_EVERY = 25

const readRelief = async (path) => {
  const bytes = await readFile(join(RELIEF, path))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

async function polarGrid(manifest) {
  // até onde a área vai, na projeção: a distância do polo ao paralelo do limite (geometry.js)
  const reachM = 2 * MOON_RADIUS_M * Math.tan(((90 + manifest.areaMaxLatDeg) * Math.PI) / 360)
  const half = Math.ceil(reachM / POLAR_STEP_M)
  const size = 2 * half
  const x0 = -half * POLAR_STEP_M
  const y0 = half * POLAR_STEP_M
  const cells = []
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const point = polarXYToUnit(x0 + (column + 0.5) * POLAR_STEP_M, y0 - (row + 0.5) * POLAR_STEP_M)
      if (isInsideReliefArea(manifest, unitToLatLon(point).lat)) cells.push({ column, row, point })
    }
  }
  return { stepM: POLAR_STEP_M, x0, y0, columns: size, rows: size, cells }
}

async function main() {
  const manifest = JSON.parse(await readFile(join(RELIEF, 'manifest.json'), 'utf8'))
  const cache = new Map()
  const grid = await polarGrid(manifest)
  const horizons = new Uint8Array(grid.cells.length * GRID_DIRECTIONS)
  const exact = []
  const started = Date.now()
  for (let i = 0; i < grid.cells.length; i++) {
    const { point } = grid.cells[i]
    const horizon = computeHorizon(await loadReliefLayers(manifest, point, readRelief, cache), point, HORIZON)
    horizons.set(encodeGridHorizon(horizon.elevationsRad), i * GRID_DIRECTIONS)
    if (i % CHECK_EVERY === 0) exact.push({ i, horizon })
    if (i % 500 === 0) console.log(`${i} de ${grid.cells.length} pontos, ${Math.round((Date.now() - started) / 1000)} s`)
  }

  await mkdir(OUT, { recursive: true })
  await writeFile(join(OUT, 'polar.bin'), horizons)
  const description = {
    source: 'Horizontes calculados por scripts/prepare-data/prepare-landing-grid.mjs com o relevo de public/data/relief/',
    directions: GRID_DIRECTIONS,
    polar: {
      file: 'polar.bin',
      stepM: grid.stepM,
      x0: grid.x0,
      y0: grid.y0,
      columns: grid.columns,
      rows: grid.rows,
      points: grid.cells.length,
      // a coluna e a linha de cada ponto, na ordem do arquivo: c0, r0, c1, r1...
      cells: grid.cells.flatMap(({ column, row }) => [column, row]),
    },
  }
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(description) + '\n')

  // A conferência: numa amostra, o mapa (com o horizonte arredondado em bytes) diz o mesmo que as
  // janelas de pouso com o horizonte inteiro?
  const ephemeris = computeEphemeris(CHECK_DATE_MS, PERIOD_DAYS * 24, 1)
  const points = Float64Array.from(grid.cells.flatMap(({ point }) => point))
  const flags = evaluateLandingGrid({ horizons, points }, ephemeris, { minWindowHours: MIN_LANDING_WINDOW_HOURS, mastM: HORIZON.mastM })
  let same = 0
  for (const { i, horizon } of exact) {
    const windows = findLandingWindows(computeSeries(horizon, ephemeris), MIN_LANDING_WINDOW_HOURS)
    if ((windows.length > 0 ? 1 : 0) === flags[i]) same++
  }
  const withWindow = flags.reduce((sum, flag) => sum + flag, 0)
  console.log(`OK: ${grid.cells.length} pontos, ${(horizons.length / 1e6).toFixed(2)} MB em public/data/landing-grid/polar.bin`)
  console.log(`OK: em 14/11/2026, ${withWindow} pontos têm janela de pouso (${((100 * withWindow) / flags.length).toFixed(1)}%)`)
  console.log(`OK: o mapa e as janelas com o horizonte inteiro concordam em ${same} de ${exact.length} pontos da amostra`)
}

await main()

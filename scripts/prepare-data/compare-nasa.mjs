/* Compara o nosso horizonte, com os arquivos de relevo do site (public/data/relief/), com o Sol e a
 * Terra que a NASA calculou (nasa-reference.json, de Mazarico et al. 2011).
 *
 * É a prova de que os recortes e os números de src/engine/config.js estão certos: as contas do
 * motor os testes de src/engine/ já provam, com relevo inventado. Rode de novo sempre que os
 * recortes ou o config.js mudarem, e anote o resultado no card E1 do backlog.
 *
 * Rodar da raiz do repositório: node scripts/prepare-data/compare-nasa.mjs (leva cerca de 1 min).
 * Para conferir uma escolha do config.js sem mudar o arquivo: --mast=0 troca a altura do
 * observador, e --directions=720 o número de direções do horizonte.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { HORIZON } from '../../src/engine/config.js'
import { computeEphemeris } from '../../src/engine/ephemeris.js'
import { polarXYToUnit, unitToLatLon } from '../../src/engine/geometry.js'
import { computeHorizon } from '../../src/engine/horizon.js'
import { loadReliefLayers } from '../../src/engine/reliefFiles.js'
import { computeSeries } from '../../src/engine/series.js'

const ROOT = process.cwd()
const RELIEF = join(ROOT, 'public', 'data', 'relief')
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const readRelief = async (path) => {
  const bytes = await readFile(join(RELIEF, path))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

const options = { ...HORIZON }
for (const arg of process.argv.slice(2)) {
  const [, key, value] = arg.match(/^--(mast|directions)=(\d+(?:\.\d+)?)$/) ?? []
  if (!key || (key === 'directions' && !Number.isInteger(Number(value)))) {
    throw new Error(`opção que o script não conhece: ${arg} (use --mast=N, em metros, ou --directions=N)`)
  }
  options[key === 'mast' ? 'mastM' : 'directions'] = Number(value)
}
const changed = process.argv.length > 2 ? ', trocado na linha de comando' : ', o do config.js'
console.log(`mastro de ${options.mastM} m e ${options.directions} direções${changed}`)

const manifest = await readJson(join(RELIEF, 'manifest.json'))
const reference = await readJson(join(ROOT, 'scripts', 'prepare-data', 'nasa-reference.json'))

// Os mapas da NASA são a média de um ciclo de 18,6 anos, hora a hora; o nosso também.
const HOURS = Math.round(18.6 * 365.25 * 24)
let t = Date.now()
const ephemeris = computeEphemeris(Date.UTC(2026, 0, 1), HOURS, 1)
console.log(`posições do Sol e da Terra: ${HOURS} horas em ${((Date.now() - t) / 1000).toFixed(1)} s`)

t = Date.now()
const cache = new Map()
const rows = []
for (const p of reference.points) {
  const point = polarXYToUnit(p.x, p.y)
  const horizon = computeHorizon(await loadReliefLayers(manifest, point, readRelief, cache), point, options)
  const series = computeSeries(horizon, ephemeris)
  let sun = 0
  let earth = 0
  for (let i = 0; i < series.count; i++) {
    sun += series.sunFraction[i]
    if (series.earthMarginDeg[i] > 0) earth++
  }
  rows.push({ ...p, oursSun: sun / series.count, oursEarth: earth / series.count, point })
}
console.log(`${rows.length} pontos em ${((Date.now() - t) / 1000).toFixed(0)} s\n`)

const pct = (v) => `${(v * 100).toFixed(1)}%`.padStart(6)
const pts = (v) => {
  const text = Math.abs(v * 100).toFixed(1)
  return `${text === '0.0' ? '' : v > 0 ? '+' : '−'}${text}`.padStart(5)
}

console.log('Os 10 pontos mais iluminados do mapa da NASA (Sol; Terra), NASA → nosso (diferença em pontos):')
rows
  .filter((r) => r.group === 'top')
  .forEach((r, i) => {
    const { lat, lon } = unitToLatLon(r.point)
    const where = `${Math.abs(lat).toFixed(3)}°S ${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'O' : 'L'}`
    console.log(
      `  ${String(i + 1).padStart(2)}  ${where.padEnd(19)} Sol ${pct(r.sun)} → ${pct(r.oursSun)} (${pts(r.oursSun - r.sun)})` +
        `   Terra ${pct(r.earth)} → ${pct(r.oursEarth)} (${pts(r.oursEarth - r.earth)})`,
    )
  })

function summary(label, group, key, oursKey) {
  const d = group.map((r) => r[oursKey] - r[key])
  const bias = d.reduce((a, b) => a + b, 0) / d.length
  const mae = d.reduce((a, b) => a + Math.abs(b), 0) / d.length
  const within = d.filter((v) => Math.abs(v) <= 0.05).length / d.length
  console.log(
    `  ${label.padEnd(36)} ${String(d.length).padStart(3)} pontos · erro médio ${(mae * 100).toFixed(1)} pts · ` +
      `viés ${pts(bias)} · até 5 pts: ${(within * 100).toFixed(0)}%`,
  )
}

console.log('\nSorteio por faixa de Sol (diferença média, em pontos percentuais):')
for (const [group, map] of [['85-90', 'mapa de 60 m'], ['84-85', 'mapa de 240 m']]) {
  const g = rows.filter((r) => r.group === group)
  summary(`${group}°S, ${map}, Sol`, g, 'sun', 'oursSun')
  summary(`${group}°S, ${map}, Sol onde NASA >= 50%`, g.filter((r) => r.sun >= 0.5), 'sun', 'oursSun')
  summary(`${group}°S, ${map}, Terra`, g, 'earth', 'oursEarth')
}
console.log(`\nOK: comparação com a NASA feita em ${rows.length} pontos`)

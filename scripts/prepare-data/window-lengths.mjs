/* Quanto duram as janelas de pouso nos pontos de comparação com a NASA (nasa-reference.json), com o
 * relevo do site. Serve para escolher MIN_LANDING_WINDOW_HOURS (src/engine/config.js): com um mínimo
 * alto demais, a lista de janelas do painel fica vazia em quase todo ponto.
 *
 * Para cada ponto, a janela mais longa (Sol e Terra à vista ao mesmo tempo) em 30 dias e em 365 dias
 * a partir de 14/11/2026, o primeiro dia do hackathon; janela cortada no fim do período conta só a
 * parte de dentro. Os grupos são os da comparação com a NASA: os 10 pontos mais iluminados e os
 * dois sorteios por faixa de Sol, que têm de propósito tanto ponto claro quanto escuro.
 *
 * Rodar da raiz do repositório: node scripts/prepare-data/window-lengths.mjs (leva menos de 1 min).
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { HORIZON } from '../../src/engine/config.js'
import { computeEphemeris } from '../../src/engine/ephemeris.js'
import { polarXYToUnit } from '../../src/engine/geometry.js'
import { computeHorizon } from '../../src/engine/horizon.js'
import { loadReliefLayers } from '../../src/engine/reliefFiles.js'
import { computeSeries, findLandingWindows } from '../../src/engine/series.js'

const ROOT = process.cwd()
const RELIEF = join(ROOT, 'public', 'data', 'relief')
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const readRelief = async (path) => {
  const bytes = await readFile(join(RELIEF, path))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

const manifest = await readJson(join(RELIEF, 'manifest.json'))
const reference = await readJson(join(ROOT, 'scripts', 'prepare-data', 'nasa-reference.json'))

const PERIODS = [30, 365]
const THRESHOLDS = [24, 72, 144]
const ephemeris = computeEphemeris(Date.UTC(2026, 10, 14), 365 * 24, 1)

/* A janela mais longa nas primeiras `days` horas da série, em horas. */
function longestWindow(series, days) {
  const hours = days * 24
  const part = {
    stepHours: series.stepHours,
    sunFraction: series.sunFraction.subarray(0, hours),
    earthMarginDeg: series.earthMarginDeg.subarray(0, hours),
  }
  return Math.max(0, ...findLandingWindows(part, 0).map((w) => w.endHours - w.startHours))
}

const cache = new Map()
const rows = []
for (const p of reference.points) {
  const point = polarXYToUnit(p.x, p.y)
  const series = computeSeries(computeHorizon(await loadReliefLayers(manifest, point, readRelief, cache), point, HORIZON), ephemeris)
  rows.push({ group: p.group, longest: PERIODS.map((days) => longestWindow(series, days)) })
}

console.log('Pontos com pelo menos uma janela de pouso deste tamanho, a partir de 14/11/2026:')
for (const [group, label] of [['top', 'os 10 mais iluminados'], ['85-90', 'sorteio de 85° a 90°S'], ['84-85', 'sorteio de 84° a 85°S']]) {
  const g = rows.filter((r) => r.group === group)
  PERIODS.forEach((days, k) => {
    const shares = THRESHOLDS.map((h) => `≥ ${h} h: ${String(Math.round((100 * g.filter((r) => r.longest[k] >= h).length) / g.length)).padStart(3)}%`)
    console.log(`  ${label.padEnd(24)} ${String(days).padStart(3)} dias (${String(g.length).padStart(3)} pontos)   ${shares.join('   ')}`)
  })
}
console.log(`\nOK: janelas medidas em ${rows.length} pontos`)

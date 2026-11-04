/* O céu de um ponto no período que a tela mostra, com o relevo do site: o caminho do card E1
 * (horizonte, posição do Sol e da Terra, série hora a hora e resumo) num lugar só, para a ponte
 * (src/hooks/useSiteSky.js) não repetir a ordem nem os parâmetros.
 *
 * Ele guarda o que dá para aproveitar de um pedido para o outro, porque a tela pede de novo a
 * cada troca de ponto ou de data, e a conta trava a página enquanto roda:
 * - o manifest.json, lido uma vez, e o relevo já baixado (o cache de loadReliefLayers);
 * - a última posição do Sol e da Terra, que depende só da data e serve para qualquer ponto;
 * - o último horizonte, que depende só do ponto e serve para qualquer data.
 *
 * readFile(caminho) é a de loadReliefLayers (reliefFiles.js): devolve uma Promise de ArrayBuffer,
 * com o caminho relativo a public/data/relief/, e o manifest.json chega por ela também. No site,
 * ela usa fetch; nos testes, lê do disco. Assim este arquivo não toca na página, e a conta pode ir
 * para um Web Worker sem mudar (card E3).
 */
import { HORIZON, MIN_LANDING_WINDOW_HOURS, PERIOD_DAYS } from './config.js'
import { computeEphemeris } from './ephemeris.js'
import { latLonToUnit } from './geometry.js'
import { computeHorizon } from './horizon.js'
import { loadReliefLayers } from './reliefFiles.js'
import { computeSeries } from './series.js'
import { summarizeSky } from './summary.js'

/* Hora a hora, o mesmo passo da comparação com a NASA (scripts/prepare-data/compare-nasa.mjs). */
const STEP_HOURS = 1
const COUNT = (PERIOD_DAYS * 24) / STEP_HOURS

/* Guarda a Promise, e não o resultado: dois pedidos ao mesmo tempo esperam pela mesma conta. Se
   ela falhar, sai da gaveta, para o pedido seguinte tentar de novo em vez de receber a mesma falha
   para sempre. */
function remember(drawer, key, load) {
  if (drawer.entry === null || drawer.entry.key !== key) {
    const entry = { key, promise: load() }
    drawer.entry = entry
    entry.promise.catch(() => {
      if (drawer.entry === entry) drawer.entry = null
    })
  }
  return drawer.entry.promise
}

export function createSiteSky(readFile) {
  const reliefCache = new Map()
  const manifest = { entry: null }
  const horizon = { entry: null }
  let lastEphemeris = null

  const readManifest = () =>
    remember(manifest, 'manifest.json', async () => JSON.parse(new TextDecoder().decode(await readFile('manifest.json'))))

  /* site: { lat, lon } em graus. startMs: o começo do período, em milissegundos UTC. Devolve o sky
     de "O que a ponte entrega para a tela" (docs/backlog.md). Ponto fora da área com relevo é
     recusado por loadReliefLayers antes de baixar qualquer ladrilho. */
  return async function siteSky({ lat, lon }, startMs) {
    const point = latLonToUnit(lat, lon)
    const manifestData = await readManifest()
    const pointHorizon = await remember(horizon, `${lat} ${lon}`, async () =>
      computeHorizon(await loadReliefLayers(manifestData, point, readFile, reliefCache), point, HORIZON),
    )
    if (lastEphemeris === null || lastEphemeris.startMs !== startMs) {
      lastEphemeris = computeEphemeris(startMs, COUNT, STEP_HOURS)
    }
    return summarizeSky(computeSeries(pointHorizon, lastEphemeris), { minWindowHours: MIN_LANDING_WINDOW_HOURS })
  }
}

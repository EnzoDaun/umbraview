/* O mapa das áreas de pouso, calculado fora da linha principal da página: são uns 4 mil pontos,
 * cada um com o período inteiro hora a hora, e na linha principal a página travaria enquanto a
 * conta roda. A conta é do motor (landingAreas.js); aqui fica só a conversa com a página.
 *
 * A página manda { id, dateMs, baseUrl }: o número do pedido, a data (milissegundos UTC) e a pasta
 * da grade. A resposta é { id, flags, layout, global, elapsedMs } ou { id, error }; global é
 * { flags, layout } da grade da Lua inteira, ou null se o site não tem uma. A grade é lida uma vez
 * e fica guardada para as próximas datas.
 */
import { HORIZON, MIN_LANDING_WINDOW_HOURS, PERIOD_DAYS } from '../engine/config.js'
import { computeEphemeris } from '../engine/ephemeris.js'
import { evaluateLandingGrid } from '../engine/landingAreas.js'
import { loadLandingGrid } from '../engine/landingGridFiles.js'

let grid = null

function gridOf(baseUrl) {
  if (!grid) {
    grid = loadLandingGrid(async (path) => {
      const response = await fetch(baseUrl + path)
      if (!response.ok) throw new Error(`a grade de pouso ${path} não chegou (${response.status})`)
      return response.arrayBuffer()
    })
    // uma leitura que falhou não fica guardada: o próximo pedido tenta de novo
    grid.catch(() => {
      grid = null
    })
  }
  return grid
}

self.onmessage = async ({ data: { id, dateMs, baseUrl } }) => {
  try {
    const { horizons, points, layout, global } = await gridOf(baseUrl)
    const started = performance.now()
    const ephemeris = computeEphemeris(dateMs, PERIOD_DAYS * 24, 1)
    const options = { minWindowHours: MIN_LANDING_WINDOW_HOURS, mastM: HORIZON.mastM }
    const flags = evaluateLandingGrid({ horizons, points }, ephemeris, options)
    const globalResult = global && { flags: evaluateLandingGrid(global, ephemeris, options), layout: global.layout }
    self.postMessage({ id, flags, layout, global: globalResult, elapsedMs: performance.now() - started })
  } catch (error) {
    self.postMessage({ id, error: String(error) })
  }
}

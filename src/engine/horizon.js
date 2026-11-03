/* O horizonte de um ponto: em cada direção, até que ângulo as montanhas sobem.
 *
 * Para cada direção, o motor anda pelo chão em linha reta (um arco de círculo máximo da Lua) e,
 * a cada passo, mede o ângulo de elevação do relevo naquele ponto, com a curvatura da Lua exata.
 * O horizonte naquela direção é o maior ângulo encontrado. O Sol está à vista quando passa acima
 * dele (series.js).
 */
import { MOON_RADIUS_M as R, localFrame } from './geometry.js'

/* layers: as camadas de relevo, da mais fina para a mais grossa, cada uma no formato
   { relief, upToM }: relief é um objeto com sample(x, y, z) (relief.js) e upToM é até que
   distância do ponto a camada vale. A primeira camada também dá a altura do chão no ponto.
   point: o vetor de tamanho 1 do ponto (geometry.js). options: HORIZON, de config.js.

   Uma direção sem nenhum dado de relevo fica com −90°: nada esconde o céu ali. Por isso as
   camadas precisam cobrir toda a distância até options.maxDistanceM em volta do ponto (card E2). */
export function computeHorizon(layers, point, { mastM, directions, maxDistanceM, step }) {
  const frame = localFrame(point)
  const ground = layers[0].relief.sample(point[0], point[1], point[2])
  if (Number.isNaN(ground)) throw new Error('o ponto está fora do relevo carregado')
  const observerHeightM = ground + mastM
  const observerRadius = R + observerHeightM

  // As distâncias, o seno e o cosseno do ângulo de cada uma e a camada que vale em cada uma são
  // os mesmos em todas as direções: calculados uma vez só.
  const distances = []
  for (let s = step(0); s <= maxDistanceM; s += step(s)) distances.push(s)
  const n = distances.length
  const cos = new Float64Array(n)
  const sin = new Float64Array(n)
  const layerAt = new Int8Array(n)
  for (let j = 0; j < n; j++) {
    const angle = distances[j] / R
    cos[j] = Math.cos(angle)
    sin[j] = Math.sin(angle)
    let k = 0
    while (k < layers.length - 1 && distances[j] > layers[k].upToM) k++
    layerAt[j] = k
  }

  const [px, py, pz] = point
  const { north, east } = frame
  const elevationsRad = new Float32Array(directions)
  for (let a = 0; a < directions; a++) {
    // direção no chão: azimute 0 é o norte, crescendo para o leste
    const azimuth = (a * 2 * Math.PI) / directions
    const ca = Math.cos(azimuth)
    const sa = Math.sin(azimuth)
    const tx = ca * north[0] + sa * east[0]
    const ty = ca * north[1] + sa * east[1]
    const tz = ca * north[2] + sa * east[2]
    let best = -Infinity // guarda a tangente da elevação, que cresce junto com o ângulo
    for (let j = 0; j < n; j++) {
      const h = layers[layerAt[j]].relief.sample(px * cos[j] + tx * sin[j], py * cos[j] + ty * sin[j], pz * cos[j] + tz * sin[j])
      if (h !== h) continue // NaN: aquela camada não tem dado ali
      const r = R + h
      const tangent = (r * cos[j] - observerRadius) / (r * sin[j])
      if (tangent > best) best = tangent
    }
    elevationsRad[a] = Math.atan(best)
  }
  return { elevationsRad, point, frame, observerHeightM, directions }
}

/* Elevação do horizonte num azimute qualquer (radianos), em linha reta entre as duas direções
   calculadas mais próximas. Dá a volta: depois da última direção vem a primeira. */
export function horizonElevationAt({ elevationsRad, directions }, azimuthRad) {
  let f = (azimuthRad / (2 * Math.PI)) * directions
  f = ((f % directions) + directions) % directions
  const i = Math.floor(f)
  const t = f - i
  return elevationsRad[i] * (1 - t) + elevationsRad[(i + 1) % directions] * t
}

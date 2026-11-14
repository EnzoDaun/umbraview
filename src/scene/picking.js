/* O clique na Lua e o marcador do ponto escolhido (card C3).
 *
 * Este arquivo não conhece o three nem o React: recebe números e devolve números, para as contas
 * serem testadas no Node, sem WebGL (o mesmo motivo de reliefMesh.js).
 */
import { MOON_RADIUS_M, latLonToUnit, unitToPolarXY } from '../engine/geometry.js'
import { isInsideReliefArea } from '../engine/reliefFiles.js'
import { engineToScene, sceneToLatLon } from './coordinates.js'

/* Quanto o mouse pode andar, em pixels, entre apertar e soltar, para contar como clique. O three
   chama o onClick também no fim de um arrasto para girar a Lua, se ele começou e terminou em cima
   dela; sem este limite, girar a Lua escolheria um ponto toda vez. O React Three Fiber usa 2 para o
   clique que não acerta nada; um pouco mais aqui perdoa a mão que treme no touchpad. */
export const CLICK_MAX_DRAG_PX = 4

/* event: o evento do onClick do React Three Fiber; só usa o point (o ponto atingido, na cena) e o
   delta (quanto o mouse andou desde que foi apertado). manifest: o manifest.json do relevo, ou
   null enquanto ele não chegou.
   Devolve { site: { lat, lon } } para escolher o ponto, { outside: true } para avisar que ele está
   fora da área com relevo, ou null para não fazer nada. Sem o manifesto, a área não é conhecida, e
   o motor também não teria como calcular o ponto: o clique espera ele chegar. */
export function readMoonClick({ point, delta }, manifest) {
  if (delta > CLICK_MAX_DRAG_PX || !manifest) return null
  const site = sceneToLatLon(point)
  return isInsideReliefArea(manifest, site.lat) ? { site } : { outside: true }
}

/* A altura do relevo grosso (far.bin) no pixel onde o ponto cai, em metros acima do raio de
   referência. relief: o { manifest, heights } do useFarRelief, ou null. Fora da grade, ou sem
   relevo, é zero: ali a cena desenha a esfera lisa, de raio 1.
   A malha da cena desliza a altura até zero na borda (reliefMesh.js), mas essa faixa fica por
   volta de 77°S, longe da área que a pessoa escolhe (até 84°S), então aqui ela não entra. */
export function reliefHeightAtM(relief, latDeg, lonDeg) {
  if (!relief) return 0
  const { resolutionM, x0, y0, columns, rows } = relief.manifest.far
  const [px, py] = unitToPolarXY(latLonToUnit(latDeg, lonDeg))
  // a linha 0 é a de cima, a de y maior (o mesmo jeito de buildReliefCap)
  const column = Math.floor((px - x0) / resolutionM)
  const row = Math.floor((y0 - py) / resolutionM)
  if (column < 0 || column >= columns || row < 0 || row >= rows) return 0
  return relief.heights[row * columns + column] * relief.manifest.heightScale
}

/* Onde o marcador fica na cena: na direção do ponto, na altura do relevo. Com a câmera a 35 km do
   polo, desenhar o marcador no raio 1 em vez da altura do relevo o deslocaria na tela, porque as
   montanhas têm alguns quilômetros. site: { lat, lon }, em graus. */
export function markerPosition(site, relief) {
  const radius = 1 + reliefHeightAtM(relief, site.lat, site.lon) / MOON_RADIUS_M
  return engineToScene(latLonToUnit(site.lat, site.lon)).map((v) => v * radius)
}

/* O ponto está do lado da Lua virado para a câmera. O marcador é desenhado por cima de tudo, para
   não sumir atrás de uma montanha do lado; sem esta conta, ele apareceria também através da Lua,
   quando o ponto está do outro lado. point e cameraPosition: [x, y, z] na cena. */
export function isOnNearSide(point, cameraPosition) {
  const toCamera = cameraPosition.map((v, i) => v - point[i])
  return toCamera[0] * point[0] + toCamera[1] * point[1] + toCamera[2] * point[2] > 0
}

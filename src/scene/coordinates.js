/* Ponto da Lua para ponto da cena 3D (cards C2 e C3).
 *
 * A cena usa o y para cima, como o three: y aponta para o polo norte, longitude 0° fica em +x e
 * longitude 90° leste em −z. O motor usa o z para cima (geometry.js), e o ponto (x, y, z) dele é o
 * (x, z, −y) daqui. A luz do Sol (C2) e o marcador do ponto escolhido (C3) passam pelas mesmas
 * funções: se cada um convertesse do seu jeito, o Sol iria para o lado errado da montanha.
 *
 * A volta, de ponto da cena para latitude e longitude, é o clique na Lua (C3).
 */
import { latLonToUnit, unitToLatLon } from '../engine/geometry.js'

export function engineToScene([x, y, z]) {
  return [x, z, -y]
}

/* A volta do engineToScene, sem mudar o tamanho do vetor. O relevo fino (card C6) acha o
   ladrilho embaixo da câmera pela posição dela na cena, e a grade dos ladrilhos está na convenção
   do motor (unitToPolarXY). */
export function sceneToEngine([x, y, z]) {
  return [x, -z, y]
}

/* Graus para o vetor de tamanho 1 da cena: x = cos(lat)·cos(lon), y = sin(lat),
   z = −cos(lat)·sin(lon). Passa pelo latLonToUnit do motor para as duas convenções não se
   separarem com o tempo. */
export function latLonToScene(latDeg, lonDeg) {
  return engineToScene(latLonToUnit(latDeg, lonDeg))
}

/* Graus de um ponto qualquer da cena, de qualquer tamanho: o clique cai na superfície do relevo,
   um pouco acima ou abaixo do raio 1. Dá lat = asin(y) e lon = atan2(−z, x) depois de passar o
   ponto para o tamanho 1; sem isso, o asin de um y maior que 1 daria NaN. */
export function sceneToLatLon([x, y, z]) {
  const length = Math.hypot(x, y, z)
  return unitToLatLon([x / length, -z / length, y / length])
}

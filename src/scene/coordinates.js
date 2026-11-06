/* Ponto da Lua para ponto da cena 3D (cards C2 e C3).
 *
 * A cena usa o y para cima, como o three: y aponta para o polo norte, longitude 0° fica em +x e
 * longitude 90° leste em −z. O motor usa o z para cima (geometry.js), e o ponto (x, y, z) dele é o
 * (x, z, −y) daqui. A luz do Sol (C2) e o marcador do ponto escolhido (C3) passam pelas mesmas
 * funções: se cada um convertesse do seu jeito, o Sol iria para o lado errado da montanha.
 *
 * O C3 acrescenta aqui a volta, de ponto da cena para latitude e longitude.
 */
import { latLonToUnit } from '../engine/geometry.js'

export function engineToScene([x, y, z]) {
  return [x, z, -y]
}

/* Graus para o vetor de tamanho 1 da cena: x = cos(lat)·cos(lon), y = sin(lat),
   z = −cos(lat)·sin(lon). Passa pelo latLonToUnit do motor para as duas convenções não se
   separarem com o tempo. */
export function latLonToScene(latDeg, lonDeg) {
  return engineToScene(latLonToUnit(latDeg, lonDeg))
}

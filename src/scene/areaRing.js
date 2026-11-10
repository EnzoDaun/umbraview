/* O anel que mostra até onde dá para escolher um ponto (card C8).
 *
 * O relevo que a cena desenha vai até uns 77°S, mas só dá para escolher ponto até o areaMaxLatDeg
 * do manifest.json (84°S), onde existe o relevo fino que o motor precisa. Sem o anel, a pessoa
 * clica numa montanha entre os dois e recebe o aviso de fora da área sem entender por quê.
 *
 * Este arquivo não conhece o three nem o React: recebe números e devolve números, para a conta ser
 * testada no Node, sem WebGL (o mesmo motivo de reliefMesh.js e picking.js).
 */
import { MOON_RADIUS_M } from '../engine/geometry.js'
import { latLonToScene } from './coordinates.js'
import { reliefHeightAtM } from './picking.js'

/* Quantos pontos tem a volta. O anel em 84°S tem uns 1.140 km; com 720 pontos, um a cada 1,6 km,
   perto dos 1,9 km entre os vértices da malha do relevo (reliefMesh.js). Com menos, o anel cortaria
   caminho por dentro dos morros; com mais, só gasta pontos que a malha não tem como mostrar. */
export const AREA_RING_SEGMENTS = 720

/* Quanto o anel fica acima do relevo, em metros. A malha desenha um vértice a cada 2 pixels do
   far.bin e liga os vértices em linha reta, então entre dois vértices a superfície desenhada pode
   ficar um pouco acima da altura do pixel; sem esta folga, o anel sumiria dentro das encostas. Mais
   alto que isto, ele flutuaria visivelmente quando a câmera chega perto (35 km). */
export const AREA_RING_LIFT_M = 300

/* relief: o { manifest, heights } do useFarRelief, ou null enquanto ele não chegou. Devolve as
   posições do anel na cena, de 3 em 3 números, num Float32Array (o formato que o three recebe), ou
   null sem relevo: sem o manifesto, o limite da área não é conhecido. */
export function buildAreaRing(relief) {
  if (!relief) return null
  const latDeg = relief.manifest.areaMaxLatDeg
  const positions = new Float32Array(AREA_RING_SEGMENTS * 3)
  for (let i = 0; i < AREA_RING_SEGMENTS; i++) {
    const lonDeg = -180 + (360 * i) / AREA_RING_SEGMENTS
    const radius = 1 + (reliefHeightAtM(relief, latDeg, lonDeg) + AREA_RING_LIFT_M) / MOON_RADIUS_M
    const [x, y, z] = latLonToScene(latDeg, lonDeg)
    positions.set([x * radius, y * radius, z * radius], i * 3)
  }
  return positions
}

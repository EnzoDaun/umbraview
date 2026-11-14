/* Onde a cena põe a luz do Sol (card C2).
 *
 * A luz do three é paralela (directionalLight): só a direção dela conta para iluminar, e a
 * direção é do alvo para a posição. O alvo fica no polo sul, e não no centro da Lua, por causa da
 * sombra: o three desenha a sombra numa caixa em volta do alvo, e com o alvo no polo a caixa
 * cobre só o relevo do C2, com detalhe de umas centenas de metros. Em volta do centro, ela teria
 * que cobrir a Lua inteira, com um detalhe quatro vezes pior.
 */
import { latLonToScene } from './coordinates.js'

export const SUN_TARGET = [0, -1, 0]

/* A distância da luz até o alvo, em raios da Lua. Não muda a luz (ela é paralela); só põe a
   caixa da sombra numa distância conhecida, que é de onde saem o near e o far dela na cena. */
export const SUN_DISTANCE = 2

/* subsolar: { lat, lon }, o ponto onde o Sol está a pino (useSubsolarPoint). A luz vem dessa
   direção, vista do centro da Lua: o Sol está a 150 milhões de km, então visto do polo ele vem
   da mesma direção que visto do centro. */
export function sunLightPosition({ lat, lon }, distance = SUN_DISTANCE) {
  const direction = latLonToScene(lat, lon)
  return SUN_TARGET.map((t, i) => t + direction[i] * distance)
}

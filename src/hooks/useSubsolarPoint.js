/* Onde o Sol está a pino na Lua, na data escolhida: { lat, lon }, em graus. A luz da cena (card
 * C2) sai do centro da Lua na direção deste ponto.
 *
 * Ele não depende do ponto escolhido, e por isso fica fora do useSiteSky: a cena tem a luz antes
 * de alguém escolher um ponto e enquanto a conta do ponto roda. A direção é a do motor
 * (ephemeris.js), conferida contra o SPICE.
 *
 * Sai em latitude e longitude, e não em vetor, porque o x, y, z do motor e o da cena não são os
 * mesmos eixos (geometry.js). A cena converte com a mesma função do marcador do ponto (card C3);
 * um vetor passado direto poria o Sol do lado errado da montanha.
 */
import { useMemo } from 'react'

import { computeEphemeris } from '../engine/ephemeris.js'
import { unitToLatLon } from '../engine/geometry.js'

export function useSubsolarPoint(dateUtc) {
  const ms = dateUtc.getTime()
  // o mesmo objeto enquanto a data não muda: a cena refaz a luz só quando ele troca
  return useMemo(() => {
    const { sunDirection } = computeEphemeris(ms, 1, 1)
    return unitToLatLon([sunDirection[0], sunDirection[1], sunDirection[2]])
  }, [ms])
}

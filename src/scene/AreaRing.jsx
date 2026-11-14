/* O anel que mostra até onde dá para escolher um ponto (card C8): os pontos de areaRing.js virando
 * uma linha na cena.
 *
 * Só uma linha fina, de propósito. Escurecer o relevo de fora da área foi descartado na revisão do
 * PR #9: na tela, ele se confundiria com sombra, que é o assunto do site. A linha não faz nem recebe
 * sombra, e não entra no clique (raycast desligado): sem isso, um clique bem em cima do anel
 * acertaria a linha em vez do relevo, e o React Three Fiber não chamaria o clique da Lua.
 *
 * A linha é uma faixa de triângulos (o Line do Drei), e não a linha comum do three: sem o
 * antisserrilhado (LunarScene.jsx), a linha comum sumia aos pedaços de longe (AREA_RING_WIDTH_PX). */
import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { AREA_RING_WIDTH_PX, buildAreaRing, closeRing } from './areaRing.js'

function ignoreRaycast() {}

/* relief: o { manifest, heights } do useFarRelief. color: a cor do token, lida pela cena. */
export function AreaRing({ relief, color }) {
  // o Line refaz a geometria quando a lista muda: ela só muda com outro relevo. O Line também libera
  // a geometria e o material da placa de vídeo quando sai da cena
  const points = useMemo(() => closeRing(buildAreaRing(relief)), [relief])
  return <Line points={points} color={color} lineWidth={AREA_RING_WIDTH_PX} raycast={ignoreRaycast} />
}

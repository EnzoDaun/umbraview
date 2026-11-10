/* O anel que mostra até onde dá para escolher um ponto (card C8): os pontos de areaRing.js virando
 * uma linha do three.
 *
 * Só uma linha fina, de propósito. Escurecer o relevo de fora da área foi descartado na revisão do
 * PR #9: na tela, ele se confundiria com sombra, que é o assunto do site. A linha não faz nem recebe
 * sombra, e não entra no clique (raycast desligado): sem isso, um clique bem em cima do anel
 * acertaria a linha em vez do relevo, e o React Three Fiber não chamaria o clique da Lua. */
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'

import { buildAreaRing } from './areaRing.js'

function ignoreRaycast() {}

/* relief: o { manifest, heights } do useFarRelief. color: a cor do token, lida pela cena. */
export function AreaRing({ relief, color }) {
  const geometry = useMemo(() => {
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(buildAreaRing(relief), 3))
    return built
  }, [relief])

  // a geometria fica na placa de vídeo até alguém liberar (o mesmo cuidado do ReliefCap)
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <lineLoop geometry={geometry} raycast={ignoreRaycast}>
      <lineBasicMaterial color={color} />
    </lineLoop>
  )
}

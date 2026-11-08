/* O marcador do ponto escolhido na cena (card C3), venha ele do clique ou da lista de locais.
 *
 * É um elemento da página posto sobre o Canvas (o Html do Drei), e não um objeto 3D: fica do mesmo
 * tamanho na tela de perto e de longe, e a cor e o tamanho vêm dos tokens, pelo CSS. Ele é
 * desenhado por cima de tudo, então some quando o ponto passa para o outro lado da Lua
 * (isOnNearSide); uma montanha do lado não esconde ele, o que é de propósito: com a luz rasante
 * do polo, o ponto escolhido muitas vezes está na sombra, e o marcador não pode sumir junto. */
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

import { isOnNearSide, markerPosition } from './picking.js'

/* Abaixo do aviso da cena (--z-overlay, LunarScene.css). O padrão do Drei é um z-index de milhões,
   que poria o marcador por cima do aviso. */
const MARKER_Z_INDEX_RANGE = [1, 0]

/* site: { lat, lon }, em graus. relief: o { manifest, heights } do useFarRelief, ou null enquanto
   ele não chegou; sem ele, o marcador fica no raio 1, e sobe para a altura do relevo quando ele
   chega. */
export function SiteMarker({ site, relief }) {
  const position = useMemo(() => markerPosition(site, relief), [site, relief])
  const dot = useRef(null)

  // a cada quadro, porque a câmera gira; mudar o estilo direto não faz o React desenhar de novo
  useFrame(({ camera }) => {
    if (dot.current) {
      dot.current.style.visibility = isOnNearSide(position, camera.position.toArray()) ? 'visible' : 'hidden'
    }
  })

  return (
    <Html position={position} center pointerEvents="none" zIndexRange={MARKER_Z_INDEX_RANGE}>
      <div ref={dot} className="site-marker" />
    </Html>
  )
}

/* A câmera da vista do sistema: gira em volta do alvo (o Sol ou a Terra) com o mouse e aproxima e afasta com a roda
 * ou a pinça, deslizando até parar, do mesmo jeito da câmera da cena da Lua (CameraRig.jsx). É o
 * CameraControls do Drei, no lugar do OrbitControls: a roda anda em passos suaves, e dá para
 * afastar até a órbita inteira ficar pequena no meio do céu.
 *
 * Só pede quadro enquanto a câmera anda (o próprio CameraControls do Drei chama o invalidate): a
 * vista parada não desenha.
 */
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useEffect, useRef } from 'react'

/* Quanto os controles demoram para alcançar o destino, em segundos: curto, para responder na hora
   (o mesmo tempo da cena da Lua). */
const SMOOTH_S = 0.18

/* Quanto a roda anda por passo, em vezes o padrão dos controles: o zoom vai de perto da Terra até
   o céu virar um aglomerado, quase 400 vezes a distância, e no passo padrão a roda não chegava. */
const DOLLY_SPEED = 2

const ORIGIN = Object.freeze([0, 0, 0])

/* minDistance e maxDistance: os limites do zoom, a partir do alvo. reducedMotion: a pessoa pediu
   menos movimento; a câmera para onde o mouse a deixou, sem deslizar. target: o ponto para onde a
   câmera olha, [x, y, z]; pode mudar a cada quadro (a Terra andando), e a câmera vai junto.
   targetName: qual corpo é o alvo; quando ele troca, a câmera desliza até o novo alvo e vai para
   distance, a distância de onde ele é visto. */
export function ZoomControls({ minDistance, maxDistance, reducedMotion, target = ORIGIN, targetName = '', distance = null }) {
  const controls = useRef(null)
  const lastName = useRef(targetName)
  const [x, y, z] = target

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const switched = lastName.current !== targetName
    lastName.current = targetName
    /* Trocar de alvo desliza até ele. Seguir o mesmo alvo é seco: deslizando, a câmera ficaria
       sempre um pouco atrás da Terra enquanto ela anda. */
    c.moveTo(x, y, z, switched && !reducedMotion)
    if (switched && distance !== null) c.dollyTo(distance, !reducedMotion)
  }, [x, y, z, targetName, distance, reducedMotion])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    // o botão direito e os três dedos arrastariam o alvo para fora do centro; dois dedos só aproximam
    const { ACTION } = CameraControlsImpl
    c.mouseButtons.right = ACTION.NONE
    c.touches.two = ACTION.TOUCH_DOLLY
    c.touches.three = ACTION.NONE
    c.dollySpeed = DOLLY_SPEED
    c.smoothTime = reducedMotion ? 0 : SMOOTH_S
    c.draggingSmoothTime = reducedMotion ? 0 : SMOOTH_S / 2
  }, [reducedMotion])

  return <CameraControls ref={controls} minDistance={minDistance} maxDistance={maxDistance} />
}

/* A câmera da cena: mantém a Lua inteira enquadrada enquanto a pessoa não mexe nela.
 *
 * A conta é de framing.js. O enquadramento é refeito quando a cena muda de tamanho (a janela, ou o
 * celular virando), mas só até a pessoa mexer na câmera ou escolher um ponto: dali em diante, a
 * distância é dela.
 */
import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'

import { fitDistance } from './framing.js'

/* Quanto da menor medida da cena a Lua ocupa: sobra céu em volta para as estrelas e para a borda
   da Lua não encostar na moldura. */
const MOON_FILL = 0.82

/* fitting: se o enquadramento automático ainda vale (LunarScene.jsx decide). */
export function CameraRig({ fitting }) {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const invalidate = useThree((state) => state.invalidate)

  // no useLayoutEffect, para o primeiro quadro já sair com a Lua enquadrada
  useLayoutEffect(() => {
    if (!fitting || width === 0 || height === 0) return
    camera.position.setLength(fitDistance({ fovDeg: camera.fov, aspect: width / height, fill: MOON_FILL }))
    // a câmera muda por fora do React: a cena parada (card C9) não desenharia o quadro novo
    invalidate()
  }, [fitting, camera, width, height, invalidate])

  return null
}

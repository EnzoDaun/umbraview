/* A câmera da cena: mantém a Lua inteira enquadrada enquanto a pessoa não mexe nela, e voa até o
 * ponto escolhido.
 *
 * As contas são de framing.js. O enquadramento é refeito quando a cena muda de tamanho (a janela,
 * ou o celular virando), mas só até a pessoa mexer na câmera ou escolher um ponto: dali em diante, a
 * distância é dela. O voo leva a câmera para cima do ponto escolhido, venha ele do clique ou da
 * lista (o ponto da lista pode estar do outro lado da Lua, fora da vista).
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'

import { latLonToScene } from './coordinates.js'
import { easeInOut, fitDistance, flyPosition } from './framing.js'

/* Quanto da menor medida da cena a Lua ocupa: sobra céu em volta para as estrelas e para a borda
   da Lua não encostar na moldura. */
const MOON_FILL = 0.82

/* O voo: pouco mais de um segundo, o bastante para a pessoa acompanhar para onde a câmera foi, e
   curto o bastante para não esperar por ele. Não é token porque não é animação de CSS. */
const FLY_DURATION_MS = 1100

/* A distância da câmera ao centro da Lua no fim do voo, em raios: perto o bastante para a região
   do ponto ocupar a cena, longe o bastante para se ver onde ele fica na Lua. Se a pessoa já está
   mais perto que isso, a distância dela fica. */
const FLY_DISTANCE = 2.6

/* fitting: se o enquadramento automático ainda vale (LunarScene.jsx decide). site: o ponto
   escolhido, { lat, lon } em graus, ou null. reducedMotion: se a pessoa pediu menos movimento; aí a
   câmera pula para cima do ponto, sem voar. */
export function CameraRig({ fitting, site, reducedMotion }) {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const invalidate = useThree((state) => state.invalidate)
  const flight = useRef(null)

  // no useLayoutEffect, para o primeiro quadro já sair com a Lua enquadrada
  useLayoutEffect(() => {
    if (!fitting || width === 0 || height === 0) return
    camera.position.setLength(fitDistance({ fovDeg: camera.fov, aspect: width / height, fill: MOON_FILL }))
    // a câmera muda por fora do React: a cena parada (card C9) não desenharia o quadro novo
    invalidate()
  }, [fitting, camera, width, height, invalidate])

  const lat = site?.lat
  const lon = site?.lon
  useEffect(() => {
    if (lat === undefined) return
    const from = camera.position.toArray()
    const distance = Math.min(camera.position.length(), FLY_DISTANCE)
    const to = latLonToScene(lat, lon).map((v) => v * distance)
    if (reducedMotion) {
      camera.position.fromArray(to)
      flight.current = null
    } else {
      flight.current = { from, to, startMs: performance.now() }
    }
    invalidate()
  }, [lat, lon, camera, reducedMotion, invalidate])

  /* Um passo do voo a cada quadro. A cena parada só desenha quando pedem (card C9): enquanto o voo
     dura, cada quadro pede o seguinte; quando ele acaba, a cena volta a ficar parada. Os controles
     leem a posição nova da câmera e apontam ela para o centro da Lua. */
  useFrame(() => {
    if (!flight.current) return
    const { from, to, startMs } = flight.current
    const t = Math.min(1, (performance.now() - startMs) / FLY_DURATION_MS)
    camera.position.fromArray(flyPosition(from, to, easeInOut(t)))
    if (t >= 1) flight.current = null
    invalidate()
  })

  return null
}

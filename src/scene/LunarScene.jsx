/* A Lua em 3D (card C1): a esfera, a luz que faz o papel do Sol e a câmera que gira com o mouse.
 * O relevo e a sombra das montanhas são o card C2; o clique para escolher um ponto, o C3.
 *
 * As medidas estão em raios da Lua: a esfera tem raio 1, e as distâncias da câmera e da luz são
 * contadas a partir do centro dela. */
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

import { scene } from '../data/scene.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'
import './LunarScene.css'

/* A câmera começa embaixo da esfera, olhando para o polo sul, que é onde o produto se concentra.
   O 0.01 em z não é enfeite: com a câmera exatamente no eixo y, que é o "para cima" dos controles,
   a direção da câmera e o "para cima" ficam paralelos e a rotação dela fica indefinida. */
const CAMERA_POSITION = [0, -3, 0.01]

/* Com a esfera lisa do C1, 1.2 deixa o polo encher a região sem a câmera encostar na superfície
   (raio 1); mais longe que 6, a Lua vira um ponto na região. O C2 pode mudar o 1.2: se ele escolher
   levar a câmera perto do polo em vez de exagerar a altura (item 4 do card), este limite trava. */
const MIN_DISTANCE = 1.2
const MAX_DISTANCE = 6

/* Direção fixa do Sol até o C2, que troca pela do motor (useSubsolarPoint). De lado em relação à
   câmera, para a linha entre o dia e a noite aparecer no polo. */
const SUN_POSITION = [5, -1, 2]
const SUN_INTENSITY = 2.5

/* Fraco de propósito: só para o lado escuro não sumir no fundo. Forte, ele apagaria a sombra, que
   é o assunto do produto. */
const AMBIENT_INTENSITY = 0.06

// Devagar: é um convite a mexer, não uma animação para assistir.
const AUTO_ROTATE_SPEED = 0.3

/* As cores vêm dos tokens (tokens.css), como toda cor da interface. O three não lê variável de
   CSS, então o valor é lido da página. */
function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function LunarScene() {
  const reducedMotion = usePrefersReducedMotion()
  const moonColor = token('--color-moon')
  const sunlightColor = token('--color-sunlight')

  return (
    <div className="lunar-scene" role="img" aria-label={scene.label}>
      <Canvas camera={{ position: CAMERA_POSITION }}>
        <ambientLight intensity={AMBIENT_INTENSITY} />
        <directionalLight position={SUN_POSITION} intensity={SUN_INTENSITY} color={sunlightColor} />
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial color={moonColor} />
        </mesh>
        <OrbitControls
          enablePan={false}
          minDistance={MIN_DISTANCE}
          maxDistance={MAX_DISTANCE}
          autoRotate={!reducedMotion}
          autoRotateSpeed={AUTO_ROTATE_SPEED}
          enableDamping={!reducedMotion}
        />
      </Canvas>
    </div>
  )
}

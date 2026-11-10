/* A Lua em 3D: a esfera e a câmera que gira com o mouse (card C1), e o relevo do polo sul com a
 * luz do Sol da data escolhida e a sombra das montanhas (card C2), e o clique que escolhe um ponto,
 * com o marcador dele (card C3). O giro sozinho para na primeira vez que a pessoa mexe (card C5).
 *
 * As medidas estão em raios da Lua: a esfera tem raio 1, e as distâncias da câmera e da luz são
 * contadas a partir do centro dela. O relevo está na altura real (reliefMesh.js diz o porquê). */
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { Object3D } from 'three'

import { scene } from '../data/scene.js'
import { useFarRelief } from '../hooks/useFarRelief.js'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'
import { useSubsolarPoint } from '../hooks/useSubsolarPoint.js'
import { useTimedNotice } from '../hooks/useTimedNotice.js'
import { AreaRing } from './AreaRing.jsx'
import { readMoonClick } from './picking.js'
import { ReliefCap } from './ReliefCap.jsx'
import { smoothSphereThetaLength } from './reliefMesh.js'
import { SiteMarker } from './SiteMarker.jsx'
import { SUN_DISTANCE, SUN_TARGET, sunLightPosition } from './sunLight.js'
import './LunarScene.css'

/* A câmera começa embaixo da esfera, olhando para o polo sul, que é onde o produto se concentra.
   O 0.01 em z não é enfeite: com a câmera exatamente no eixo y, que é o "para cima" dos controles,
   a direção da câmera e o "para cima" ficam paralelos e a rotação dela fica indefinida. */
const CAMERA_POSITION = [0, -3, 0.01]

/* Com o relevo na altura real, as montanhas só aparecem de perto: 1.02 deixa a câmera descer a
   uns 35 km do polo, e o pico mais alto do relevo fica a 7 km. Mais longe que 6, a Lua vira um
   ponto na região. */
const MIN_DISTANCE = 1.02
const MAX_DISTANCE = 6

/* O plano mais perto que a câmera desenha. O padrão do three (0.1, ou 174 km) cortaria a
   superfície quando a câmera desce a 35 km dela. O far cobre a Lua inteira vista de longe. */
const CAMERA_NEAR = 0.001
const CAMERA_FAR = 20

const SUN_INTENSITY = 2.5

/* Fraco de propósito: só para o lado escuro não sumir no fundo. Forte, ele apagaria a sombra, que
   é o assunto do produto. */
const AMBIENT_INTENSITY = 0.06

// Devagar: é um convite a mexer, não uma animação para assistir.
const AUTO_ROTATE_SPEED = 0.3

/* A caixa da sombra, em volta do polo (sunLight.js). O relevo vai até uns 0,22 do polo para cada
   lado; 0,25 cobre ele visto de qualquer direção. Com 2048 pixels nesses 0,5, cada pixel da
   sombra tem uns 420 m, menos que os 1,9 km entre os vértices da malha. 2048 é o tamanho que o
   WebGL 2 garante em qualquer placa de vídeo. A profundidade cobre o relevo inteiro em volta da
   distância da luz (SUN_DISTANCE). */
const SHADOW_HALF_SIZE = 0.25
const SHADOW_MAP_SIZE = 2048
const SHADOW_NEAR = SUN_DISTANCE - 0.5
const SHADOW_FAR = SUN_DISTANCE + 0.5

/* No polo, o Sol fica a 1 ou 2 graus do horizonte, e a luz bate quase de raspão. Sem estes
   descontos, a superfície faz sombra nela mesma em listras (o "shadow acne"). Os valores estão em
   raios da Lua: o normalBias afasta a conta uns 350 m da superfície, menos que um pixel da
   sombra. */
const SHADOW_BIAS = -0.00005
const SHADOW_NORMAL_BIAS = 0.0002

/* O tipo de sombra do three. O padrão do React Three Fiber (o PCFSoftShadowMap) saiu do three
   0.186, que troca por este e avisa no console a cada página aberta. */
const SHADOW_TYPE = 'percentage'

/* Quanto tempo o aviso de clique fora da área fica na tela, em milissegundos: o bastante para ler
   uma frase curta sem cobrir a Lua depois disso. Não é token porque não é duração de animação. */
const NOTICE_DURATION_MS = 5000

/* As cores vêm dos tokens (tokens.css), como toda cor da interface. O three não lê variável de
   CSS, então o valor é lido da página. */
function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/* dateUtc: a data da luz (um Date). site: o ponto escolhido, { lat, lon } em graus, ou null; o
   marcador aparece nele. onSelect: chamada com { lat, lon } quando a pessoa clica num ponto da área
   com relevo. Os três vêm do App.jsx. */
export function LunarScene({ dateUtc, site = null, onSelect = () => {} }) {
  const reducedMotion = usePrefersReducedMotion()
  const subsolar = useSubsolarPoint(dateUtc)
  const relief = useFarRelief()
  const moonColor = token('--color-moon')
  const sunlightColor = token('--color-sunlight')
  const [notice, showNotice] = useTimedNotice(NOTICE_DURATION_MS)
  const manifest = relief?.manifest ?? null
  /* Se a pessoa já mexeu na Lua. Sem isto, ela giraria sozinha o tempo todo, sem jeito de parar
     (a WCAG 2.2.2 pede um), e o ponto escolhido sairia andando da frente da pessoa (card C5). */
  const [hasMoved, setHasMoved] = useState(false)

  const sunPosition = useMemo(() => sunLightPosition(subsolar), [subsolar])
  /* O alvo da luz precisa estar na cena para o three saber onde ele fica; solto, ele conta como
     se estivesse no centro, e a caixa da sombra sairia do polo. */
  const sunTarget = useMemo(() => {
    const target = new Object3D()
    target.position.set(...SUN_TARGET)
    return target
  }, [])

  // Com o relevo, a esfera lisa abre um buraco no polo e a malha entra no lugar.
  const sphereThetaLength = relief ? smoothSphereThetaLength(relief.manifest.far.reachM) : Math.PI

  function handleMoonClick(event) {
    /* O raio do clique atravessa a malha do relevo e a esfera lisa por baixo dela, e o React Three
       Fiber chama o grupo uma vez para cada objeto atingido. O primeiro é o que a pessoa vê; os
       outros escolheriam o mesmo ponto de novo. */
    event.stopPropagation()
    const result = readMoonClick({ point: event.point.toArray(), delta: event.delta }, manifest)
    if (!result) return
    if (result.outside) showNotice(scene.outsideArea(Math.abs(manifest.areaMaxLatDeg)))
    else onSelect(result.site)
  }

  /* Os controles chamam isto quando a pessoa aperta o botão esquerdo ou o do meio, usa a roda ou
     toca na tela, inclusive no clique que escolhe um ponto. Com o pan desligado, o botão direito e
     o esquerdo com Ctrl, Shift ou Cmd não chegam aqui (card C5, "Aberto"). O giro desligado não
     volta: voltar sozinho depois de um tempo seria a Lua andando de novo enquanto a pessoa lê o
     ponto. */
  function handleControlsStart() {
    setHasMoved(true)
  }

  return (
    <div className="lunar-scene">
      <div className="lunar-scene__view" role="img" aria-label={scene.label}>
        <Canvas shadows={SHADOW_TYPE} camera={{ position: CAMERA_POSITION, near: CAMERA_NEAR, far: CAMERA_FAR }}>
          <ambientLight intensity={AMBIENT_INTENSITY} />
          <primitive object={sunTarget} />
          <directionalLight
            position={sunPosition}
            target={sunTarget}
            intensity={SUN_INTENSITY}
            color={sunlightColor}
            castShadow
            shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
            shadow-camera-left={-SHADOW_HALF_SIZE}
            shadow-camera-right={SHADOW_HALF_SIZE}
            shadow-camera-top={SHADOW_HALF_SIZE}
            shadow-camera-bottom={-SHADOW_HALF_SIZE}
            shadow-camera-near={SHADOW_NEAR}
            shadow-camera-far={SHADOW_FAR}
            shadow-bias={SHADOW_BIAS}
            shadow-normalBias={SHADOW_NORMAL_BIAS}
          />
          <group onClick={handleMoonClick}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[1, 128, 64, 0, 2 * Math.PI, 0, sphereThetaLength]} />
              {/* O polygonOffset empurra a esfera um pouco para trás na profundidade: na faixa em que
                  ela passa por baixo da borda do relevo, as duas ficam no mesmo raio, e sem isto
                  piscariam disputando o mesmo pixel. */}
              <meshStandardMaterial color={moonColor} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
            </mesh>
            {relief && <ReliefCap relief={relief} color={moonColor} />}
          </group>
          {relief && <AreaRing relief={relief} color={token('--color-text-muted')} />}
          {site && <SiteMarker site={site} relief={relief} />}
          <OrbitControls
            enablePan={false}
            minDistance={MIN_DISTANCE}
            maxDistance={MAX_DISTANCE}
            autoRotate={!reducedMotion && !hasMoved}
            autoRotateSpeed={AUTO_ROTATE_SPEED}
            enableDamping={!reducedMotion}
            onStart={handleControlsStart}
          />
        </Canvas>
      </div>
      {/* Fora do role="img": lá dentro, o leitor de tela trataria o aviso como parte da imagem e
          não leria. O elemento existe desde o começo, vazio, porque o leitor de tela só anuncia a
          mudança de um role="status" que já estava na página. */}
      <p className="lunar-scene__notice" role="status">
        {notice}
      </p>
    </div>
  )
}

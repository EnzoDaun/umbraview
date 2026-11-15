/* A Lua em 3D: a esfera e a câmera que gira com o mouse (card C1), e o relevo do polo sul com a
 * luz do Sol da data escolhida e a sombra das montanhas (card C2), e o clique que escolhe um ponto,
 * com o marcador dele (card C3). O giro sozinho para na primeira vez que a pessoa mexe (card C5)
 * ou quando um ponto é escolhido (card C10), e a cena só desenha quando algo muda (card C9). De
 * perto, o relevo fino aparece em volta do centro da tela, onde a máquina aguenta (card C6).
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
import { CameraRig } from './CameraRig.jsx'
import { latLonToScene } from './coordinates.js'
import { MoonGlobe } from './MoonGlobe.jsx'
import { NearRelief } from './NearRelief.jsx'
import { readMoonClick } from './picking.js'
import { ReliefCap } from './ReliefCap.jsx'
import { visibleHit } from './reliefLayers.js'
import { smoothSphereThetaLength } from './reliefMesh.js'
import { SiteMarker } from './SiteMarker.jsx'
import { StarField } from './StarField.jsx'
import { SUN_DISTANCE, SUN_TARGET, sunLightPosition } from './sunLight.js'
import './LunarScene.css'

/* A câmera começa do lado do polo sul, que é onde o relevo fino e os locais conhecidos estão, mas
   inclinada para o lado da Lua virado para a Terra: assim a primeira tela mostra a Lua inteira, com
   os mares, e o polo embaixo. A distância daqui vale só até o primeiro quadro: o CameraRig acerta
   a distância para a Lua caber na cena, qualquer que seja o formato da tela.
   A câmera nunca fica exatamente no eixo y, que é o "para cima" dos controles: ali a direção dela e
   o "para cima" ficam paralelos e a rotação fica indefinida. */
const CAMERA_START = { latDeg: -52, lonDeg: 12, distance: 4.2 }
const CAMERA_POSITION = latLonToScene(CAMERA_START.latDeg, CAMERA_START.lonDeg).map((v) => v * CAMERA_START.distance)

/* Campo de visão estreito, de teleobjetiva: com o padrão do three (75°), a Lua de perto parece uma
   bola deformada, e as bordas dela fogem. Com 35°, ela parece a Lua vista de longe. */
const CAMERA_FOV = 35

/* Com o relevo na altura real, as montanhas só aparecem de perto: 1.02 deixa a câmera descer a
   uns 35 km do polo, e o pico mais alto do relevo fica a 7 km. O máximo cobre a distância em que a
   Lua inteira cabe numa tela de celular em pé (framing.js): uns 8,5 raios. */
const MIN_DISTANCE = 1.02
const MAX_DISTANCE = 12

/* O plano mais perto que a câmera desenha. O padrão do three (0.1, ou 174 km) cortaria a
   superfície quando a câmera desce a 35 km dela. O far cobre a Lua inteira vista de longe (as
   estrelas não dependem dele: StarField.jsx). */
const CAMERA_NEAR = 0.001
const CAMERA_FAR = 30

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

/* Com a Lua parada, a cena só desenha quando algo muda. Desenhando a cada quadro da tela, ela
   parada custava os mesmos 6 ms por quadro de quando gira, 144 vezes por segundo numa tela de
   144 Hz, gastando bateria sem mudar nada (card C4). Pedem quadro sozinhos: os controles quando a
   pessoa move a câmera, inclusive no deslize depois de soltar o mouse (o OrbitControls do Drei
   chama o invalidate), e o React Three Fiber quando uma prop muda ou um objeto entra na cena (a
   luz de outra data, o relevo que chega, o marcador). O que mudar a cena por fora do React precisa
   pedir o quadro com invalidate().
   Enquanto ela gira sozinha, a cena desenha todo quadro: o passo do giro em cada quadro fica abaixo
   do que os controles contam como mudança, e eles não pedem o quadro seguinte. Só com o 'demand',
   a Lua desenharia um quadro e não sairia do lugar (card C9). */
const FRAME_LOOP_ROTATING = 'always'
const FRAME_LOOP_STILL = 'demand'

/* Quanto tempo o aviso de clique fora da área fica na tela, em milissegundos: o bastante para ler
   uma frase curta sem cobrir a Lua depois disso. Não é token porque não é duração de animação. */
const NOTICE_DURATION_MS = 5000

/* As cores vêm dos tokens (tokens.css), como toda cor da interface. O three não lê variável de
   CSS, então o valor é lido da página. */
function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/* O relevo grosso e o fino juntos (card C6). cover são os ladrilhos do fino desenhados agora, e o
   grosso abre o buraco embaixo deles. O estado mora aqui, dentro do Canvas, e não no LunarScene: o
   Canvas é outra raiz do React, e com o estado lá fora o buraco e os ladrilhos entrariam na tela em
   commits separados, com um quadro de fresta ou de grosso por cima do fino entre os dois. Também
   evita o React refazer o LunarScene inteiro a cada bloco novo. */
function Relief({ relief, color }) {
  const [cover, setCover] = useState([])
  return (
    <>
      <ReliefCap relief={relief} color={color} cover={cover} />
      <NearRelief manifest={relief.manifest} color={color} onCoverChange={setCover} />
    </>
  )
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
  /* Com um ponto escolhido, o giro para, venha ele de onde vier: o Ctrl, Shift ou Cmd+clique não
     avisa o onStart, e a lista de locais (card I2) nem passa pelos controles. Sem o !site, o
     marcador sairia andando com a Lua (card C10). */
  const autoRotate = !reducedMotion && !hasMoved && !site

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
    /* O raio do clique atravessa as malhas do relevo e a esfera lisa por baixo delas, e o React
       Three Fiber chama o grupo uma vez para cada objeto atingido; os outros escolheriam o ponto de
       novo. O acerto que vale é o que a pessoa vê (visibleHit): com o relevo fino (card C6), nem
       sempre é o mais perto, porque o estêncil esconde o grosso e o anel embaixo do fino. */
    event.stopPropagation()
    const hit = visibleHit(event.intersections ?? []) ?? event
    const result = readMoonClick({ point: hit.point.toArray(), delta: event.delta }, manifest)
    if (!result) return
    if (result.outside) showNotice(scene.outsideArea(Math.abs(manifest.areaMaxLatDeg)))
    else onSelect(result.site)
  }

  /* Os controles chamam isto quando a pessoa aperta o botão esquerdo ou o do meio, usa a roda ou
     toca na tela, inclusive no clique que escolhe um ponto. Com o pan desligado, o botão direito e
     o esquerdo com Ctrl, Shift ou Cmd não chegam aqui; o ponto que esse clique escolhe para o giro
     pelo site, no autoRotate (card C10). O giro desligado não volta: voltar sozinho depois de um
     tempo seria a Lua andando de novo enquanto a pessoa lê o ponto. */
  function handleControlsStart() {
    setHasMoved(true)
  }

  return (
    <div className="lunar-scene">
      <div className="lunar-scene__view" role="img" aria-label={scene.label}>
        <Canvas
          frameloop={autoRotate ? FRAME_LOOP_ROTATING : FRAME_LOOP_STILL}
          /* O three cria a tela sem estêncil, e o relevo fino usa ele para ficar por cima do grosso
             (reliefLayers.js). O antisserrilhado (MSAA) que o React Three Fiber liga pinta cada pixel
             uma vez para cada triângulo que encosta nele: na Intel UHD 630, com a janela maximizada,
             o relevo fino ficava no limite dos 60 quadros por segundo e o medidor desligava
             (docs/backlog.md, C6, sétima rodada). Sem ele, a borda da Lua vista de longe e a linha dos
             84°S ficam serrilhadas; de perto, a câmera olha reto para baixo e quase não há borda.
             O resto das opções do React Three Fiber continua igual. */
          gl={{ stencil: true, antialias: false }}
          shadows={SHADOW_TYPE}
          camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV, near: CAMERA_NEAR, far: CAMERA_FAR }}
        >
          {/* O fundo pintado pelo three, e não a cor da página por trás de um canvas transparente:
              as estrelas são semitransparentes, e sobre um canvas transparente a borda delas
              sairia com a mistura errada. */}
          <color attach="background" args={[token('--color-bg')]} />
          <StarField dateUtc={dateUtc} />
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
            <MoonGlobe color={moonColor} thetaLength={sphereThetaLength} far={manifest?.far ?? null} />
            {/* Dentro do grupo do clique também o relevo fino: o grosso tem um buraco embaixo dele,
                e a esfera lisa é aberta no polo; fora do grupo, o clique ali não acharia nada. */}
            {relief && <Relief relief={relief} color={moonColor} />}
          </group>
          {relief && <AreaRing relief={relief} color={token('--color-text-muted')} />}
          {site && <SiteMarker site={site} relief={relief} />}
          {/* o enquadramento automático vale até a pessoa mexer na câmera ou escolher um ponto */}
          <CameraRig fitting={!hasMoved && !site} />
          <OrbitControls
            enablePan={false}
            minDistance={MIN_DISTANCE}
            maxDistance={MAX_DISTANCE}
            autoRotate={autoRotate}
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

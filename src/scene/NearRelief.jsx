/* O relevo fino na cena (card C6): os ladrilhos de 80 m do card E2, em volta do ponto embaixo da
 * câmera, por cima do relevo grosso, e só onde a máquina aguenta.
 *
 * Ele vem em duas camadas (nearTiles.js): o centro, 2 × 2 ladrilhos a cada 400 m, e o anel, 6 × 6
 * ladrilhos a cada 800 m, que cobre a tela inteira na distância mínima e passa por baixo do centro
 * para não sobrar fresta entre os dois. O estêncil decide quem aparece por cima (reliefLayers.js).
 * Nas duas, a luz vem de um mapa de normais com os dados de 80 m (buildNormalMap, em reliefMesh.js):
 * com ele, as crateras aparecem também no anel, e a luz não muda em linha reta na emenda entre dois
 * ladrilhos.
 *
 * Quem decide se a máquina aguenta é o frameBudget.js, em degraus: com o centro e o anel, só com o
 * centro, ou sem nada. Quem decide quais ladrilhos é o nearTiles.js, pela posição da câmera. Este
 * componente junta os dois: baixa os ladrilhos (useNearTiles), monta os mapas e as malhas aos
 * poucos, para a página não travar (um mapa de normais por quadro), e só troca o que aparece numa
 * camada quando o bloco novo dela inteiro chegou e está montado (nearFrameStep). Até lá, o bloco de
 * antes continua na tela, e o relevo fino não pisca na troca. O centro troca sozinho, assim que
 * chega: o anel, com 36 ladrilhos, demoraria nove vezes mais para baixar. O anel só é pedido com o
 * centro da posição de agora na tela (nearRingBlock). O buraco no grosso troca junto
 * (onCoverChange): ele nunca fica com um buraco sem o fino por cima. Um ladrilho que falhou fica
 * de fora, e ali o grosso cobre.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'

import { useNearTiles } from '../hooks/useNearTiles.js'
import { FRAME_LIMIT_MS, createFrameBudget } from './frameBudget.js'
import {
  NEAR_CENTER_MESH,
  NEAR_CENTER_TILES,
  NEAR_LEVELS,
  NEAR_RING_LEVEL,
  NEAR_RING_MESH,
  nearFrameStep,
  nearRingBlock,
  nearTileBlock,
  nearTileGrid,
  sameNames,
} from './nearTiles.js'
import { CENTER_LAYER, RING_LAYER, createLayerMaterial, createNormalTexture } from './reliefLayers.js'
import { buildNormalMap, buildReliefCap, reliefUvs } from './reliefMesh.js'

const MESH_OF_LAYER = { center: NEAR_CENTER_MESH, ring: NEAR_RING_MESH }
const LAYER_OF = { center: CENTER_LAYER, ring: RING_LAYER }

/* As peças montadas de um ladrilho, por chave: o mapa de normais ('map', usado pelas duas camadas)
   e a malha de cada camada ('center' e 'ring'). */
const pieceKey = (name, kind) => `${name}@${kind}`

function buildTileGeometry(grid, layer) {
  const options = MESH_OF_LAYER[layer]
  const { positions, indices } = buildReliefCap(grid, options)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  // onde cada vértice cai no mapa de normais do ladrilho
  geometry.setAttribute('uv', new BufferAttribute(reliefUvs(grid, options), 2))
  geometry.setIndex(new BufferAttribute(indices, 1))
  // a luz vem do mapa de normais, mas a sombra usa a normal do vértice para afastar a conta da
  // superfície (o normalBias de LunarScene.jsx): sem ela, a superfície faria sombra nela mesma
  geometry.computeVertexNormals()
  return geometry
}

// libera da placa de vídeo o que a peça tiver: a malha e o material, ou o mapa
function disposePiece(piece) {
  piece.geometry?.dispose()
  piece.material?.dispose()
  piece.texture?.dispose()
}

const DECISIONS = {
  on: 'relevo fino ligado',
  down: 'relevo fino só no centro (o anel saiu)',
  off: 'relevo fino desligado',
}

// a medição que termina sem mudar nada também vai para o console, para mostrar a folga
const keptMessage = (level) => (level >= NEAR_RING_LEVEL ? 'relevo fino continua ligado' : 'relevo fino continua só no centro')

/* manifest: o manifest.json do relevo. color: a cor da Lua, a mesma do relevo grosso, para a
   emenda não aparecer. onCoverChange(names): chamada com os ladrilhos desenhados agora, nas duas
   camadas, para o relevo grosso abrir o buraco embaixo deles (ReliefCap); com [] quando não há
   nenhum. Ela precisa ser sempre a mesma função (o setState de quem usa), porque está nas
   dependências do efeito. */
export function NearRelief({ manifest, color, onCoverChange }) {
  const invalidate = useThree((state) => state.invalidate)
  const [budget] = useState(() => createFrameBudget({ levels: NEAR_LEVELS }))
  // os ladrilhos que a câmera pede agora, em cada camada (nearTileBlock e nearRingBlock)
  const [centerBlock, setCenterBlock] = useState([])
  const [ringBlock, setRingBlock] = useState([])
  // o que está na tela, em cada camada: [nome, peça] no anel, e [nome, peça, peça do anel] no
  // centro, porque cada ladrilho do centro leva a peça dele do anel por baixo (nearFrameStep)
  const [centerShown, setCenterShown] = useState([])
  const [ringShown, setRingShown] = useState([])
  // as peças montadas, por pieceKey, para não montar duas vezes; só o useFrame e os efeitos leem
  const built = useRef(new Map())
  // quantas medições do medidor já foram para o console
  const loggedMeasurements = useRef(0)
  const centerHeights = useNearTiles(manifest, centerBlock)
  const ringHeights = useNearTiles(manifest, ringBlock)

  useFrame(({ camera, gl }) => {
    const decision = budget.push(performance.now())
    if (budget.measurements !== loggedMeasurements.current) {
      loggedMeasurements.current = budget.measurements
      console.info(
        `NearRelief: ${decision ? DECISIONS[decision] : keptMessage(budget.level)}, média de ` +
          `${budget.averageMs.toFixed(2)} ms entre quadros (o limite é ${FRAME_LIMIT_MS} ms)`,
      )
    }
    // com a cena parada (card C9), ninguém desenharia o quadro que o medidor precisa medir
    if (budget.wantsFrame) invalidate()
    if (decision === 'off') {
      // nada do relevo fino fica na tela, e o grosso fecha o buraco
      setCenterBlock([])
      setCenterShown([])
      setRingBlock([])
      setRingShown([])
      onCoverChange([])
      return
    }
    if (decision === 'down') {
      // desceu um degrau: o anel sai, e o buraco fica só embaixo do centro; a rajada que o medidor
      // abriu sozinho mede o centro sem o anel
      setRingBlock([])
      setRingShown([])
      onCoverChange(centerShown.map(([name]) => name))
      return
    }
    // o estado do medidor, e não um estado do React: no quadro em que ele liga, o bloco já sai
    if (budget.state !== 'on') return

    // os blocos seguem a câmera; com o C9, há quadro justamente quando ela anda
    const position = camera.position.toArray()
    const centerNames = centerShown.map(([name]) => name)
    const ringNames = ringShown.map(([name]) => name)
    const nextCenter = nearTileBlock(manifest, position, NEAR_CENTER_TILES)
    if (!sameNames(nextCenter, centerBlock)) setCenterBlock(nextCenter)
    const nextRing = nearRingBlock(manifest, position, {
      centerBlock,
      centerShown: centerNames,
      centerHeights,
      level: budget.level,
      ring: ringBlock,
    })
    if (!sameNames(nextRing, ringBlock)) setRingBlock(nextRing)

    const step = nearFrameStep({
      center: { block: centerBlock, heights: centerHeights, shown: centerNames },
      ring: { block: ringBlock, heights: ringHeights, shown: ringNames },
      isBuilt: (name, kind) => built.current.has(pieceKey(name, kind)),
    })
    if (step.build.length > 0) {
      for (const [name, kind] of step.build) {
        // a peça do anel de um ladrilho do centro pode vir antes de o anel ser pedido: as alturas
        // são as mesmas nos dois mapas (a memória da página devolve o mesmo Int16Array)
        const grid = nearTileGrid(manifest, name, centerHeights.get(name) ?? ringHeights.get(name))
        if (kind === 'map') {
          const texture = createNormalTexture(buildNormalMap(grid, { start: NEAR_CENTER_MESH.start }))
          /* Manda a textura para a placa de vídeo já neste quadro, o da montagem dela. Sem isto, o
             three manda no primeiro quadro em que ela aparece, e na troca do anel seriam 32
             texturas, uns 16 MB, de uma vez. */
          gl.initTexture(texture)
          built.current.set(pieceKey(name, kind), { texture })
        } else {
          const { texture } = built.current.get(pieceKey(name, 'map'))
          const material = createLayerMaterial(LAYER_OF[kind], color, { normalMap: texture })
          built.current.set(pieceKey(name, kind), { geometry: buildTileGeometry(grid, kind), material })
        }
      }
      // o quadro seguinte sai atrasado pela montagem, que não é o custo de desenhar
      budget.skipNext()
      invalidate()
      return
    }
    if (!step.center && !step.ring) return

    // o bloco novo de uma camada entra na tela de uma vez, e o buraco junto
    const center = step.center ?? centerNames
    const ring = step.ring ?? ringNames
    if (step.center) {
      setCenterShown(
        step.center.map((name) => [name, built.current.get(pieceKey(name, 'center')), built.current.get(pieceKey(name, 'ring'))]),
      )
    }
    if (step.ring) setRingShown(step.ring.map((name) => [name, built.current.get(pieceKey(name, 'ring'))]))
    onCoverChange([...new Set([...center, ...ring])].sort())
    // com o bloco novo na tela, o medidor confere de novo se a máquina aguenta: os ladrilhos somam
    // ao custo de cada quadro, e o primeiro bloco é o que a medição da abertura não viu
    if (center.length + ring.length > 0) {
      budget.recheck()
      invalidate()
    }
  })

  // um ladrilho que chega, ou um bloco novo, não muda nada na tela, e a cena parada (card C9) não
  // desenharia o quadro que monta a malha ou faz a troca: pede o quadro. Também com o mapa vazio:
  // é o bloco que ficou sem ladrilho (a câmera subiu dos 80 km num passo da roda), e sem o quadro
  // o fino ficaria na tela lá de cima, custando à toa, até a pessoa mexer de novo
  useEffect(() => {
    invalidate()
  }, [centerHeights, ringHeights, invalidate])

  // a cor da Lua vem do token: se ela mudar, os materiais já montados mudam junto
  useEffect(() => {
    for (const piece of built.current.values()) piece.material?.color.set(color)
    invalidate()
  }, [color, invalidate])

  // as peças que não estão na tela nem pedidas saem da placa de vídeo; sem isto, cada bloco por
  // onde a câmera passou ficaria lá
  useEffect(() => {
    // o centro guarda as duas malhas de cada ladrilho: a dele e a do anel, que vai por baixo; e
    // todo ladrilho guardado guarda o mapa de normais dele
    const centerTiles = [...centerShown.map(([name]) => name), ...centerBlock]
    const ringTiles = [...ringShown.map(([name]) => name), ...ringBlock]
    const keep = new Set([
      ...centerTiles.flatMap((name) => [pieceKey(name, 'center'), pieceKey(name, 'ring')]),
      ...ringTiles.map((name) => pieceKey(name, 'ring')),
      ...[...centerTiles, ...ringTiles].map((name) => pieceKey(name, 'map')),
    ])
    for (const [key, piece] of built.current) {
      if (!keep.has(key)) {
        disposePiece(piece)
        built.current.delete(key)
      }
    }
  }, [centerShown, ringShown, centerBlock, ringBlock])

  /* Ao sair da cena, o relevo grosso fecha o buraco e as peças saem da placa de vídeo. O que está
     na tela sai junto, para o caso de esta limpeza rodar sem o componente sair (o React do npm run
     dev pode rodar os efeitos de novo numa edição, no Fast Refresh): com as peças liberadas na
     tela e sem o buraco embaixo, o grosso apareceria por cima do fino nas crateras. Com a tela
     vazia, o quadro seguinte monta tudo de novo e troca com o buraco junto. */
  useEffect(() => {
    const pieces = built.current
    return () => {
      onCoverChange([])
      setCenterShown([])
      setRingShown([])
      for (const piece of pieces.values()) disposePiece(piece)
      pieces.clear()
    }
  }, [onCoverChange])

  // o anel na tela: o pedido dele e, embaixo de cada ladrilho do centro, a peça do anel desse
  // ladrilho, mesmo que o anel de agora não chegue até ali
  const centerTiles = new Set(centerShown.map(([name]) => name))
  const ringTiles = new Set(ringShown.map(([name]) => name))
  const ringOnScreen = [
    ...ringShown,
    ...centerShown.filter(([name]) => !ringTiles.has(name)).map(([name, , ringPiece]) => [name, ringPiece]),
  ]
  return (
    <>
      {centerShown.map(([name, piece]) => (
        <mesh
          key={pieceKey(name, 'center')}
          geometry={piece.geometry}
          material={piece.material}
          renderOrder={CENTER_LAYER.renderOrder}
          userData={CENTER_LAYER.userData}
          castShadow
          receiveShadow
        />
      ))}
      {ringOnScreen.map(([name, piece]) => (
        /* Embaixo do centro, o anel só tapa fresta, e não faz sombra: ele é mais liso, e no fundo de
           uma cratera fica acima do centro, então faria sombra nele. O clique escolhe o centro em
           vez dele pela camada (visibleHit, em reliefLayers.js). */
        <mesh
          key={pieceKey(name, 'ring')}
          geometry={piece.geometry}
          material={piece.material}
          renderOrder={RING_LAYER.renderOrder}
          userData={RING_LAYER.userData}
          castShadow={!centerTiles.has(name)}
          receiveShadow
        />
      ))}
    </>
  )
}

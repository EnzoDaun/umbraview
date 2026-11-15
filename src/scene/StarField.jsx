/* O céu de estrelas reais atrás da Lua (contrato C5 da v2): as estrelas do catálogo HYG até a
 * magnitude 6,5, cada uma na direção em que está, com o tamanho pela magnitude e a cor pelo índice
 * B−V (src/engine/starCatalog.js).
 *
 * Um Points só, desenhado no infinito: o shader tira a posição da câmera da conta, então chegar
 * perto da Lua ou afastar não muda as estrelas de lugar, como no céu. Elas não piscam, porque a
 * Lua não tem atmosfera, e nada aqui pede quadro: com a cena parada, nada é desenhado (card C9).
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Matrix4, ShaderMaterial } from 'three'

import { useSkyRotation } from '../hooks/useSkyRotation.js'
import { useStarCatalog } from '../hooks/useStarCatalog.js'
import { ADDITIVE_LIGHT } from './additiveLight.js'
import {
  CLUSTER_SIZE_SCALE, FAR_MAGNITUDE_LIMIT, FAR_SIZE_SCALE, MAGNITUDE_FADE, NEAR_MAGNITUDE_LIMIT, starAnchor,
  starBrightness, starReveal, starSizePx,
} from './starPoints.js'

const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aBrightness;
  attribute float aMagnitude;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uReveal;
  uniform float uNearLimit;
  uniform float uFarLimit;
  uniform float uFade;
  uniform float uFarScale;
  uniform float uAnchor;
  uniform float uShell;
  uniform float uClusterScale;
  varying vec3 vColor;
  varying float vBrightness;
  void main() {
    vColor = aColor;
    // o céu responde ao zoom (starPoints.js): de longe, as estrelas fracas acendem e todas crescem
    float limit = mix( uNearLimit, uFarLimit, uReveal );
    float visibility = smoothstep( limit + uFade, limit - uFade, aMagnitude );
    vBrightness = aBrightness * visibility;
    /* Onde a estrela fica (starPoints.js, starPosition). Com o céu no infinito (uAnchor 0), ela
       anda junto com a câmera: chegar perto da Lua ou afastar não a tira do lugar, como no céu. De
       muito longe (uAnchor 1), ela fica presa numa casca em volta da cena, e a câmera sai de
       dentro do céu: a casca inteira vira um aglomerado pequeno. */
    vec3 skyDirection = ( modelMatrix * vec4( position, 0.0 ) ).xyz;
    vec3 star = cameraPosition * ( 1.0 - uAnchor ) + skyDirection * uShell;
    gl_Position = projectionMatrix * viewMatrix * vec4( star, 1.0 );
    // no fundo da profundidade, um fio antes do corte: a Lua e a Terra ficam sempre na frente
    gl_Position.z = gl_Position.w * 0.999999;
    gl_PointSize = aSize * uPixelRatio * mix( 1.0, uFarScale, uReveal ) * mix( 1.0, uClusterScale, uAnchor );
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;
  void main() {
    // um disco de borda macia, e não o quadrado do ponto
    float distanceToCenter = length( gl_PointCoord - 0.5 );
    float alpha = smoothstep( 0.5, 0.12, distanceToCenter ) * vBrightness;
    gl_FragColor = vec4( vColor * alpha, 1.0 );
    #include <colorspace_fragment>
  }
`

/* Na cena da Lua, a câmera vai de 1 raio da Lua (colada no chão) a dezenas: o céu começa a encher
   quando a Lua inteira cabe na tela e termina com ela pequena. */
const DEFAULT_ZOOM_RANGE = [2.5, 45]

/* Na cena da Lua, o céu fica no infinito até 90 raios (a Lua já é um ponto) e está preso à cena a
   partir de 900: dali até o fim do zoom, a casca de 300 raios encolhe até um aglomerado. */
const DEFAULT_SHELL = Object.freeze({ radius: 300, from: 90, to: 900 })

/* dateUtc: a data do céu (um Date), a mesma da luz da cena. skyMatrix: o giro do céu para a cena,
   quando ela não é o referencial fixo da Lua: os 16 números de uma matriz 4 × 4 em colunas (a
   vista do sistema desenha na eclíptica, que é fixa nas estrelas: ECLIPTIC_SKY_MATRIX, em
   src/engine/system.js). Sem ele, o céu gira com a Lua, na data. zoomRange: [perto, longe], as
   distâncias da câmera ao centro da cena entre as quais o céu vai se revelando (starPoints.js).
   shell: { radius, from, to }, a casca em que as estrelas ficam presas quando a câmera sai de
   dentro do céu, e as distâncias entre as quais elas passam do infinito para a casca. */
export function StarField({ dateUtc, skyMatrix = null, zoomRange = DEFAULT_ZOOM_RANGE, shell = DEFAULT_SHELL }) {
  const catalog = useStarCatalog()
  const rotation = useSkyRotation(dateUtc)
  const pixelRatio = useThree((state) => state.viewport.dpr)

  const geometry = useMemo(() => {
    if (!catalog) return null
    const sizes = new Float32Array(catalog.count)
    const brightness = new Float32Array(catalog.count)
    for (let i = 0; i < catalog.count; i++) {
      sizes[i] = starSizePx(catalog.magnitudes[i])
      brightness[i] = starBrightness(catalog.magnitudes[i])
    }
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(catalog.directions, 3))
    built.setAttribute('aColor', new BufferAttribute(catalog.colors, 3))
    built.setAttribute('aSize', new BufferAttribute(sizes, 1))
    built.setAttribute('aBrightness', new BufferAttribute(brightness, 1))
    built.setAttribute('aMagnitude', new BufferAttribute(catalog.magnitudes, 1))
    return built
  }, [catalog])
  useEffect(() => () => geometry?.dispose(), [geometry])

  /* O material nasce com a densidade de pixels da tela: o tamanho do ponto está em pixels da
     página, e a placa de vídeo conta em pixels do aparelho. Se a janela muda de tela, ele é
     refeito. */
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uPixelRatio: { value: pixelRatio },
          uReveal: { value: 0 },
          uNearLimit: { value: NEAR_MAGNITUDE_LIMIT },
          uFarLimit: { value: FAR_MAGNITUDE_LIMIT },
          uFade: { value: MAGNITUDE_FADE },
          uFarScale: { value: FAR_SIZE_SCALE },
          uAnchor: { value: 0 },
          uShell: { value: shell.radius },
          uClusterScale: { value: CLUSTER_SIZE_SCALE },
        },
        ...ADDITIVE_LIGHT,
      }),
    [pixelRatio, shell.radius],
  )
  useEffect(() => () => material.dispose(), [material])

  // o giro do céu na data: três linhas de rotação, sem posição
  const matrix = useMemo(() => {
    if (skyMatrix) return new Matrix4().fromArray(skyMatrix)
    const [a, b, c, d, e, f, g, h, i] = rotation
    return new Matrix4().set(a, b, c, 0, d, e, f, 0, g, h, i, 0, 0, 0, 0, 1)
  }, [rotation, skyMatrix])

  /* A cada quadro desenhado, e só neles: quem pede quadro é a câmera andando, e com ela parada o
     céu não muda. Mexer direto no uniforme não faz o React desenhar de novo, e não precisa: o
     quadro já está sendo desenhado. */
  const points = useRef(null)
  const [near, far] = zoomRange
  useFrame(({ camera }) => {
    const uniforms = points.current?.material.uniforms
    if (!uniforms) return
    const distance = camera.position.length()
    uniforms.uReveal.value = starReveal(distance, near, far)
    uniforms.uAnchor.value = starAnchor(distance, shell.from, shell.to)
  })

  if (!geometry) return null
  /* frustumCulled desligado: o three decidiria se o céu está na tela pela esfera em volta dos
     pontos, de raio 1 no centro, e sumiria com as estrelas quando a câmera olha para longe da Lua. */
  return (
    <points
      ref={points}
      geometry={geometry}
      material={material}
      matrix={matrix}
      matrixAutoUpdate={false}
      frustumCulled={false}
      renderOrder={-1}
    />
  )
}

/* O céu de estrelas atrás da Lua: as estrelas de verdade, no lugar em que estão na data escolhida
 * (starField.js diz de onde vêm e como giram).
 *
 * É um objeto só, de pontos, desenhado numa passada. As estrelas não piscam: a Lua não tem
 * atmosfera, e piscar pediria um quadro novo o tempo todo com a cena parada (card C9). O céu só
 * muda quando a data muda, e aí o próprio React Three Fiber pede o quadro.
 */
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Matrix4, ShaderMaterial } from 'three'

import { useStars } from '../hooks/useStars.js'
import { skyRotationMatrix, starBrightness, starColor } from './starField.js'

/* Tamanho do ponto na tela, em pixels de CSS: da estrela mais fraca à mais brilhante. Pequeno de
   propósito: estrela é ponto, e disco grande pareceria planeta. */
const MIN_POINT_PX = 1.3
const EXTRA_POINT_PX = 2.4
// A mais fraca ainda aparece, mas apagada: é o que dá profundidade ao céu.
const MIN_OPACITY = 0.3

/* As estrelas ficam "no infinito": o giro da câmera move o céu, e a distância dela à Lua, não. O
   xyww põe cada ponto no plano mais distante que a câmera desenha, atrás da Lua e do relevo, sem
   depender de quanto esse plano vale. */
const VERTEX_SHADER = `
  attribute vec3 aColor;
  attribute float aBrightness;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = aColor;
    vOpacity = ${MIN_OPACITY.toFixed(2)} + ${(1 - MIN_OPACITY).toFixed(2)} * aBrightness;
    vec3 direction = mat3(viewMatrix) * mat3(modelMatrix) * position;
    vec4 clip = projectionMatrix * vec4(direction, 1.0);
    gl_Position = clip.xyww;
    gl_PointSize = (${MIN_POINT_PX.toFixed(2)} + ${EXTRA_POINT_PX.toFixed(2)} * aBrightness * aBrightness) * uPixelRatio;
  }
`

// Um disco de borda macia: sem ela, com o antisserrilhado desligado, a estrela seria um quadrado.
const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float fromCenter = length(gl_PointCoord - 0.5) * 2.0;
    gl_FragColor = vec4(vColor, smoothstep(1.0, 0.25, fromCenter) * vOpacity);
  }
`

/* dateUtc: a data do céu (um Date), a mesma da luz da cena. skyMatrix: os 16 números de outro giro
   do céu, para quem desenha noutro referencial (a vista do sistema, no da eclíptica); sem ele, o céu
   gira para o referencial da Lua na data. */
export function StarField({ dateUtc, skyMatrix = null }) {
  const stars = useStars()
  const pixelRatio = useThree((state) => state.viewport.dpr)

  const geometry = useMemo(() => {
    if (!stars) return null
    const colors = new Float32Array(stars.count * 3)
    const brightness = new Float32Array(stars.count)
    for (let i = 0; i < stars.count; i++) {
      colors.set(starColor(stars.colorIndexes[i]), 3 * i)
      brightness[i] = starBrightness(stars.magnitudes[i])
    }
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(stars.directions, 3))
    built.setAttribute('aColor', new BufferAttribute(colors, 3))
    built.setAttribute('aBrightness', new BufferAttribute(brightness, 1))
    return built
  }, [stars])
  useEffect(() => () => geometry?.dispose(), [geometry])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: { uPixelRatio: { value: 1 } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  const matrix = useMemo(
    () => new Matrix4().fromArray(skyMatrix ?? skyRotationMatrix(dateUtc.getTime())),
    [dateUtc, skyMatrix],
  )

  if (!geometry) return null
  /* frustumCulled desligado: o three decide se desenha pela caixa dos vértices, que aqui são
     direções de tamanho 1 em volta da origem, e esconderia o céu inteiro com a câmera longe. */
  /* O tamanho do pixel da tela vai direto ao uniforme, pela prop: o React Three Fiber aplica e pede
     o quadro, e a cena parada (card C9) desenha com o tamanho novo. */
  return (
    <points
      geometry={geometry}
      material={material}
      material-uniforms-uPixelRatio-value={pixelRatio}
      matrix={matrix}
      matrixAutoUpdate={false}
      frustumCulled={false}
    />
  )
}

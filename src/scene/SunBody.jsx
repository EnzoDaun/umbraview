/* O Sol da vista do sistema, em 3D: uma esfera que brilha por conta própria, mais escura na borda,
 * com um halo em volta.
 *
 * Não usa imagem: o disco é calculado no shader, e nenhuma textura do Sol entra no site. A borda
 * mais escura é a de verdade (a luz da borda do Sol sai de camadas mais altas e mais frias), pela
 * lei linear de escurecimento de borda: o brilho cai de 1 no centro para 1 − u na borda. O valor
 * u = 0,6 é o aproximado para a luz visível; não conferi a fonte do número, e ele só muda o
 * desenho. O halo é uma luz somada ao fundo (additiveLight.js), sem bloom.
 *
 * O Sol não está em escala, como o resto da vista: o de verdade fica uns 390 vezes mais longe que
 * a Lua e é 109 vezes mais largo que a Terra. Só a direção dele é a de verdade.
 */
import { useEffect, useMemo } from 'react'
import { Color, ShaderMaterial } from 'three'

import { ADDITIVE_LIGHT } from './additiveLight.js'

const LIMB_DARKENING = 0.6

/* O halo, em vezes o raio do Sol, e quanto ele soma de luz ao fundo no ponto mais forte. */
const HALO_RADIUS = 2.6
const HALO_STRENGTH = 0.4

const BODY_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vToCamera;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4( position, 1.0 );
    vNormal = normalize( normalMatrix * normal );
    vToCamera = normalize( -viewPosition.xyz );
    gl_Position = projectionMatrix * viewPosition;
  }
`

const BODY_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uLimb;
  varying vec3 vNormal;
  varying vec3 vToCamera;
  void main() {
    // 1 no centro do disco, 0 na borda
    float facing = clamp( dot( normalize( vNormal ), normalize( vToCamera ) ), 0.0, 1.0 );
    gl_FragColor = vec4( uColor * ( 1.0 - uLimb * ( 1.0 - facing ) ), 1.0 );
    #include <colorspace_fragment>
  }
`

/* Um quadrado que olha sempre para a câmera, do tamanho do halo: o shader o vira e apaga a luz do
   centro para a borda. */
const HALO_VERTEX = /* glsl */ `
  uniform float uSize;
  varying vec2 vOffset;
  void main() {
    vOffset = position.xy;
    vec4 center = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
    center.xy += position.xy * uSize;
    gl_Position = projectionMatrix * center;
  }
`

const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vOffset;
  void main() {
    float falloff = pow( max( 0.0, 1.0 - length( vOffset ) ), 2.5 );
    gl_FragColor = vec4( uColor * falloff * uStrength, 1.0 );
    #include <colorspace_fragment>
  }
`

/* position: onde o Sol fica na cena, [x, y, z]. radius: o raio do disco. color: a cor da luz do
   Sol, e haloColor: a do halo; as duas dos tokens, lidas pela cena. */
export function SunBody({ position, radius, color, haloColor }) {
  const body = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: BODY_VERTEX,
        fragmentShader: BODY_FRAGMENT,
        uniforms: { uColor: { value: new Color(color) }, uLimb: { value: LIMB_DARKENING } },
      }),
    [color],
  )
  useEffect(() => () => body.dispose(), [body])

  const halo = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: HALO_VERTEX,
        fragmentShader: HALO_FRAGMENT,
        uniforms: {
          uSize: { value: radius * HALO_RADIUS },
          uColor: { value: new Color(haloColor) },
          uStrength: { value: HALO_STRENGTH },
        },
        ...ADDITIVE_LIGHT,
      }),
    [radius, haloColor],
  )
  useEffect(() => () => halo.dispose(), [halo])

  return (
    <group position={position}>
      <mesh material={body}>
        <sphereGeometry args={[radius, 48, 24]} />
      </mesh>
      {/* frustumCulled desligado: o quadrado tem lado 2 antes de o shader dar o tamanho do halo, e o
          three o tiraria da tela pela caixa pequena dele quando o Sol está na borda */}
      <mesh material={halo} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </group>
  )
}

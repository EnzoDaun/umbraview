/* O véu azul da Terra na vista do sistema: uma casca um pouco maior que ela, que soma luz azul só
 * no lado do dia.
 *
 * Por que existe: o mar da imagem da Terra (o Blue Marble) é azul quase preto. Quando o lado do dia
 * é o Pacífico, a Terra inteira parecia apagada, mesmo com o Sol batendo nela (visto no navegador,
 * 15/11/2026 às 22h39 UTC). O véu faz o papel do ar, que espalha a luz do Sol e deixa a Terra azul
 * clara vista de fora; não conferi um número para esse brilho, e os dois abaixo só mudam o desenho.
 *
 * O Sol continua mandando: o véu acende pela direção dele, some no lado da noite, e a passagem do
 * dia para a noite continua onde a direção do Sol a põe. É luz somada (additiveLight.js): só
 * clareia, nunca cobre os continentes.
 */
import { useMemo } from 'react'
import { Color, Vector3 } from 'three'

import { ADDITIVE_LIGHT } from './additiveLight.js'

// a casca, em vezes o raio da Terra: rente a ela, só o bastante para não brigar com a superfície
const HAZE_RADIUS = 1.02
/* Quanto de luz o véu soma no meio do disco (BASE) e na borda (RIM), onde a linha de visão
   atravessa mais ar. */
const HAZE_BASE = 0.14
const HAZE_RIM = 0.55

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vToCamera;
  void main() {
    // tudo no espaço da cena, que é onde a direção do Sol está
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vNormal = normalize( mat3( modelMatrix ) * normal );
    vToCamera = normalize( cameraPosition - worldPosition.xyz );
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3 uSun;
  uniform vec3 uColor;
  uniform float uBase;
  uniform float uRim;
  varying vec3 vNormal;
  varying vec3 vToCamera;
  void main() {
    vec3 normal = normalize( vNormal );
    // 0 na noite, 1 no dia; a faixa entre os dois é o crepúsculo, que o ar alonga um pouco
    float day = smoothstep( -0.15, 0.45, dot( normal, normalize( uSun ) ) );
    // 0 no meio do disco, 1 na borda
    float rim = pow( 1.0 - clamp( dot( normal, normalize( vToCamera ) ), 0.0, 1.0 ), 3.0 );
    gl_FragColor = vec4( uColor * day * ( uBase + uRim * rim ), 1.0 );
    #include <colorspace_fragment>
  }
`

/* radius: o raio da Terra na cena. sunDirection: a direção do Sol a partir da Terra, [x, y, z].
   color: a cor do véu, do token da Terra, lida pela cena. */
export function EarthHaze({ radius, sunDirection, color }) {
  /* Os uniforms nascem uma vez; a direção do Sol e a cor chegam pelas props do material, que o
     react-three-fiber copia para dentro deles a cada mudança (e pede um quadro novo, porque a cena
     só desenha quando algo muda). */
  const uniforms = useMemo(
    () => ({
      uSun: { value: new Vector3(1, 0, 0) },
      uColor: { value: new Color() },
      uBase: { value: HAZE_BASE },
      uRim: { value: HAZE_RIM },
    }),
    [],
  )
  return (
    <mesh>
      <sphereGeometry args={[radius * HAZE_RADIUS, 48, 24]} />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        uniforms-uSun-value={sunDirection}
        uniforms-uColor-value={color}
        {...ADDITIVE_LIGHT}
      />
    </mesh>
  )
}

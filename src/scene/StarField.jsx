/* O céu de estrelas de verdade em volta da Lua (C5): um único Points, girado para o referencial
 * fixo da Lua na data escolhida (starField.js). As estrelas não piscam, e nada aqui pede quadro
 * contínuo: a cena continua desenhando só quando algo muda (card C9).
 */
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three'

import { moonFixedMatrix } from '../engine/ephemeris.js'
import { STARS_URL, buildStarAttributes } from './starField.js'

const VERTEX = /* glsl */ `
  uniform float pixelRatio;
  attribute float size;
  attribute float mixValue;
  varying float vMix;
  void main() {
    vMix = mixValue;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * pixelRatio;
  }
`

// um disco de borda macia, e não um quadrado: o ponto do WebGL é quadrado
const FRAGMENT = /* glsl */ `
  uniform vec3 hot;
  uniform vec3 cool;
  varying float vMix;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    gl_FragColor = vec4(mix(hot, cool, vMix) * (1.0 - r * r), 1.0);
  }
`

/* dateUtc: a data da cena. hot e cool: as cores dos tokens --color-star-hot e --color-star-cool,
   lidas pela cena. */
export function StarField({ dateUtc, hot, cool }) {
  const invalidate = useThree((state) => state.invalidate)
  const pixelRatio = useThree((state) => state.viewport.dpr)
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(`${import.meta.env.BASE_URL}${STARS_URL}`)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((buffer) => {
        if (alive && buffer) setData(new Float32Array(buffer))
      })
      // sem estrelas a cena continua útil: o fundo fica liso, como antes
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const ms = dateUtc.getTime()
  const geometry = useMemo(() => {
    if (!data) return null
    const { positions, sizes, mixes } = buildStarAttributes(data, moonFixedMatrix(ms))
    const built = new BufferGeometry()
    built.setAttribute('position', new BufferAttribute(positions, 3))
    built.setAttribute('size', new BufferAttribute(sizes, 1))
    built.setAttribute('mixValue', new BufferAttribute(mixes, 1))
    return built
  }, [data, ms])
  useEffect(() => () => geometry?.dispose(), [geometry])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { hot: { value: new Color(hot) }, cool: { value: new Color(cool) }, pixelRatio: { value: pixelRatio } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [hot, cool, pixelRatio],
  )
  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    invalidate()
  }, [geometry, invalidate])

  if (!geometry) return null
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
}

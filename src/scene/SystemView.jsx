/* A vista do sistema: a Terra, a Lua na órbita dela e a direção do Sol, na data escolhida.
 *
 * Mostra de onde vêm os números do resto da tela: a órbita inclinada e oval da Lua, o eixo quase
 * em pé e a face sempre virada para a Terra, balançando com a libração. As posições e as rotações
 * são do motor (src/engine/system.js); os tamanhos e as distâncias não estão em escala, e a tela
 * diz isso.
 *
 * A vista tem um relógio próprio: o cursor e o botão de tocar andam pelo período sem mudar a data
 * do cálculo, porque trocar a data refaz a conta do céu do ponto, e fazer isso a cada quadro
 * travaria a página. A data só muda quando a pessoa pede ("Set as date").
 */
import { Html, Line, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { Matrix4, SRGBColorSpace, Texture } from 'three'

import { systemView } from '../data/systemView.js'
import { PERIOD_DAYS } from '../engine/config.js'
import { ECLIPTIC_SKY_MATRIX, moonOrbitPath, systemStateAt } from '../engine/system.js'
import { formatPercent, formatUtc } from '../panel/format.js'
import { moonImagesOfPage } from './moonImages.js'
import { StarField } from './StarField.jsx'
import './SystemView.css'

const HOUR_MS = 3600e3
const PERIOD_HOURS = PERIOD_DAYS * 24

/* O desenho não está em escala: na escala de verdade, com a Terra deste tamanho, a Lua ficaria 30
   vezes mais longe e teria um quarto do tamanho dela. A distância entre as duas é a de verdade
   multiplicada por um número só, e por isso a órbita mantém a forma oval. */
const UNITS_PER_KM = 2.3 / 384400
const EARTH_RADIUS = 0.36
const MOON_RADIUS = 0.17
const SUN_MARK_FROM = 3.0
const SUN_MARK_TO = 3.5
const LIGHT_DISTANCE = 10

const CAMERA = { position: [0.4, 2.4, 6.4], fov: 35, near: 0.1, far: 60 }
const MIN_DISTANCE = 2
const MAX_DISTANCE = 14
const ORBIT_STEPS = 160
const RING_STEPS = 96
const SUN_INTENSITY = 2.6
const AMBIENT_INTENSITY = 0.08

// Tocando, o período inteiro (30 dias) passa em 24 segundos.
const PLAY_HOURS_PER_SECOND = PERIOD_HOURS / 24

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/* A cor da Lua, a mesma imagem da cena principal. Enquanto não chega, a Lua fica lisa. */
function useMoonColorTexture() {
  const [image, setImage] = useState(null)
  useEffect(() => {
    let current = true
    moonImagesOfPage().then(
      (images) => current && setImage(images.color),
      () => {},
    )
    return () => {
      current = false
    }
  }, [])
  const texture = useMemo(() => {
    if (!image) return null
    const built = new Texture(image)
    built.colorSpace = SRGBColorSpace
    built.needsUpdate = true
    return built
  }, [image])
  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}

// O círculo da distância média da Lua no plano da órbita da Terra: contra ele se vê a órbita da
// Lua subir e descer uns 5°.
const ECLIPTIC_RING = Array.from({ length: RING_STEPS + 1 }, (_, i) => {
  const angle = (i / RING_STEPS) * 2 * Math.PI
  return [Math.cos(angle) * 384400 * UNITS_PER_KM, 0, Math.sin(angle) * 384400 * UNITS_PER_KM]
})

function Bodies({ state, orbit, dateUtc }) {
  const moonTexture = useMoonColorTexture()
  const moonPosition = state.moonKm.map((v) => v * UNITS_PER_KM)
  const moonMatrix = useMemo(
    () => new Matrix4().fromArray(state.moonMatrix).setPosition(...state.moonKm.map((v) => v * UNITS_PER_KM)),
    [state],
  )
  const earthMatrix = useMemo(() => new Matrix4().fromArray(state.earthMatrix), [state])
  const orbitPoints = useMemo(() => orbit.map((point) => point.map((v) => v * UNITS_PER_KM)), [orbit])
  const sun = state.sunDirection

  return (
    <>
      <color attach="background" args={[token('--color-bg')]} />
      <StarField dateUtc={dateUtc} skyMatrix={ECLIPTIC_SKY_MATRIX} />
      <ambientLight intensity={AMBIENT_INTENSITY} />
      <directionalLight position={sun.map((v) => v * LIGHT_DISTANCE)} intensity={SUN_INTENSITY} color={token('--color-sunlight')} />

      {/* A Terra, com o eixo dela: a grade por cima mostra a rotação, uma volta por dia. */}
      <group matrix={earthMatrix} matrixAutoUpdate={false}>
        <mesh>
          <sphereGeometry args={[EARTH_RADIUS, 48, 24]} />
          <meshStandardMaterial color={token('--color-earth')} />
        </mesh>
        <mesh>
          <sphereGeometry args={[EARTH_RADIUS * 1.003, 12, 6]} />
          <meshBasicMaterial color={token('--color-bg')} wireframe transparent opacity={0.35} />
        </mesh>
        <Line points={[[0, -EARTH_RADIUS * 1.6, 0], [0, EARTH_RADIUS * 1.6, 0]]} color={token('--color-text-muted')} lineWidth={1} />
      </group>
      <Html position={[0, -EARTH_RADIUS * 1.9, 0]} center pointerEvents="none" zIndexRange={[1, 0]}>
        <span className="system-view__tag">{systemView.earth}</span>
      </Html>

      {/* A Lua, virada como ela está: a mesma face para a Terra, a menos da libração. */}
      <group matrix={moonMatrix} matrixAutoUpdate={false}>
        <mesh>
          <sphereGeometry args={[MOON_RADIUS, 48, 24]} />
          <meshStandardMaterial key={moonTexture ? 'textured' : 'plain'} color={moonTexture ? '#ffffff' : token('--color-moon')} map={moonTexture} />
        </mesh>
        <Line points={[[0, -MOON_RADIUS * 1.7, 0], [0, MOON_RADIUS * 1.7, 0]]} color={token('--color-text-muted')} lineWidth={1} />
      </group>
      <Html position={[moonPosition[0], moonPosition[1] - MOON_RADIUS * 2.2, moonPosition[2]]} center pointerEvents="none" zIndexRange={[1, 0]}>
        <span className="system-view__tag">{systemView.moon}</span>
      </Html>

      <Line points={orbitPoints} color={token('--color-text-secondary')} lineWidth={1.5} />
      <Line points={ECLIPTIC_RING} color={token('--color-border-control')} lineWidth={1} dashed dashSize={0.06} gapSize={0.06} />

      {/* O Sol fica 400 vezes mais longe que a Lua: aqui só a direção dele. */}
      <Line points={[sun.map((v) => v * SUN_MARK_FROM), sun.map((v) => v * SUN_MARK_TO)]} color={token('--color-sun')} lineWidth={2} />
      <Html position={sun.map((v) => v * (SUN_MARK_TO + 0.25))} center pointerEvents="none" zIndexRange={[1, 0]}>
        <span className="system-view__tag system-view__tag--sun">{systemView.sun}</span>
      </Html>

      <OrbitControls enablePan={false} minDistance={MIN_DISTANCE} maxDistance={MAX_DISTANCE} />
    </>
  )
}

/* dateUtc: a data escolhida (um Date); o relógio da vista começa nela. onDateChange: chamada com
   um Date quando a pessoa pede para o instante da vista virar a data do cálculo. */
export function SystemView({ dateUtc, onDateChange }) {
  const [hour, setHour] = useState(0)
  const [playing, setPlaying] = useState(false)
  const dateMs = dateUtc.getTime() + hour * HOUR_MS
  const state = useMemo(() => systemStateAt(dateMs), [dateMs])
  const orbit = useMemo(() => moonOrbitPath(dateUtc.getTime(), ORBIT_STEPS), [dateUtc])

  // Tocando, o relógio da vista anda sozinho; só começa quando a pessoa aperta o botão.
  useEffect(() => {
    if (!playing) return
    let frame
    let last = performance.now()
    const tick = (now) => {
      const elapsed = (now - last) / 1000
      last = now
      setHour((value) => (value + elapsed * PLAY_HOURS_PER_SECOND) % PERIOD_HOURS)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const wholeHour = Math.floor(hour)

  return (
    <div className="system-view">
      <div className="system-view__scene" role="img" aria-label={systemView.label}>
        <Canvas frameloop="demand" gl={{ antialias: true }} camera={CAMERA}>
          <Bodies state={state} orbit={orbit} dateUtc={dateUtc} />
        </Canvas>
      </div>
      <div className="system-view__controls">
        <button className="system-view__button" type="button" aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>
          {playing ? systemView.pause : systemView.play}
        </button>
        <input
          className="system-view__range"
          type="range"
          min="0"
          max={PERIOD_HOURS - 1}
          step="1"
          value={wholeHour}
          onChange={(event) => {
            setPlaying(false)
            setHour(Number(event.target.value))
          }}
          aria-label={systemView.timeLabel}
          aria-valuetext={formatUtc(new Date(dateMs))}
        />
        <span className="system-view__when">{formatUtc(new Date(dateUtc.getTime() + wholeHour * HOUR_MS))}</span>
        <button
          className="system-view__button"
          type="button"
          disabled={wholeHour === 0}
          onClick={() => onDateChange(new Date(dateUtc.getTime() + wholeHour * HOUR_MS))}
        >
          {systemView.useThisTime}
        </button>
      </div>
      <dl className="system-view__facts">
        <div>
          <dt>{systemView.distance}</dt>
          <dd>{systemView.distanceValue(state.distanceKm)}</dd>
        </div>
        <div>
          <dt>{systemView.phase}</dt>
          <dd>{formatPercent(state.phaseFraction)}</dd>
        </div>
        <div>
          <dt>{systemView.libration}</dt>
          <dd>{systemView.librationValue(state.subEarth)}</dd>
        </div>
      </dl>
      {systemView.notes.map((note) => (
        <p key={note} className="system-view__note">
          {note}
        </p>
      ))}
    </div>
  )
}

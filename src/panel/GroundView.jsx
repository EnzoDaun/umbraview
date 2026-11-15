/* A vista do chão: o contorno do relevo em volta do ponto, em 360°, com o caminho do Sol e da Terra
 * no período por cima. Cheio onde o astro aparece, tracejado onde o relevo esconde: é o que mostra
 * por que o ponto tem ou não tem luz e Terra.
 *
 * Não calcula nada de astronomia: os números chegam do motor (sky.groundView), e as contas de
 * desenho ficam em skyChart.js. O desenho é um SVG esticado para a largura da tela, e por isso os
 * rótulos e os marcadores são elementos da página por cima dele: dentro do SVG esticado, um círculo
 * viraria uma elipse e o texto ficaria achatado.
 */
import { siteSky } from '../data/siteSky.js'
import { formatPercent } from './format.js'
import { bodySegments, chartPosition, elevationRange, horizonAreaPath } from './skyChart.js'
import './GroundView.css'

// O tamanho do desenho, em unidades do SVG: um grau de azimute por unidade na largura.
const WIDTH = 360
const HEIGHT = 100

const percent = (fraction) => `${fraction * 100}%`

function BodyPath({ hours, range, className }) {
  return bodySegments(hours).map((segment, i) => (
    <polyline
      // os pedaços não mudam de ordem enquanto o ponto e a data são os mesmos
      key={i}
      className={`${className} ${segment.visible ? 'ground-view__path--visible' : 'ground-view__path--hidden'}`}
      points={segment.points
        .map(([azimuthDeg, elevationDeg]) => {
          const { x, y } = chartPosition(azimuthDeg, elevationDeg, range)
          return `${x * WIDTH},${y * HEIGHT}`
        })
        .join(' ')}
      vectorEffect="non-scaling-stroke"
    />
  ))
}

function Marker({ hour, range, className }) {
  const { x, y } = chartPosition(hour.azimuthDeg, hour.elevationDeg, range)
  return (
    <span
      className={`ground-view__marker ${className} ${hour.visible ? '' : 'ground-view__marker--hidden'}`}
      style={{ left: percent(x), top: percent(y) }}
    />
  )
}

/* sky: o resultado do motor (docs/backlog.md, "O que a ponte entrega para a tela"). hour: a hora do
   período marcada no gráfico (a da linha do tempo). */
export function GroundView({ sky, hour }) {
  const { groundView } = sky
  const range = elevationRange(groundView)
  const zero = chartPosition(0, 0, range).y
  const label = siteSky.chartLabel({
    sunPercent: formatPercent(sky.sunFraction),
    earthPercent: formatPercent(sky.earthFraction),
    minDeg: range.min,
    maxDeg: range.max,
  })

  return (
    <div className="ground-view">
      <div className="ground-view__plot" role="img" aria-label={label}>
        <svg className="ground-view__svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
          {siteSky.compass.slice(1, -1).map(({ azimuthDeg }) => (
            <line key={azimuthDeg} className="ground-view__grid" x1={azimuthDeg} x2={azimuthDeg} y1="0" y2={HEIGHT} vectorEffect="non-scaling-stroke" />
          ))}
          <path className="ground-view__terrain" d={horizonAreaPath(groundView.horizonDeg, range, WIDTH, HEIGHT)} vectorEffect="non-scaling-stroke" />
          <line className="ground-view__zero" x1="0" x2={WIDTH} y1={zero * HEIGHT} y2={zero * HEIGHT} vectorEffect="non-scaling-stroke" />
          <BodyPath hours={groundView.earth} range={range} className="ground-view__path ground-view__path--earth" />
          <BodyPath hours={groundView.sun} range={range} className="ground-view__path ground-view__path--sun" />
        </svg>
        <Marker hour={groundView.earth[hour]} range={range} className="ground-view__marker--earth" />
        <Marker hour={groundView.sun[hour]} range={range} className="ground-view__marker--sun" />
        <span className="ground-view__tick ground-view__tick--top" aria-hidden="true">{siteSky.degrees(range.max)}</span>
        <span className="ground-view__tick" style={{ top: percent(zero) }} aria-hidden="true">{siteSky.degrees(0)}</span>
        <span className="ground-view__tick ground-view__tick--bottom" aria-hidden="true">{siteSky.degrees(range.min)}</span>
      </div>
      <div className="ground-view__compass" aria-hidden="true">
        {siteSky.compass.map(({ azimuthDeg, label: direction }) => (
          <span key={azimuthDeg} className="ground-view__direction" style={{ left: percent(azimuthDeg / 360) }}>
            {direction}
          </span>
        ))}
      </div>
    </div>
  )
}

import { useMemo } from 'react'

import { Explainer } from '../components/Explainer.jsx'
import { explain } from '../data/explain.js'
import { CHART, horizonChartModel } from './horizonChart.js'
import './HorizonChart.css'

const toPoints = (points) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

/* A vista do horizonte (item 2): o relevo em volta do ponto, de 0° a 360°, e o caminho do Sol e da
   Terra no período, cheio onde aparecem e tracejado onde o relevo esconde. SVG feito pelo React, sem
   biblioteca de gráfico. groundView: o do motor (sky.groundView, summary.js). */
export function HorizonChart({ groundView }) {
  const model = useMemo(() => horizonChartModel(groundView), [groundView])
  const summary = explain.chart.summary({
    highestDeg: model.highestTerrain.elevationDeg,
    highestAzimuthDeg: model.highestTerrain.azimuthDeg,
    sunHours: model.sunVisibleHours,
    earthHours: model.earthVisibleHours,
    totalHours: model.totalHours,
  })

  return (
    <figure className="horizon-chart" data-tour="horizon">
      <figcaption className="horizon-chart__title">{explain.chart.title}</figcaption>
      <svg
        className="horizon-chart__svg"
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
      >
        <line className="horizon-chart__flat" x1="0" x2={CHART.width} y1={model.flatY} y2={model.flatY} />
        <path className="horizon-chart__terrain" d={model.terrainPath} />
        {model.sunSegments.map((segment, i) => (
          <polyline
            key={`sun-${i}`}
            className={`horizon-chart__path horizon-chart__path--sun${segment.visible ? '' : ' is-hidden'}`}
            points={toPoints(segment.points)}
          />
        ))}
        {model.earthSegments.map((segment, i) => (
          <polyline
            key={`earth-${i}`}
            className={`horizon-chart__path horizon-chart__path--earth${segment.visible ? '' : ' is-hidden'}`}
            points={toPoints(segment.points)}
          />
        ))}
        {model.now.sun && <circle className="horizon-chart__now horizon-chart__now--sun" cx={model.now.sun[0]} cy={model.now.sun[1]} r="2.5" />}
        {model.now.earth && <circle className="horizon-chart__now horizon-chart__now--earth" cx={model.now.earth[0]} cy={model.now.earth[1]} r="2.5" />}
      </svg>
      <div className="horizon-chart__axis" aria-hidden="true">
        {explain.chart.directions.map(({ deg, label }) => (
          <span key={deg} style={{ insetInlineStart: `${(deg / 360) * 100}%` }}>
            {label}
          </span>
        ))}
      </div>
      <ul className="horizon-chart__legend" aria-hidden="true">
        <li className="horizon-chart__key horizon-chart__key--terrain">{explain.chart.legendTerrain}</li>
        <li className="horizon-chart__key horizon-chart__key--sun">{explain.chart.legendSun}</li>
        <li className="horizon-chart__key horizon-chart__key--earth">{explain.chart.legendEarth}</li>
        <li className="horizon-chart__key horizon-chart__key--hidden">{explain.chart.legendHidden}</li>
      </ul>
      <Explainer paragraphs={explain.horizon} />
    </figure>
  )
}

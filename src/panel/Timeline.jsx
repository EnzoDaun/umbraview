/* A linha do tempo do período: três faixas (o Sol à vista, a Terra à vista e as janelas de pouso) na
 * mesma régua de horas, e um cursor que anda por elas. O cursor é um <input type="range"> de
 * verdade, por cima das faixas: funciona com o mouse, o toque e as setas do teclado, e o leitor de
 * tela lê a data em que ele está.
 *
 * Andar com o cursor não refaz conta nenhuma: a hora marcada só muda o que a vista do chão destaca.
 * A data do cálculo só muda quando a pessoa pede (SiteSky.jsx).
 */
import { siteSky } from '../data/siteSky.js'
import { formatUtc } from './format.js'
import { visibleRuns, windowRuns } from './skyChart.js'
import './Timeline.css'

const HOUR_MS = 3600e3
const DAY_HOURS = 24
// A altura de cada faixa, em unidades do SVG, e quanto dela o traço ocupa.
const LANE = 1
const RUN_HEIGHT = 0.5

/* sky: o resultado do motor. hour: a hora marcada. onHourChange: chamada com a hora nova. */
export function Timeline({ sky, hour, onHourChange }) {
  const { groundView, period } = sky
  const lastHour = groundView.sun.length - 1
  const lanes = [
    { key: 'sun', label: siteSky.sun, runs: visibleRuns(groundView.sun) },
    { key: 'earth', label: siteSky.earth, runs: visibleRuns(groundView.earth) },
    { key: 'landing', label: siteSky.landingWindows, runs: windowRuns(sky.landingWindows, period) },
  ]
  const days = Array.from({ length: Math.floor(lastHour / DAY_HOURS) }, (_, d) => (d + 1) * DAY_HOURS)
  const dateAt = (h) => new Date(period.startUtc.getTime() + h * HOUR_MS)

  return (
    <div className="timeline">
      <div className="timeline__names" aria-hidden="true">
        {lanes.map((lane) => (
          <span key={lane.key} className={`timeline__name timeline__name--${lane.key}`}>
            {lane.label}
          </span>
        ))}
      </div>
      <div className="timeline__track">
        <svg className="timeline__svg" viewBox={`0 0 ${lastHour} ${lanes.length * LANE}`} preserveAspectRatio="none" aria-hidden="true">
          {days.map((x) => (
            <line key={x} className="timeline__day" x1={x} x2={x} y1="0" y2={lanes.length * LANE} vectorEffect="non-scaling-stroke" />
          ))}
          {lanes.map((lane, i) =>
            lane.runs.map((run) => (
              <rect
                key={`${lane.key}-${run.start}`}
                className={`timeline__run timeline__run--${lane.key}`}
                x={run.start}
                y={i * LANE + (LANE - RUN_HEIGHT) / 2}
                width={Math.min(run.end, lastHour) - run.start}
                height={RUN_HEIGHT}
              />
            )),
          )}
        </svg>
        <input
          className="timeline__range"
          type="range"
          min="0"
          max={lastHour}
          step="1"
          value={hour}
          onChange={(event) => onHourChange(Number(event.target.value))}
          aria-label={siteSky.timelineLabel}
          aria-valuetext={formatUtc(dateAt(hour))}
        />
      </div>
      <div className="timeline__ends" aria-hidden="true">
        <span>{formatUtc(period.startUtc)}</span>
        <span>{formatUtc(period.endUtc)}</span>
      </div>
    </div>
  )
}

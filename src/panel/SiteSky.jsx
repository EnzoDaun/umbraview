/* O céu do ponto escolhido, em desenho: a vista do chão e a linha do tempo, ligadas pela hora
 * marcada. Fica embaixo da cena, de ponta a ponta, porque 360° de horizonte e 30 dias de período
 * pedem largura.
 *
 * Recebe o { status, sky } do useSiteSky, como o painel de números, e mostra o mesmo ponto e o
 * mesmo período que ele.
 */
import { useState } from 'react'

import { siteSky } from '../data/siteSky.js'
import { panel } from '../data/panel.js'
import { HORIZON, MIN_LANDING_WINDOW_HOURS } from '../engine/config.js'
import { formatDegrees, formatUtc } from './format.js'
import { GroundView } from './GroundView.jsx'
import { Timeline } from './Timeline.jsx'
import './SiteSky.css'

const HOUR_MS = 3600e3

function BodyAt({ name, hour, className }) {
  return (
    <span className={`site-sky__body ${className}`}>
      <span className="site-sky__body-name">{name}</span> {hour.visible ? siteSky.inView : siteSky.hidden}{' '}
      <span className="site-sky__number">{formatDegrees(hour.elevationDeg)}</span>
    </span>
  )
}

/* A parte com resultado. Fica num componente à parte para a hora marcada voltar ao começo quando o
   período muda (a key, em SiteSky): a hora 300 de um período não é a hora 300 de outro. Trocar só o
   ponto mantém a hora, e dá para comparar dois pontos no mesmo instante. */
function SiteSkyChart({ sky, onDateChange }) {
  const [selected, setSelected] = useState(0)
  const hour = Math.min(selected, sky.groundView.sun.length - 1)
  const dateAtHour = new Date(sky.period.startUtc.getTime() + hour * HOUR_MS)

  return (
    <>
      <GroundView sky={sky} hour={hour} />
      <Timeline sky={sky} hour={hour} onHourChange={setSelected} />
      <div className="site-sky__readout">
        <span className="site-sky__number site-sky__when">{formatUtc(dateAtHour)}</span>
        <BodyAt name={siteSky.sun} hour={sky.groundView.sun[hour]} className="site-sky__body--sun" />
        <BodyAt name={siteSky.earth} hour={sky.groundView.earth[hour]} className="site-sky__body--earth" />
        {/* na hora 0 a data já é esta: o botão não teria o que fazer */}
        <button className="site-sky__apply" type="button" disabled={hour === 0} onClick={() => onDateChange(dateAtHour)}>
          {siteSky.useThisTime}
        </button>
      </div>
      <details className="site-sky__explain">
        <summary>{siteSky.explainTitle}</summary>
        {siteSky.explain(HORIZON.mastM, MIN_LANDING_WINDOW_HOURS).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </details>
    </>
  )
}

/* status e sky: o resultado do useSiteSky. onDateChange: chamada com um Date quando a pessoa pede
   para a hora marcada virar a data do cálculo. */
export function SiteSky({ status, sky, onDateChange }) {
  if (status === 'ready') {
    return (
      <div className="site-sky">
        <SiteSkyChart key={sky.period.startUtc.getTime()} sky={sky} onDateChange={onDateChange} />
      </div>
    )
  }
  const message = status === 'loading' ? siteSky.loading : status === 'error' ? panel.error : siteSky.empty
  return (
    <div className="site-sky">
      <p className="site-sky__message">{message}</p>
    </div>
  )
}

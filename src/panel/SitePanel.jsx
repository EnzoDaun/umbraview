import { panel } from '../data/panel.js'
import { formatDegrees, formatDuration, formatPercent, formatUtc } from './format.js'
import './SitePanel.css'

/* Os números do ponto escolhido, em texto (card I1). Recebe o { status, sky } do useSiteSky, no
   formato de "O que a ponte entrega para a tela" (docs/backlog.md), e não calcula nada: cada número
   chega pronto do motor e só vira texto aqui.

   O role="status" fica no elemento de fora, que existe em todos os status: o leitor de tela só
   anuncia a mudança de uma região que já estava na página antes de ela mudar. */
export function SitePanel({ status, sky }) {
  return (
    <div className="site-panel" role="status">
      <PanelBody status={status} sky={sky} />
    </div>
  )
}

function PanelBody({ status, sky }) {
  // só o 'ready' mostra números: no 'loading', um sky velho que chegue junto fica de fora
  if (status === 'loading') return <p className="site-panel__message">{panel.loading}</p>
  if (status === 'error') return <p className="site-panel__message">{panel.error}</p>
  if (status !== 'ready') return <p className="site-panel__message">{panel.empty}</p>

  /* elevationDeg negativo com visible: true não é erro: do alto de um morro, o Sol abaixo do plano
     do horizonte ainda pode estar acima das montanhas em volta. Os dois aparecem como chegam. */
  return (
    <dl className="site-panel__list">
      <Row label={panel.sunNow}>
        {sky.sunNow.visible ? panel.visible : panel.hidden}
        {' · '}
        <span className="site-panel__number">{formatDegrees(sky.sunNow.elevationDeg)}</span>
      </Row>
      <Row label={panel.earthNow}>
        {sky.earthNow.visible ? panel.visible : panel.hidden}
        {' · '}
        <span className="site-panel__number">{formatDegrees(sky.earthNow.elevationDeg)}</span>
      </Row>
      {/* entre o agora e o resto: as duas linhas de cima são o primeiro instante do período, e
          as de baixo valem para o período inteiro */}
      <Row label={panel.period}>
        <span className="site-panel__number site-panel__date">{formatUtc(sky.period.startUtc)}</span>
        {' – '}
        <span className="site-panel__number site-panel__date">{formatUtc(sky.period.endUtc)}</span>
      </Row>
      <Row label={panel.nextSunset}>
        {/* o null vem nos dois extremos, Sol sempre à vista e Sol nunca à vista: sunFraction 0 é
            Sol escondido em todas as horas (summary.js), e sem isso o ponto escuro leria "dia" */}
        {sky.nextSunsetUtc ? (
          <span className="site-panel__number">{formatUtc(sky.nextSunsetUtc)}</span>
        ) : sky.sunFraction === 0 ? (
          panel.sunAlwaysHidden
        ) : (
          panel.noSunset
        )}
      </Row>
      <Row label={panel.sunlight}>
        <span className="site-panel__number">{formatPercent(sky.sunFraction)}</span>
      </Row>
      <Row label={panel.longestDark}>
        {/* só o número na monoespaçada: nela o espaço tem a largura de um algarismo e parece duplo */}
        <span className="site-panel__number">{sky.longestDarkHours}</span> {panel.hoursUnit}
      </Row>
      <Row label={panel.landingWindows}>
        {sky.landingWindows.length === 0 ? (
          panel.noWindows
        ) : (
          <ul className="site-panel__windows">
            {sky.landingWindows.map((landingWindow) => (
              <li key={landingWindow.startUtc.getTime()}>
                {/* na frente, para correr o olho pela lista atrás da janela mais longa; o "≥" na
                    cortada pelo período, porque a janela dura mais do que a parte dentro dele */}
                <span className="site-panel__number site-panel__duration">
                  {(landingWindow.startsBeforePeriod || landingWindow.endsAfterPeriod) && '≥ '}
                  {formatDuration(landingWindow.durationHours)}
                </span>
                {' · '}
                <span className="site-panel__number site-panel__date">
                  {formatUtc(landingWindow.startUtc)}
                </span>
                {landingWindow.startsBeforePeriod && ` ${panel.alreadyOpen}`}
                {' – '}
                <span className="site-panel__number site-panel__date">
                  {formatUtc(landingWindow.endUtc)}
                </span>
                {landingWindow.endsAfterPeriod && ` ${panel.continues}`}
              </li>
            ))}
          </ul>
        )}
      </Row>
    </dl>
  )
}

function Row({ label, children }) {
  return (
    <div className="site-panel__row">
      <dt className="site-panel__label">{label}</dt>
      <dd className="site-panel__value">{children}</dd>
    </div>
  )
}

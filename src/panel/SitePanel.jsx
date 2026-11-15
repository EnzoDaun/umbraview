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
      <Row label={panel.sunNow} kind="sun" now>
        {sky.sunNow.visible ? panel.visible : panel.hidden}
        {' · '}
        <span className="site-panel__number">{formatDegrees(sky.sunNow.elevationDeg)}</span>
      </Row>
      <Row label={panel.earthNow} kind="earth" now>
        {sky.earthNow.visible ? panel.visible : panel.hidden}
        {' · '}
        <span className="site-panel__number">{formatDegrees(sky.earthNow.elevationDeg)}</span>
      </Row>
      {/* entre o agora e o resto: as duas linhas de cima são o primeiro instante do período, e
          as de baixo valem para o período inteiro */}
      <Row label={panel.period} kind="wide">
        <span className="site-panel__number site-panel__date">{formatUtc(sky.period.startUtc)}</span>
        {' – '}
        <span className="site-panel__number site-panel__date">{formatUtc(sky.period.endUtc)}</span>
      </Row>
      {!sky.sunNow.visible && sky.nextSunriseUtc && (
        <Row label={panel.nextSunrise} kind="sun">
          <span className="site-panel__number">{formatUtc(sky.nextSunriseUtc)}</span>
        </Row>
      )}
      <Row label={panel.nextSunset} kind="sun">
        {/* o null vem nos dois extremos, Sol sempre à vista e Sol nunca à vista, e sem separar os
            dois o ponto escuro leria "dia". O sunFraction não separa: o motor só chama o Sol de à
            vista com metade do disco, e o sunFraction conta também o Sol que só raspa o relevo
            (summary.js). Escondido agora e sem volta é o Sol que nunca fica à vista no período. */}
        {sky.nextSunsetUtc ? (
          <span className="site-panel__number">{formatUtc(sky.nextSunsetUtc)}</span>
        ) : !sky.sunNow.visible && !sky.nextSunriseUtc ? (
          panel.sunAlwaysHidden
        ) : (
          panel.noSunset
        )}
      </Row>
      <Row label={panel.sunlight} kind="sun">
        <span className="site-panel__number">{formatPercent(sky.sunFraction)}</span>
        <Meter fraction={sky.sunFraction} />
      </Row>
      <Row label={panel.longestDark} kind="sun">
        {/* só o número com os algarismos de largura fixa; a unidade fica na letra normal */}
        <span className="site-panel__number">{sky.longestDarkHours}</span> {panel.hoursUnit}
      </Row>
      {!sky.earthNow.visible && sky.nextEarthriseUtc && (
        <Row label={panel.nextEarthrise} kind="earth">
          <span className="site-panel__number">{formatUtc(sky.nextEarthriseUtc)}</span>
        </Row>
      )}
      <Row label={panel.nextEarthset} kind="earth">
        {/* o null nos dois extremos, separados como no pôr do Sol acima */}
        {sky.nextEarthsetUtc ? (
          <span className="site-panel__number">{formatUtc(sky.nextEarthsetUtc)}</span>
        ) : !sky.earthNow.visible && !sky.nextEarthriseUtc ? (
          panel.earthAlwaysHidden
        ) : (
          panel.noEarthset
        )}
      </Row>
      <Row label={panel.earthInView} kind="earth">
        <span className="site-panel__number">{formatPercent(sky.earthFraction)}</span>
        <Meter fraction={sky.earthFraction} />
      </Row>
      <Row label={panel.landingWindows} kind="wide">
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

/* kind: 'sun' e 'earth' põem a linha na coluna do astro, lado a lado (SitePanel.css); 'wide' ocupa
   as duas. now: as duas linhas do instante escolhido, com mais destaque que as do período. */
function Row({ label, kind, now = false, children }) {
  return (
    <div className={`site-panel__row site-panel__row--${kind}${now ? ' site-panel__row--now' : ''}`}>
      <dt className="site-panel__label">{label}</dt>
      <dd className="site-panel__value">{children}</dd>
    </div>
  )
}

/* A barra de uma porcentagem: o número já está escrito ao lado, então ela é só desenho. A fração vai
   numa variável de CSS, e a barra cresce por transform, sem refazer o layout. */
function Meter({ fraction }) {
  return <span className="site-panel__meter" style={{ '--fraction': fraction }} aria-hidden="true" />
}

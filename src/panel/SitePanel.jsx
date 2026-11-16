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
        {stateText(sky.sunNow)}
        {' · '}
        <span className="site-panel__number">{formatDegrees(sky.sunNow.elevationDeg)}</span>
      </Row>
      <Row label={panel.earthNow} kind="earth" now>
        {stateText(sky.earthNow)}
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
          // abaixo do horizonte o período inteiro (o lado oculto) não é o relevo escondendo
          sky.earthBelowHorizonFraction === 1 ? panel.earthNeverRises : panel.earthAlwaysHidden
        ) : (
          panel.noEarthset
        )}
      </Row>
      <Row label={panel.earthInView} kind="earth">
        <span className="site-panel__number">{formatPercent(sky.earthFraction)}</span>
        <Meter fraction={sky.earthFraction} />
      </Row>
      {/* a resposta do app: o que a pessoa veio procurar fica com destaque próprio, na cor das
          janelas de pouso da linha do tempo e do mapa de áreas */}
      <Row label={panel.landingWindows} kind="wide" landing>
        {sky.landingWindows.length === 0 ? (
          <span className="site-panel__no-window">{panel.noWindows}</span>
        ) : (
          <ul className="site-panel__windows">
            {sky.landingWindows.map((landingWindow) => (
              <li key={landingWindow.startUtc.getTime()} className="site-panel__window">
                {/* na frente, para correr o olho pela lista atrás da janela mais longa; o "≥" na
                    cortada pelo período, porque a janela dura mais do que a parte dentro dele */}
                <span className="site-panel__number site-panel__duration">
                  {(landingWindow.startsBeforePeriod || landingWindow.endsAfterPeriod) && '≥ '}
                  {formatDuration(landingWindow.durationHours)}
                </span>
                {/* o separador some na tela, onde a duração fica em cima e as datas embaixo, mas
                    continua no texto, para o leitor de tela e para quem copia a linha */}
                <span className="site-panel__window-sep">{' · '}</span>
                <span className="site-panel__window-dates">
                  <span className="site-panel__number site-panel__date">
                    {formatUtc(landingWindow.startUtc)}
                  </span>
                  {landingWindow.startsBeforePeriod && ` ${panel.alreadyOpen}`}
                  {' – '}
                  <span className="site-panel__number site-panel__date">
                    {formatUtc(landingWindow.endUtc)}
                  </span>
                  {landingWindow.endsAfterPeriod && ` ${panel.continues}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Row>
      {sky.terrain && (
        <Row label={panel.terrain} kind="wide">
          {sky.terrain.coarse ? panel.terrainCoarse(sky.terrain.metersPerPixel) : panel.terrainFine(sky.terrain.metersPerPixel)}
        </Row>
      )}
    </dl>
  )
}

/* À vista, escondido pelo relevo ou abaixo do horizonte (a noite, o lado oculto, a libração). */
function stateText({ visible, belowHorizon }) {
  if (visible) return panel.visible
  return belowHorizon ? panel.belowHorizon : panel.hidden
}

/* kind: 'sun' e 'earth' põem a linha na coluna do astro, lado a lado (SitePanel.css); 'wide' ocupa
   as duas. now: as duas linhas do instante escolhido, com mais destaque que as do período. landing: a
   linha das janelas de pouso, com o destaque verde (SitePanel.css). */
function Row({ label, kind, now = false, landing = false, children }) {
  const modifiers = `${now ? ' site-panel__row--now' : ''}${landing ? ' site-panel__row--landing' : ''}`
  return (
    <div className={`site-panel__row site-panel__row--${kind}${modifiers}`}>
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

import { explain } from '../data/explain.js'
import { panel } from '../data/panel.js'
import { TERRAIN_GRAZE_DEG } from '../engine/config.js'
import { formatDegrees, formatDuration, formatPercent, formatUtc } from './format.js'
import { HorizonChart } from './HorizonChart.jsx'
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
    <>
      <HorizonChart groundView={sky.groundView} />
      <TerrainNotes notes={sky.notes} />
      <SkyNumbers sky={sky} />
    </>
  )
}

/* As notas embaixo da vista do horizonte: quem decide se cada uma vale é o motor (sky.notes,
   summary.js); aqui a frase só recebe o número. */
function TerrainNotes({ notes }) {
  const lines = []
  if (notes.earthNeverAboveHorizon) lines.push(explain.notes.earthNever)
  else if (notes.earthHiddenByTerrainHours > 0) lines.push(explain.notes.earthHidden(notes.earthHiddenByTerrainHours))
  if (notes.sunNearTerrainHours > 0) lines.push(explain.notes.sunNear(notes.sunNearTerrainHours, TERRAIN_GRAZE_DEG))
  if (lines.length === 0) lines.push(explain.notes.none)
  return (
    <section className="site-panel__notes" aria-label={explain.notes.title}>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  )
}

function SkyNumbers({ sky }) {
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
      {!sky.sunNow.visible && sky.nextSunriseUtc && (
        <Row label={panel.nextSunrise}>
          <span className="site-panel__number">{formatUtc(sky.nextSunriseUtc)}</span>
        </Row>
      )}
      <Row label={panel.nextSunset}>
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
      <Row label={panel.sunlight}>
        <span className="site-panel__number">{formatPercent(sky.sunFraction)}</span>
      </Row>
      <Row label={panel.longestDark}>
        {/* só o número na monoespaçada: nela o espaço tem a largura de um algarismo e parece duplo */}
        <span className="site-panel__number">{sky.longestDarkHours}</span> {panel.hoursUnit}
      </Row>
      {!sky.earthNow.visible && sky.nextEarthriseUtc && (
        <Row label={panel.nextEarthrise}>
          <span className="site-panel__number">{formatUtc(sky.nextEarthriseUtc)}</span>
        </Row>
      )}
      <Row label={panel.nextEarthset}>
        {/* o null nos dois extremos, separados como no pôr do Sol acima */}
        {sky.nextEarthsetUtc ? (
          <span className="site-panel__number">{formatUtc(sky.nextEarthsetUtc)}</span>
        ) : !sky.earthNow.visible && !sky.nextEarthriseUtc ? (
          panel.earthAlwaysHidden
        ) : (
          panel.noEarthset
        )}
      </Row>
      <Row label={panel.earthInView}>
        <span className="site-panel__number">{formatPercent(sky.earthFraction)}</span>
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

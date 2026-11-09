import { panel } from '../data/panel.js'
import './SiteList.css'

/* A lista de locais de pouso (card I2). Um <select> comum, e não uma lista desenhada: ele já
   funciona com teclado e com leitor de tela, e é por ele que quem usa teclado escolhe um ponto (a
   cena não recebe foco, card C3). Os locais chegam por prop: os de verdade vêm de
   src/data/sites.js, e os do teste ficam no teste. */
export function SiteList({ sites, onSelect }) {
  // o Object.groupBy guarda a ordem em que cada agência aparece: quem decide a ordem é o sites.js
  const byAgency = Object.entries(Object.groupBy(sites, (site) => site.agency))

  return (
    <label className="site-list">
      {panel.siteListLabel}
      {/* A primeira opção é um aviso, e não um local: sem ela, o primeiro local já viria escolhido,
          e escolher esse local não dispararia o onChange, porque a lista não mudou. */}
      <select
        className="site-list__select"
        defaultValue=""
        onChange={(event) => onSelect(sites.find((site) => site.id === event.target.value))}
      >
        <option value="" disabled>
          {panel.siteListPlaceholder}
        </option>
        {byAgency.map(([agency, agencySites]) => (
          <optgroup key={agency} label={agency}>
            {agencySites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

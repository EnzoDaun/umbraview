import { panel } from '../data/panel.js'
import './SiteList.css'

/* A lista de locais de pouso (card I2). Um <select> comum, e não uma lista desenhada: ele já
   funciona com teclado e com leitor de tela, e é por ele que quem usa teclado escolhe um ponto (a
   cena não recebe foco, card C3). Os locais chegam por prop: os de verdade vêm de
   src/data/sites.js, e os do teste ficam no teste. */
export function SiteList({ sites, onSelect }) {
  /* Por tipo, e não por agência: com os locais de hoje, agência daria "Intuitive Machines" com 1 e
     "NASA" com 9, e não diria que ninguém pousou nas regiões candidatas (decisão do Enzo, card I2).
     O Object.groupBy guarda a ordem em que cada grupo aparece: quem decide a ordem é o sites.js. */
  const groups = Object.entries(
    Object.groupBy(sites, (site) =>
      site.landedAtUtc ? panel.siteGroupLanded : panel.siteGroupCandidates,
    ),
  )

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
        {groups.map(([groupLabel, groupSites]) => (
          <optgroup key={groupLabel} label={groupLabel}>
            {groupSites.map((site) => (
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

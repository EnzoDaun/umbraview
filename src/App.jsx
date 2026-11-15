import { useState } from 'react'

import { app } from './data/app.js'
import { siteSky } from './data/siteSky.js'
import { sites } from './data/sites.js'
import { useSiteSky } from './hooks/useSiteSky.js'
import { DateTimeControl } from './panel/DateTimeControl.jsx'
import { SiteList } from './panel/SiteList.jsx'
import { SitePanel } from './panel/SitePanel.jsx'
import { SiteSky } from './panel/SiteSky.jsx'
import { LunarScene } from './scene/LunarScene.jsx'
import './App.css'

/* Esqueleto da tela: cabeçalho; à esquerda, a região da cena e, embaixo dela, o céu do ponto em
   desenho (a vista do chão e a linha do tempo, que pedem largura); à direita, o painel do ponto,
   com os controles e os números. Cada região tem o seu componente, para duas pessoas não mexerem
   nas mesmas linhas deste arquivo ao mesmo tempo. */
export default function App() {
  /* A data da luz da cena e do céu do ponto: começa na hora em que a página abriu, e o controle de
     data muda (card E14). É a mesma para os dois, para a sombra da cena e os números do painel
     falarem do mesmo instante. O controle não manda data inválida (DateTimeControl.jsx). */
  const [dateUtc, setDateUtc] = useState(() => new Date())
  /* O ponto escolhido, ou null: pelo clique na cena (card C3) ou pela lista de locais (card E14).
     A cena põe o marcador nele, o painel mostra o céu dele (card E11), e a lista mostra o local
     quando ele veio dela. */
  const [site, setSite] = useState(null)
  const { status, sky } = useSiteSky(site, dateUtc)

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__name">{app.name}</h1>
        <p className="app__tagline">{app.tagline}</p>
      </header>

      <main className="app__main">
        <div className="app__stage">
          <section className="app__scene" aria-labelledby="scene-title">
            <h2 id="scene-title" className="app__region-title app__region-title--over">{app.scene.title}</h2>
            <LunarScene dateUtc={dateUtc} site={site} onSelect={setSite} />
          </section>

          <section className="app__sky" aria-labelledby="sky-title">
            <h2 id="sky-title" className="app__region-title">{siteSky.title}</h2>
            <SiteSky status={status} sky={sky} onDateChange={setDateUtc} />
          </section>
        </div>

        <section className="app__panel" aria-labelledby="panel-title">
          <h2 id="panel-title" className="app__region-title">{app.panel.title}</h2>
          <SiteList sites={sites} selectedId={site?.id} onSelect={setSite} />
          <DateTimeControl dateUtc={dateUtc} onChange={setDateUtc} />
          <SitePanel status={status} sky={sky} />
        </section>
      </main>

      <footer className="app__footer">
        <p>{app.footer}</p>
        <p>
          {app.credits.data}
          {app.credits.separator}
          <a href={app.credits.sourceUrl}>{app.credits.source}</a>
          {app.credits.separator}
          {app.credits.ai}
        </p>
      </footer>
    </div>
  )
}

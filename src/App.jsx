import { useState } from 'react'

import { app } from './data/app.js'
import { useSiteSky } from './hooks/useSiteSky.js'
import { SitePanel } from './panel/SitePanel.jsx'
import { LunarScene } from './scene/LunarScene.jsx'
import './App.css'

/* Esqueleto da tela: cabeçalho, a região da cena (esquerda, maior) e a do painel do ponto
   (direita). Cada frente trabalha dentro da sua região, em componente próprio, para duas
   pessoas não mexerem nas mesmas linhas deste arquivo ao mesmo tempo. */
export default function App() {
  /* A data da luz da cena e do céu do ponto: por enquanto, a hora em que a página abriu. É a mesma
     para os dois, para a sombra da cena e os números do painel falarem do mesmo instante. A ligação
     do controle de data (card E14) troca por um estado que a pessoa muda. */
  const [dateUtc] = useState(() => new Date())
  /* O ponto escolhido com o clique na cena (card C3), ou null. A cena põe o marcador nele, e o
     painel mostra o céu dele (card E11). A lista de locais (card E14) escolhe por este mesmo
     estado. */
  const [site, setSite] = useState(null)
  const { status, sky } = useSiteSky(site, dateUtc)

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__name">{app.name}</h1>
        <p className="app__tagline">{app.tagline}</p>
      </header>

      <main className="app__main">
        <section className="app__scene" aria-labelledby="scene-title">
          <h2 id="scene-title" className="app__region-title">{app.scene.title}</h2>
          <LunarScene dateUtc={dateUtc} site={site} onSelect={setSite} />
        </section>

        <section className="app__panel" aria-labelledby="panel-title">
          <h2 id="panel-title" className="app__region-title">{app.panel.title}</h2>
          <SitePanel status={status} sky={sky} />
        </section>
      </main>

      <footer className="app__footer">
        <p>{app.footer}</p>
      </footer>
    </div>
  )
}

import { app } from './data/app.js'
import { LunarScene } from './scene/LunarScene.jsx'
import './App.css'

/* Esqueleto da tela: cabeçalho, a região da cena (esquerda, maior) e a do painel do ponto
   (direita). Cada frente trabalha dentro da sua região, em componente próprio, para duas
   pessoas não mexerem nas mesmas linhas deste arquivo ao mesmo tempo. */
export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__name">{app.name}</h1>
        <p className="app__tagline">{app.tagline}</p>
      </header>

      <main className="app__main">
        <section className="app__scene" aria-labelledby="scene-title">
          <h2 id="scene-title" className="app__region-title">{app.scene.title}</h2>
          <LunarScene />
        </section>

        <section className="app__panel" aria-labelledby="panel-title">
          <h2 id="panel-title" className="app__region-title">{app.panel.title}</h2>
          <p className="app__empty">{app.panel.empty}</p>
        </section>
      </main>

      <footer className="app__footer">
        <p>{app.footer}</p>
      </footer>
    </div>
  )
}

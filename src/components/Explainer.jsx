import { explain } from '../data/explain.js'
import './Explainer.css'

/* O "What am I seeing?" de cada região (v4 · Explicativo). É um <details>, e não um tooltip: abre
   pelo teclado (Enter ou espaço no resumo), o leitor de tela anuncia aberto e fechado sozinho, e o
   texto entra embaixo, empurrando o resto, sem cobrir o dado que ele explica.
   paragraphs: os parágrafos, de src/data/explain.js. summary: o título, quando não é a pergunta.
   source: { label, url }, a fonte dos números do texto, quando há. */
export function Explainer({ paragraphs, summary = explain.question, source = null, className = '' }) {
  return (
    <details className={`explainer ${className}`.trim()}>
      <summary className="explainer__summary">{summary}</summary>
      <div className="explainer__body">
        {paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
        {source && (
          <p className="explainer__source">
            <a href={source.url}>{source.label}</a>
          </p>
        )}
      </div>
    </details>
  )
}

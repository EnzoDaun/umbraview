/* O bloco que explica o produto, no fim do painel: o problema, o que o site faz e como começar
 * (o texto está em src/data/about.js).
 *
 * É um <details> e não um parágrafo solto: aberto, ele conta a história para quem chega; fechado,
 * sai da frente de quem já está lendo os números do ponto, e o painel não fica mais alto que a
 * tela. Nasce aberto, porque quem abre o site pela primeira vez é quem precisa dele.
 */
import { MIN_LANDING_WINDOW_HOURS } from '../engine/config.js'
import { about } from '../data/about.js'
import './About.css'

export function About() {
  return (
    <details className="about" open>
      <summary className="about__title">{about.title}</summary>
      {about.blocks.map((block) => (
        <div className="about__block" key={block.heading}>
          <h3 className="about__heading">{block.heading}</h3>
          <p className="about__body">
            {typeof block.body === 'function' ? block.body(MIN_LANDING_WINDOW_HOURS) : block.body}
          </p>
        </div>
      ))}
    </details>
  )
}

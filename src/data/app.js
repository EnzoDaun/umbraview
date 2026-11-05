/* Textos da tela principal. O app vai ser julgado em inglês, então todo texto que a pessoa vê
 * é escrito em inglês aqui, e só aqui (README, "Três regras que valem para qualquer tela").
 * Os textos da cena ficam em scene.js; quando o painel (card I1) entrar, os dele ficam num
 * arquivo próprio nesta pasta. */
export const app = {
  name: 'UmbraView',
  tagline: 'Sun and Earth over the real lunar horizon',
  scene: {
    title: 'Lunar scene',
  },
  panel: {
    title: 'Landing site',
    empty: 'Choose a landing site to see when the Sun and the Earth are above its horizon.',
  },
  footer: 'Umbra Team · NASA Space Apps Challenge 2026',
}

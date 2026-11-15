/* Textos da tela principal. O app vai ser julgado em inglês, então todo texto que a pessoa vê
 * é escrito em inglês aqui, e só aqui (README, "Três regras que valem para qualquer tela").
 * Os textos da cena ficam em scene.js, e os do painel do ponto em panel.js. */
export const app = {
  name: 'UmbraView',
  tagline: 'Sun and Earth over the real lunar horizon',
  scene: {
    title: 'Lunar scene',
  },
  panel: {
    title: 'Landing site',
  },
  footer: 'Umbra Team · NASA Space Apps Challenge 2026',
  // O guia de submissão de 2026 pede marca visível em toda imagem feita com IA, e o logo está na
  // aba do navegador, onde não cabe marca legível: a marca fica aqui, na mesma página (card E19).
  credits: {
    data: 'Terrain: NASA LOLA',
    source: 'Source code',
    sourceUrl: 'https://github.com/EnzoDaun/umbraview',
    ai: 'Logo AI-generated and code AI-assisted (Claude, Anthropic)',
    separator: ' · ',
  },
}

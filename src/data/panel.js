/* Textos do painel do ponto escolhido (card I1), em inglês, como todo texto de tela (README, "Três
 * regras que valem para qualquer tela"). O título da região continua em app.js, porque a região é
 * do esqueleto da tela, e não do painel. */
export const panel = {
  empty: 'Choose a landing site to see when the Sun and the Earth are above its horizon.',
  loading: 'Calculating the sky over this site…',
  // A conta que falhou: um arquivo de relevo que não chegou ou que chegou com o tamanho errado
  // (reliefFiles.js). O motor também recusa o ponto fora da área, mas esse ponto não chega ao
  // painel: o clique na cena barra (card C3), e a lista só tem locais dentro (card I2).
  // Recarregar a página refaz a conta; escolher o mesmo ponto de novo, não (card E14).
  error: "Couldn't calculate this site. Reload the page to try again.",
  sunNow: 'Sun now',
  earthNow: 'Earth now',
  visible: 'In view',
  hidden: 'Hidden by terrain',
  // O astro inteiro abaixo do plano do horizonte: a noite, no caso do Sol; o lado oculto ou a
  // libração, no caso da Terra. Mudar o ponto alguns quilômetros não resolve, e por isso o texto é
  // outro que o de um morro na frente.
  belowHorizon: 'Below the horizon',
  // De quando a quando valem os números "in this period" (card I6).
  period: 'Period',
  // Só com o Sol escondido agora: quando a luz volta (card I8).
  nextSunrise: 'Next sunrise',
  nextSunset: 'Next sunset',
  noSunset: "The Sun doesn't set in this period.",
  sunAlwaysHidden: "The Sun doesn't rise above the terrain in this period.",
  sunlight: 'Sunlight in the period',
  longestDark: 'Longest darkness',
  hoursUnit: 'h',
  // A Terra no período, com as mesmas regras do Sol acima (card I8).
  nextEarthrise: 'Next Earthrise',
  nextEarthset: 'Next Earthset',
  noEarthset: "The Earth doesn't set in this period.",
  earthAlwaysHidden: 'The Earth stays behind the terrain for the whole period.',
  // O lado oculto da Lua, ou um ponto em que a libração não traz a Terra acima do horizonte.
  earthNeverRises: 'The Earth stays below the horizon for the whole period: no direct link to Earth from here.',
  earthInView: 'Earth in view in the period',
  landingWindows: 'Landing windows',
  noWindows: 'No landing window in this period.',
  // A janela cortada pelo período começa no começo dele, ou termina no último instante calculado:
  // sem o marcador, a pessoa leria aquela data como um nascer ou um pôr do Sol de verdade.
  alreadyOpen: '(already open)',
  continues: '(continues)',
  // De qual relevo veio o horizonte do ponto, e com que detalhe (sky.terrain).
  terrain: 'Terrain data',
  terrainFine: (metersPerPixel) => `NASA LOLA, ${metersPerPixel} m per pixel.`,
  terrainCoarse: (metersPerPixel) =>
    `NASA LOLA, ${(metersPerPixel / 1000).toFixed(1)} km per pixel. Outside the south-pole area the horizon is approximate.`,
  // A lista de locais de pouso (card I2).
  siteListLabel: 'Known sites',
  siteListPlaceholder: 'Choose a site…',
  siteGroupLanded: 'Landed',
  siteGroupCandidates: 'Artemis III candidate regions',
  // O controle de data e hora (card I4).
  dateTimeLabel: 'Date and time (UTC)',
  dateTimeNow: 'Now',
}

/* Textos do painel do ponto escolhido (card I1), em inglês, como todo texto de tela (README, "Três
 * regras que valem para qualquer tela"). O título da região continua em app.js, porque a região é
 * do esqueleto da tela, e não do painel. */
export const panel = {
  empty: 'Choose a landing site to see when the Sun and the Earth are above its horizon.',
  loading: 'Calculating the sky over this site…',
  // Serve para a falha de verdade e para o ponto fora da área com relevo: hoje o useSiteSky não
  // diz qual dos dois aconteceu (card E13).
  error: "Couldn't calculate this site. It may be outside the area we have terrain for. Try another one.",
  sunNow: 'Sun now',
  earthNow: 'Earth now',
  visible: 'In view',
  hidden: 'Hidden by terrain',
  nextSunset: 'Next sunset',
  noSunset: "The Sun doesn't set in this period.",
  sunAlwaysHidden: 'The Sun stays behind the terrain for the whole period.',
  sunlight: 'Sunlight in the period',
  longestDark: 'Longest darkness',
  hoursUnit: 'h',
  landingWindows: 'Landing windows',
  noWindows: 'No landing window in this period.',
  // A janela cortada pelo período começa no começo dele, ou termina no último instante calculado:
  // sem o marcador, a pessoa leria aquela data como um nascer ou um pôr do Sol de verdade.
  alreadyOpen: '(already open)',
  continues: '(continues)',
  // O controle de data e hora (card I4).
  dateTimeLabel: 'Date and time (UTC)',
  dateTimeNow: 'Now',
}

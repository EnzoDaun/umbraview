/* Textos da vista do chão e da linha do tempo do ponto escolhido, em inglês, como todo texto de
 * tela (README, "Três regras que valem para qualquer tela"). */
export const siteSky = {
  title: 'Sky over the site',
  // No lugar do gráfico, enquanto nenhum ponto foi escolhido: já diz que ele existe e para que serve.
  empty: 'Choose a site to see its horizon, and the path of the Sun and the Earth over it.',
  loading: 'Tracing the horizon of this site…',
  sun: 'Sun',
  earth: 'Earth',
  terrain: 'Terrain',
  inView: 'in view',
  hidden: 'hidden',
  landingWindows: 'Landing windows',
  // As direções no eixo de baixo do gráfico: azimute 0° é o norte e cresce para o leste.
  compass: [
    { azimuthDeg: 0, label: 'N' },
    { azimuthDeg: 90, label: 'E' },
    { azimuthDeg: 180, label: 'S' },
    { azimuthDeg: 270, label: 'W' },
    { azimuthDeg: 360, label: 'N' },
  ],
  degrees: (value) => `${value}°`,
  // O resumo do gráfico para o leitor de tela: o desenho não tem texto, então diz o que ele mostra
  // com os números do ponto.
  chartLabel: ({ sunPercent, earthPercent, minDeg, maxDeg }) =>
    `Horizon of the site over 360 degrees of azimuth, from ${minDeg} to ${maxDeg} degrees of elevation, with the path of the Sun (in view ${sunPercent} of the period) and of the Earth (in view ${earthPercent} of the hours). Solid lines are in view; dashed lines are hidden by terrain.`,
  // A linha do tempo: o controle que anda pelas horas do período.
  timelineLabel: 'Hour of the period',
  timelineStart: 'Start',
  timelineEnd: 'End',
  useThisTime: 'Set as date',
  elevationUnit: '°',
  // "What am I seeing?": a explicação geral, fechada até a pessoa abrir.
  explainTitle: 'What am I seeing?',
  // Os 29,53 dias são o mês sinódico (NASA NSSDC, Moon Fact Sheet, CREDITS.md). A altura do
  // observador vem do motor (HORIZON.mastM, em config.js), para o texto não ficar com um número velho.
  // Os três primeiros parágrafos ensinam a ler o desenho (traço cheio e pontilhado, marcador cheio e
  // vazado, as três faixas e o cursor), que antes só o leitor de tela recebia, no chartLabel. A
  // janela mínima vem do motor (MIN_LANDING_WINDOW_HOURS), pelo mesmo motivo da altura do observador.
  explain: (mastM, minWindowHours) => [
    `The grey shape is the skyline around the site, seen from ${mastM} m above the ground: for each direction (N, E, S, W along the bottom), how high the terrain rises above the horizontal. Anything below it is hidden.`,
    'The orange line is the path of the Sun over the period, and the blue loop is the path of the Earth. Solid stretches are in view; dotted stretches are hidden by the terrain. The dots show where each one is at the marked hour: filled if in view, hollow if hidden.',
    `The bars below cover the same period, from left to right, one tick per day. Orange: hours with the Sun in view. Blue: hours with the Earth in view. Green: landing windows, at least ${minWindowHours} hours in a row with both in view together (a window cut by the start or the end of the period shows shorter). Drag along the bars, or use the arrow keys, to move the marked hour; "Set as date" makes it the new start date.`,
    'The Sun takes 29.53 days to go once around this horizon (one lunar day). Near the poles it never climbs far above it, so a single ridge can hide it for days.',
    'The Earth barely moves in the lunar sky, because the Moon keeps the same face toward it. It only wobbles a few degrees around one spot (libration), as the Moon’s orbit is tilted and not a perfect circle. Near the poles that wobble is enough to take the Earth below the horizon, and with it the direct radio link.',
    'Positions come from the Moon’s orbit and rotation (IAU model) and agree with JPL’s SPICE to within 0.01°. Heights are stretched in the chart: the scale on the left shows the real degrees.',
  ],
}

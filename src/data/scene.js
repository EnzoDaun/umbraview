/* Textos da cena 3D (cards C1, C2 e C3), em inglês, como todo texto de tela (README, "Três regras
 * que valem para qualquer tela"). O título da região continua em app.js, porque a região é do
 * esqueleto da tela, e não da cena. */
export const scene = {
  // Nome da cena para o leitor de tela: o canvas não tem texto, então diz o que é e como usar.
  // O relevo está na altura real (card C2): dizer isso evita que alguém ache a Lua lisa demais.
  // Quem usa teclado escolhe o ponto pela lista de locais (card I2), e não pela cena.
  label:
    '3D view of the whole Moon, with real color and terrain and the sunlight of the chosen date, over the real star field. Drag to rotate, scroll to zoom in, click anywhere on the Moon to choose a landing site.',
  // Aviso do clique fora da área do polo sul (card C3): o ponto é escolhido, mas o horizonte dele vem
  // do relevo da Lua inteira, bem mais grosso que o do polo. O limite vem do manifest.json do relevo
  // (areaMaxLatDeg), para o texto não ficar com um número velho se a área mudar.
  coarseTerrain: (limitDeg) =>
    `North of ${limitDeg}°S the horizon comes from coarser terrain: results there are approximate.`,
  // O botão da Lua inteira, um liga e desliga: aceso com a Lua inteira no quadro. Apertar leva a
  // câmera de volta ao quadro amplo; apertar de novo, para onde ela estava antes.
  wholeMoon: 'Show the whole Moon',
  // O mapa das áreas com janela de pouso: o botão junto da cena e a linha que diz o que ele achou.
  landingToggle: 'Show landing areas',
  // Enquanto a conta roda: o que está sendo procurado e o que vai aparecer. periodDays e minHours
  // são os da regra do motor (config.js), para o texto não ficar com um número velho.
  landingLoading: ({ periodDays, minHours }) =>
    `Checking where on the Moon a landing window opens in the ${periodDays} days after the chosen date: at least ${minHours} hours in a row with the Sun and the Earth above the horizon together. Those areas will turn green.`,
  landingError: "Couldn't calculate the landing areas. Reload the page to try again.",
  // found e total: pontos das duas grades somados; stepKm e limitDeg: o passo da grade fina e até
  // onde ela vai; globalStepKm: o passo da grade do resto da Lua, ou null se o site não tem essa;
  // minHours: a duração mínima da janela. A frase começa pelo que o verde quer dizer.
  landingReady: ({ found, total, stepKm, limitDeg, globalStepKm, minHours }) => {
    const meaning = `Green areas have a landing window in this period: at least ${minHours} hours in a row with the Sun and the Earth above the horizon together.`
    return globalStepKm === null
      ? `${meaning} ${found} of ${total} points checked have one (one every ${stepKm} km, down to ${limitDeg}°S).`
      : `${meaning} ${found} of ${total} points checked have one (one every ${stepKm} km south of ${limitDeg}°S, one every ${globalStepKm} km on the rest of the Moon).`
  },
}

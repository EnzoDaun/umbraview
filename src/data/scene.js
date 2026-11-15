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
  // O mapa das áreas com janela de pouso: o botão junto da cena e a linha que diz o que ele achou.
  landingToggle: 'Show landing areas',
  landingLoading: 'Finding the areas with a landing window…',
  landingError: "Couldn't calculate the landing areas. Reload the page to try again.",
  // found e total: pontos das duas grades somados; stepKm e limitDeg: o passo da grade fina e até
  // onde ela vai; globalStepKm: o passo da grade do resto da Lua, ou null se o site não tem essa.
  landingReady: ({ found, total, stepKm, limitDeg, globalStepKm }) =>
    globalStepKm === null
      ? `${found} of ${total} points checked (one every ${stepKm} km, down to ${limitDeg}°S) have a landing window in this period.`
      : `${found} of ${total} points checked have a landing window in this period (one every ${stepKm} km south of ${limitDeg}°S, one every ${globalStepKm} km on the rest of the Moon).`,
}

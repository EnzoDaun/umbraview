/* Textos da cena 3D (cards C1, C2 e C3), em inglês, como todo texto de tela (README, "Três regras
 * que valem para qualquer tela"). O título da região continua em app.js, porque a região é do
 * esqueleto da tela, e não da cena. */
export const scene = {
  // Nome da cena para o leitor de tela: o canvas não tem texto, então diz o que é e como usar.
  // O relevo está na altura real (card C2): dizer isso evita que alguém ache a Lua lisa demais.
  // A data ainda é a hora em que a página abriu; quando o I4 deixar escolher, o texto volta a
  // dizer chosen date. Quem usa teclado escolhe o ponto pela lista de locais (card I2), e não
  // pela cena.
  label:
    '3D view of the Moon, starting over the south pole, with the terrain at true scale and the sunlight of the current date. Drag to rotate, scroll to zoom in, click near the south pole to choose a landing site.',
  // Aviso de clique fora da área que dá para escolher (card C3). O limite vem do manifest.json do
  // relevo (areaMaxLatDeg), para o texto não ficar com um número velho se a área mudar. Não diz que
  // falta relevo: entre 84° e uns 77°S a cena desenha o relevo grosso, e a pessoa estaria vendo
  // montanha onde o texto diria que não há (revisão do PR #9).
  outsideArea: (limitDeg) => `Landing sites can be chosen between the south pole and ${limitDeg}°S.`,
}

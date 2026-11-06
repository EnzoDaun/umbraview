/* Textos da cena 3D (cards C1 e C2), em inglês, como todo texto de tela (README, "Três regras que
 * valem para qualquer tela"). O título da região continua em app.js, porque a região é do
 * esqueleto da tela, e não da cena. */
export const scene = {
  // Nome da cena para o leitor de tela: o canvas não tem texto, então diz o que é e como usar.
  // O relevo está na altura real (card C2): dizer isso evita que alguém ache a Lua lisa demais.
  // A data ainda é a hora em que a página abriu; quando o I4 deixar escolher, o texto volta a
  // dizer chosen date.
  label:
    '3D view of the Moon, starting over the south pole, with the terrain at true scale and the sunlight of the current date. Drag to rotate, scroll to zoom in.',
}

/* O céu de estrelas da cena: as contas, sem o three nem o React, para serem testadas no Node (o
 * mesmo motivo de picking.js).
 *
 * As estrelas vêm de um catálogo de verdade (public/data/stars/stars.bin, gerado por
 * scripts/prepare-data/prepare_stars.py), e não de posições sorteadas: com o giro do motor, a Terra
 * e o Sol aparecem entre as estrelas certas na data escolhida. A posição é real; o brilho e o
 * tamanho na tela são escolha de desenho, porque uma câmera ajustada para o chão iluminado da Lua
 * não veria estrela nenhuma.
 */
import { moonFixedFrameAt } from '../engine/ephemeris.js'
import { engineToScene } from './coordinates.js'

// Números por estrela no arquivo: x, y, z, magnitude e índice de cor (prepare_stars.py).
export const STAR_STRIDE = 5

/* buffer: o ArrayBuffer do stars.bin. O tamanho é conferido porque um download cortado, ou uma
   página de erro servida no lugar do arquivo, chegaria como estrelas em lugares errados. */
export function parseStars(buffer) {
  if (buffer.byteLength === 0 || buffer.byteLength % (STAR_STRIDE * 4) !== 0) {
    throw new Error(`o arquivo de estrelas veio com ${buffer.byteLength} bytes, que não fecham em estrelas inteiras`)
  }
  const values = new Float32Array(buffer)
  const count = values.length / STAR_STRIDE
  const directions = new Float32Array(count * 3)
  const magnitudes = new Float32Array(count)
  const colorIndexes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    directions[3 * i] = values[STAR_STRIDE * i]
    directions[3 * i + 1] = values[STAR_STRIDE * i + 1]
    directions[3 * i + 2] = values[STAR_STRIDE * i + 2]
    magnitudes[i] = values[STAR_STRIDE * i + 3]
    colorIndexes[i] = values[STAR_STRIDE * i + 4]
  }
  return { count, directions, magnitudes, colorIndexes }
}

/* A cor de uma estrela pelo índice B−V, em vermelho, verde e azul de 0 a 1: das azuladas (quentes)
   às avermelhadas (frias), passando pelo branco. São cores de dado físico, e não de interface, e
   por isso não são tokens: nenhuma vira texto nem fundo. Os valores são uma escala aproximada da
   cor de um corpo negro na temperatura de cada índice, clareada para ler bem no fundo escuro. */
const COLOR_STOPS = [
  [-0.4, [0.62, 0.72, 1.0]],
  [0.0, [0.8, 0.86, 1.0]],
  [0.3, [0.97, 0.96, 1.0]],
  [0.65, [1.0, 0.94, 0.84]],
  [1.0, [1.0, 0.85, 0.68]],
  [1.5, [1.0, 0.75, 0.5]],
  [2.0, [1.0, 0.64, 0.4]],
]

export function starColor(colorIndex) {
  const first = COLOR_STOPS[0]
  const last = COLOR_STOPS[COLOR_STOPS.length - 1]
  if (colorIndex <= first[0]) return first[1].slice()
  if (colorIndex >= last[0]) return last[1].slice()
  const upper = COLOR_STOPS.findIndex(([index]) => index >= colorIndex)
  const [i0, c0] = COLOR_STOPS[upper - 1]
  const [i1, c1] = COLOR_STOPS[upper]
  const t = (colorIndex - i0) / (i1 - i0)
  return c0.map((channel, k) => channel + (c1[k] - channel) * t)
}

/* De 0 a 1: 1 para a estrela mais brilhante do céu (Sirius, −1,44) e um mínimo visível para a
   mais fraca do arquivo (6,5). O olho responde ao brilho em escala de magnitude, e por isso a conta
   é uma reta na magnitude, e não no fluxo de luz, que cairia 1.500 vezes de uma ponta à outra. */
const BRIGHTEST_MAGNITUDE = -1.44
const FAINTEST_MAGNITUDE = 6.5
const FAINTEST_BRIGHTNESS = 0.12

export function starBrightness(magnitude) {
  const t = (FAINTEST_MAGNITUDE - magnitude) / (FAINTEST_MAGNITUDE - BRIGHTEST_MAGNITUDE)
  return Math.min(1, Math.max(FAINTEST_BRIGHTNESS, FAINTEST_BRIGHTNESS + (1 - FAINTEST_BRIGHTNESS) * t))
}

/* O giro que leva uma direção do catálogo (equatorial J2000) à cena, na data: o giro do motor para
   o referencial fixo da Lua e a troca de eixos da cena (coordinates.js). Devolve os 16 números de
   uma matriz 4 × 4 em colunas, o formato do Matrix4 do three. dateMs: milissegundos UTC. */
export function skyRotationMatrix(dateMs) {
  const toMoonFixed = moonFixedFrameAt(dateMs)
  const column = (x, y, z) => engineToScene(toMoonFixed(x, y, z))
  const cx = column(1, 0, 0)
  const cy = column(0, 1, 0)
  const cz = column(0, 0, 1)
  return [cx[0], cx[1], cx[2], 0, cy[0], cy[1], cy[2], 0, cz[0], cz[1], cz[2], 0, 0, 0, 0, 1]
}

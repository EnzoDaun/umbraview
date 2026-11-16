/* As estrelas reais do céu da cena (contrato C5 da v2): o arquivo public/data/stars/stars.bin vira
 * direção, magnitude e cor.
 *
 * O arquivo sai de scripts/prepare-data/prepare_stars.py, a partir do catálogo HYG v4.4 (CC BY-SA
 * 4.0, CREDITS.md): Float32, 5 números por estrela (x, y, z de tamanho 1 no referencial equatorial
 * J2000, magnitude aparente e índice de cor B−V), da mais brilhante para a mais fraca.
 *
 * JavaScript puro, como o resto do motor: a cena recebe os números prontos.
 */

export const STAR_STRIDE = 5

/* buffer: o ArrayBuffer do stars.bin. Devolve { count, directions, magnitudes, colorIndex }: três
   números por estrela em directions e um nos outros dois. O tamanho é conferido porque uma página
   de erro servida no lugar do arquivo chegaria como estrelas (o mesmo cuidado de reliefFiles.js). */
export function decodeStars(buffer) {
  if (Object.prototype.toString.call(buffer) !== '[object ArrayBuffer]') {
    throw new Error('o arquivo de estrelas não chegou como ArrayBuffer')
  }
  if (buffer.byteLength === 0 || buffer.byteLength % (STAR_STRIDE * 4) !== 0) {
    throw new Error(`o arquivo de estrelas veio com ${buffer.byteLength} bytes, que não é múltiplo de ${STAR_STRIDE * 4}`)
  }
  const data = new Float32Array(buffer)
  const count = data.length / STAR_STRIDE
  const directions = new Float32Array(count * 3)
  const magnitudes = new Float32Array(count)
  const colorIndex = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    directions[3 * i] = data[STAR_STRIDE * i]
    directions[3 * i + 1] = data[STAR_STRIDE * i + 1]
    directions[3 * i + 2] = data[STAR_STRIDE * i + 2]
    magnitudes[i] = data[STAR_STRIDE * i + 3]
    colorIndex[i] = data[STAR_STRIDE * i + 4]
  }
  return { count, directions, magnitudes, colorIndex }
}

/* A temperatura de uma estrela pelo índice de cor B−V, em kelvin: a fórmula de Ballesteros (2012,
   "New insights into black bodies", EPL 97, 34008), que trata a estrela como corpo negro.
   T = 4600 · (1 / (0,92·(B−V) + 1,7) + 1 / (0,92·(B−V) + 0,62)). */
export function colorIndexToKelvin(bv) {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))
}

/* A faixa em que a aproximação de cor abaixo vale. Fora dela, a temperatura é presa na borda: uma
   estrela de 40.000 K fica com o azul da de 25.000 K, que na tela é o mesmo. */
const MIN_KELVIN = 1667
const MAX_KELVIN = 25000

/* A cor de um corpo negro de temperatura T, em vermelho, verde e azul lineares, com o maior dos
   três valendo 1 (a cor, sem o brilho: o brilho da estrela vem da magnitude).
   A cromaticidade (x, y) do corpo negro é a aproximação por polinômios de Kim et al. (2002), como
   tabelada no verbete "Planckian locus" (não conferi o artigo original; o teste confere o ponto
   de 6.500 K contra o valor conhecido x = 0,3135, y = 0,3237). De (x, y) para RGB linear, a matriz
   do sRGB (IEC 61966-2-1). */
export function kelvinToRgb(kelvin) {
  const t = Math.max(MIN_KELVIN, Math.min(MAX_KELVIN, kelvin))
  const x = t < 4000
    ? -0.2661239e9 / t ** 3 - 0.2343589e6 / t ** 2 + 0.8776956e3 / t + 0.17991
    : -3.0258469e9 / t ** 3 + 2.1070379e6 / t ** 2 + 0.2226347e3 / t + 0.24039
  let y
  if (t < 2222) y = -1.1063814 * x ** 3 - 1.3481102 * x ** 2 + 2.18555832 * x - 0.20219683
  else if (t < 4000) y = -0.9549476 * x ** 3 - 1.37418593 * x ** 2 + 2.09137015 * x - 0.16748867
  else y = 3.081758 * x ** 3 - 5.8733867 * x ** 2 + 3.75112997 * x - 0.37001483

  // de (x, y) com brilho 1 para XYZ, e daí para o RGB linear
  const X = x / y
  const Z = (1 - x - y) / y
  const r = Math.max(0, 3.2406 * X - 1.5372 - 0.4986 * Z)
  const g = Math.max(0, -0.9689 * X + 1.8758 + 0.0415 * Z)
  const b = Math.max(0, 0.0557 * X - 0.204 + 1.057 * Z)
  const max = Math.max(r, g, b)
  return [r / max, g / max, b / max]
}

/* A cor de cada estrela, três números por estrela. Estrela sem B−V no catálogo (NaN no arquivo)
   fica branca: inventar um índice de cor seria dar a ela uma temperatura que ninguém mediu. */
export function starColors(colorIndex) {
  const colors = new Float32Array(colorIndex.length * 3)
  for (let i = 0; i < colorIndex.length; i++) {
    const bv = colorIndex[i]
    const [r, g, b] = Number.isNaN(bv) ? [1, 1, 1] : kelvinToRgb(colorIndexToKelvin(bv))
    colors[3 * i] = r
    colors[3 * i + 1] = g
    colors[3 * i + 2] = b
  }
  return colors
}

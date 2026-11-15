/* O relevo como o horizonte o enxerga: algo que diz a altura num ponto da Lua.
 *
 * Cada função daqui recebe uma grade (os números e onde ela fica) e devolve { sample(x, y, z) },
 * a altura em metros acima do raio de referência no ponto de vetor (x, y, z), ou NaN onde a grade
 * não tem dado. O horizonte (horizon.js) só conhece o sample; assim ele é testado com relevo
 * inventado de propósito, e a forma de guardar a grade (card E2) muda sem mexer no horizonte.
 *
 * O ponto chega em três números soltos, e não num array, porque o horizonte chama o sample cerca
 * de 940 mil vezes por ponto escolhido (360 direções × 2.610 distâncias até 200 km): um array
 * novo por chamada pesa no coletor de lixo.
 */
import { MOON_RADIUS_M } from './geometry.js'

const DEG = 180 / Math.PI

/* Média ponderada dos quatro pixels em volta de (fc, fr), em coordenadas de pixel onde o centro do
   pixel (c, r) fica em (c, r). NaN quando falta um dos quatro. */
function bilinear(heights, columns, rows, scale, noData, fc, fr) {
  const c = Math.floor(fc)
  const r = Math.floor(fr)
  if (c < 0 || r < 0 || c + 1 >= columns || r + 1 >= rows) return NaN
  const i = r * columns + c
  const v00 = heights[i]
  const v01 = heights[i + 1]
  const v10 = heights[i + columns]
  const v11 = heights[i + columns + 1]
  if (noData !== undefined && (v00 === noData || v01 === noData || v10 === noData || v11 === noData)) return NaN
  const tc = fc - c
  const tr = fr - r
  return ((v00 * (1 - tc) + v01 * tc) * (1 - tr) + (v10 * (1 - tc) + v11 * tc) * tr) * scale
}

/* Grade na projeção polar sul dos arquivos LOLA do polo (geometry.js, unitToPolarXY).
   x0 e y0 são a borda esquerda e a borda de cima da grade, em metros; a linha 0 é a de cima.
   scale converte o número guardado em metros (0,5 quando a altura vem em meio metro).
   noData é o número que marca pixel sem medida, se a grade tiver um. */
export function polarGridRelief({ heights, scale = 1, noData, resolutionM, x0, y0, columns, rows }) {
  return {
    sample(x, y, z) {
      // a mesma conta de unitToPolarXY, escrita aqui para não criar um array por chamada
      const k = (2 * MOON_RADIUS_M) / (1 - z)
      const px = k * y
      const py = k * x
      return bilinear(heights, columns, rows, scale, noData, (px - x0) / resolutionM - 0.5, (y0 - py) / resolutionM - 0.5)
    },
  }
}

/* Grade cilíndrica simples dos arquivos LOLA da Lua inteira, com os campos do rótulo PDS:
   pixelsPerDegree (MAP_RESOLUTION), lineOffset (LINE_PROJECTION_OFFSET), sampleOffset
   (SAMPLE_PROJECTION_OFFSET) e centerLongitude (CENTER_LONGITUDE). firstRow e firstColumn dizem
   onde começa o recorte, quando a grade é só um pedaço do arquivo. wrap liga a volta em 0°/360°,
   que só vale para a faixa que cobre todas as longitudes. Longitude em 0°–360° leste. */
export function cylindricalGridRelief({
  heights, scale = 1, noData, pixelsPerDegree, lineOffset, sampleOffset, centerLongitude,
  firstRow = 0, firstColumn = 0, rows, columns, wrap = false,
}) {
  return {
    sample(x, y, z) {
      const lat = Math.asin(Math.max(-1, Math.min(1, z))) * DEG
      let lon = (Math.atan2(y, x) * DEG) % 360
      if (lon < 0) lon += 360
      const fr = lineOffset - lat * pixelsPerDegree - firstRow
      const fc = sampleOffset + pixelsPerDegree * (lon - centerLongitude) - firstColumn
      if (!wrap) return bilinear(heights, columns, rows, scale, noData, fc, fr)

      // Na volta, a coluna depois da última é a primeira.
      const r = Math.floor(fr)
      if (r < 0 || r + 1 >= rows) return NaN
      const c = ((Math.floor(fc) % columns) + columns) % columns
      const c1 = (c + 1) % columns
      const tc = fc - Math.floor(fc)
      const tr = fr - r
      const v00 = heights[r * columns + c]
      const v01 = heights[r * columns + c1]
      const v10 = heights[(r + 1) * columns + c]
      const v11 = heights[(r + 1) * columns + c1]
      if (noData !== undefined && (v00 === noData || v01 === noData || v10 === noData || v11 === noData)) return NaN
      return ((v00 * (1 - tc) + v01 * tc) * (1 - tr) + (v10 * (1 - tc) + v11 * tc) * tr) * scale
    },
  }
}

/* Um pedaço da grade da Lua inteira do site (public/data/relief/global/, gerada por
   scripts/prepare-data/prepare_moon_global.py): latitude e longitude, com a linha 0 no polo norte e a
   coluna 0 na longitude 0°, crescendo para o leste. firstRow e firstColumn: onde o pedaço começa na
   grade inteira; firstColumn pode ser negativa, quando o pedaço atravessa a longitude 0°.
   totalColumns: as colunas da grade inteira, para a longitude dar a volta. O pedaço que cobre todas
   as longitudes traz a primeira coluna repetida no fim, e assim a interpolação na emenda lê dois
   pixels vizinhos como em qualquer outro lugar. */
export function cylindricalWindowRelief({
  heights, scale = 1, pixelsPerDegree, totalColumns, firstRow, firstColumn, rows, columns,
}) {
  return {
    sample(x, y, z) {
      const lat = Math.asin(Math.max(-1, Math.min(1, z))) * DEG
      const lon = Math.atan2(y, x) * DEG
      const fr = (90 - lat) * pixelsPerDegree - 0.5 - firstRow
      // a coluna dentro do pedaço, contando a volta: o pedaço pode começar antes da longitude 0°
      let fc = (lon * pixelsPerDegree - 0.5 - firstColumn) % totalColumns
      if (fc < 0) fc += totalColumns
      return bilinear(heights, columns, rows, scale, undefined, fc, fr)
    },
  }
}

/* Grade polar em ladrilhos quadrados, o formato do relevo fino do site (public/data/relief/near,
   gerado por scripts/prepare-data/). O ladrilho da linha r e coluna c cobre, sem contar a borda,
   x de originX + c·tileM até originX + (c + 1)·tileM e y de originY − (r + 1)·tileM até
   originY − r·tileM. Cada ladrilho traz marginPx pixels a mais de cada lado, repetidos do
   vizinho: assim a interpolação na emenda lê um ladrilho só.
   tiles: tileRows × tileColumns posições, linha a linha, com as alturas de cada ladrilho
   carregado (tilePx × tilePx, a linha 0 em cima) ou undefined onde não há ladrilho. */
export function tiledPolarRelief({
  tiles, tileColumns, tileRows, tileM, tilePx, marginPx, resolutionM, originX, originY, scale = 1, noData,
}) {
  const margin = marginPx * resolutionM
  return {
    sample(x, y, z) {
      // a mesma conta de unitToPolarXY, como em polarGridRelief
      const k = (2 * MOON_RADIUS_M) / (1 - z)
      const px = k * y
      const py = k * x
      const c = Math.floor((px - originX) / tileM)
      const r = Math.floor((originY - py) / tileM)
      if (c < 0 || r < 0 || c >= tileColumns || r >= tileRows) return NaN
      const heights = tiles[r * tileColumns + c]
      if (!heights) return NaN
      const left = originX + c * tileM - margin
      const top = originY - r * tileM + margin
      return bilinear(heights, tilePx, tilePx, scale, noData, (px - left) / resolutionM - 0.5, (top - py) / resolutionM - 0.5)
    },
  }
}

/* Os arquivos de relevo do site viram as camadas que computeHorizon usa.
 *
 * Os arquivos ficam em public/data/relief/ e saem de scripts/prepare-data/ (o README de lá diz
 * como). O manifest.json diz onde fica cada grade: o relevo fino (80 m) em ladrilhos de 20 km, e
 * o grosso (960 m) num arquivo só. Para um ponto, só os ladrilhos em volta dele são baixados.
 *
 * Quem lê os arquivos é a função readFile(caminho), que chega de fora e devolve uma Promise de
 * ArrayBuffer, com o caminho relativo a public/data/relief/. No site, ela usa fetch; nos testes e
 * nos scripts, lê do disco. Assim o motor continua sem tocar na página.
 */
import { HORIZON, NEAR_LAYER_UP_TO_M } from './config.js'
import { MOON_RADIUS_M, unitToLatLon, unitToPolarXY } from './geometry.js'
import { cylindricalWindowRelief, polarGridRelief, tiledPolarRelief } from './relief.js'

/* Até que latitude a pessoa pode escolher um ponto (a área que o script recortou). A folga de
   um bilionésimo de grau segura o ponto exatamente na borda: a ida e volta entre latitude e vetor
   devolve −83,99999999999999 no lugar de −84. Os ladrilhos passam 10 km da borda, então a folga
   não deixa ponto sem relevo. */
export function isInsideReliefArea(manifest, latDeg) {
  return latDeg <= manifest.areaMaxLatDeg + 1e-9
}

/* Os ladrilhos do relevo fino que o horizonte pode ler em volta do ponto: todos os que encostam
   no quadrado de lado 2·raio em volta dele, na projeção. Os que não existem no manifesto ficam de
   fora (o script só grava os que algum ponto da área usa). */
export function tilesAround(manifest, point) {
  const { tileM, originX, originY, tileColumns, tileRows, tiles } = manifest.near
  const [px, py] = unitToPolarXY(point)
  // A projeção estica as distâncias por 2 / (1 + cos(distância ao polo)), mais longe do polo,
  // mais. O ponto mais longe do polo que o relevo fino alcança dá o maior esticão.
  const colatitude = Math.acos(Math.max(-1, Math.min(1, -point[2]))) + NEAR_LAYER_UP_TO_M / MOON_RADIUS_M
  const radius = (NEAR_LAYER_UP_TO_M * 2) / (1 + Math.cos(colatitude))
  const firstColumn = Math.max(0, Math.floor((px - radius - originX) / tileM))
  const lastColumn = Math.min(tileColumns - 1, Math.floor((px + radius - originX) / tileM))
  const firstRow = Math.max(0, Math.floor((originY - py - radius) / tileM))
  const lastRow = Math.min(tileRows - 1, Math.floor((originY - py + radius) / tileM))
  const existing = new Set(tiles)
  const names = []
  for (let r = firstRow; r <= lastRow; r++) {
    for (let c = firstColumn; c <= lastColumn; c++) {
      const name = tileName(r, c)
      if (existing.has(name)) names.push(name)
    }
  }
  return names
}

const tileName = (r, c) => `r${String(r).padStart(2, '0')}c${String(c).padStart(2, '0')}`

/* As alturas guardadas em int16, na ordem de bytes do computador: little-endian, a mesma do
   script, em todo navegador e processador que o site atende. O tamanho é conferido porque um
   download cortado, ou uma página de erro servida no lugar do arquivo, chega com outro. E só
   ArrayBuffer serve: um Buffer do Node (o que o fs devolve) tem o mesmo tamanho, mas o
   Int16Array copiaria cada byte como se fosse uma altura. A conferência pelo nome do tipo vale
   também para ArrayBuffer criado em outro contexto, como um Worker. */
async function readHeights(readFile, path, count) {
  const buffer = await readFile(path)
  if (Object.prototype.toString.call(buffer) !== '[object ArrayBuffer]') {
    throw new Error(`o arquivo de relevo ${path} não chegou como ArrayBuffer`)
  }
  if (buffer.byteLength !== count * 2) {
    throw new Error(`o arquivo de relevo ${path} veio com ${buffer.byteLength} bytes, e não ${count * 2}`)
  }
  return new Int16Array(buffer)
}

/* cache: um Map que a ponte (card E3) guarda entre um ponto e outro, para não baixar de novo o
   que já baixou. Ele guarda a Promise da leitura, e não o resultado: dois pontos pedidos ao mesmo
   tempo esperam pela mesma leitura. Uma leitura que falhou sai do cache, para a próxima tentar
   de novo. */
function cached(cache, path, load) {
  if (!cache.has(path)) {
    const promise = load()
    cache.set(path, promise)
    promise.catch(() => cache.delete(path))
  }
  return cache.get(path)
}

/* As camadas do horizonte do ponto (vetor de tamanho 1, geometry.js), no formato de
   computeHorizon: o relevo fino até NEAR_LAYER_UP_TO_M e o grosso daí até HORIZON.maxDistanceM. */
export async function loadReliefLayers(manifest, point, readFile, cache = new Map()) {
  if (!isInsideReliefArea(manifest, unitToLatLon(point).lat)) {
    throw new Error('o ponto está fora da área com relevo')
  }
  const { near, far, heightScale } = manifest
  const tileCount = near.tilePx * near.tilePx
  const names = tilesAround(manifest, point)
  const [farHeights, ...nearHeights] = await Promise.all([
    cached(cache, far.file, () => readHeights(readFile, far.file, far.columns * far.rows)),
    ...names.map((name) => {
      const path = `near/${name}.bin`
      return cached(cache, path, () => readHeights(readFile, path, tileCount))
    }),
  ])

  const tiles = new Array(near.tileRows * near.tileColumns)
  names.forEach((name, i) => {
    const [, r, c] = name.match(/^r(\d+)c(\d+)$/)
    tiles[Number(r) * near.tileColumns + Number(c)] = nearHeights[i]
  })
  return [
    {
      relief: tiledPolarRelief({ ...near, tiles, scale: heightScale }),
      upToM: NEAR_LAYER_UP_TO_M,
    },
    {
      relief: polarGridRelief({ ...far, heights: farHeights, scale: heightScale }),
      upToM: HORIZON.maxDistanceM,
    },
  ]
}

const DEG = 180 / Math.PI
/* Folga em volta do alcance do horizonte, em graus: a interpolação lê um pixel além do ponto mais
   distante, e o passo do horizonte pode passar um pouco do alcance. */
const GLOBAL_MARGIN_DEG = 0.25

/* O pedaço do relevo da Lua inteira que o horizonte de um ponto pode ler: as linhas e as colunas da
   grade que ficam a até HORIZON.maxDistanceM dele. global: o manifest.json de
   public/data/relief/global/. Longe do equador, os mesmos quilômetros cobrem mais graus de
   longitude; quando o alcance chega ao polo, o pedaço dá a volta inteira, com uma coluna repetida
   no fim (cylindricalWindowRelief). firstColumn pode ser negativa: o pedaço atravessa a longitude 0°. */
export function globalWindow(global, point) {
  const { pixelsPerDegree, rows: totalRows, columns: totalColumns } = global
  const { lat, lon } = unitToLatLon(point)
  const reachDeg = (HORIZON.maxDistanceM / MOON_RADIUS_M) * DEG + GLOBAL_MARGIN_DEG
  const firstRow = Math.max(0, Math.floor((90 - (lat + reachDeg)) * pixelsPerDegree - 0.5))
  const lastRow = Math.min(totalRows - 1, Math.ceil((90 - (lat - reachDeg)) * pixelsPerDegree - 0.5) + 1)
  const rows = lastRow - firstRow + 1
  // a latitude mais perto de um polo dentro do pedaço: é onde a faixa de longitude é a mais larga
  const farthestLat = Math.abs(lat) + reachDeg
  const halfLonDeg = farthestLat >= 90 ? 180 : reachDeg / Math.cos(farthestLat / DEG)
  if (halfLonDeg >= 180) return { firstRow, rows, firstColumn: 0, columns: totalColumns + 1 }
  const firstColumn = Math.floor((lon - halfLonDeg) * pixelsPerDegree - 0.5)
  const columns = Math.min(totalColumns + 1, Math.ceil(2 * halfLonDeg * pixelsPerDegree) + 3)
  return { firstRow, rows, firstColumn, columns }
}

const globalTileName = (r, c) => `global/r${String(r).padStart(2, '0')}c${String(c).padStart(2, '0')}.bin`

/* A camada do horizonte de um ponto fora da área do polo sul: uma só, do relevo da Lua inteira, até
   HORIZON.maxDistanceM. global: o manifest.json de public/data/relief/global/. readFile e cache:
   como em loadReliefLayers, com o caminho relativo a public/data/relief/. Só os ladrilhos em volta
   do ponto são lidos, e as alturas deles são copiadas para um pedaço só, que é o que o horizonte lê. */
export async function loadGlobalReliefLayers(global, point, readFile, cache = new Map()) {
  const { pixelsPerDegree, tilePx, columns: totalColumns, heightScale } = global
  const { firstRow, rows, firstColumn, columns } = globalWindow(global, point)
  const column = (c) => (((firstColumn + c) % totalColumns) + totalColumns) % totalColumns

  const needed = new Map()
  for (let r = Math.floor(firstRow / tilePx); r <= Math.floor((firstRow + rows - 1) / tilePx); r++) {
    for (let c = 0; c < columns; c += tilePx) needed.set(globalTileName(r, Math.floor(column(c) / tilePx)), null)
    needed.set(globalTileName(r, Math.floor(column(columns - 1) / tilePx)), null)
  }
  const names = [...needed.keys()]
  const tiles = await Promise.all(names.map((name) => cached(cache, name, () => readHeights(readFile, name, tilePx * tilePx))))
  names.forEach((name, i) => needed.set(name, tiles[i]))

  const heights = new Int16Array(rows * columns)
  for (let r = 0; r < rows; r++) {
    const row = firstRow + r
    const tileRow = Math.floor(row / tilePx)
    for (let c = 0; c < columns; c++) {
      const col = column(c)
      const tile = needed.get(globalTileName(tileRow, Math.floor(col / tilePx)))
      heights[r * columns + c] = tile[(row % tilePx) * tilePx + (col % tilePx)]
    }
  }
  return [
    {
      relief: cylindricalWindowRelief({ heights, scale: heightScale, pixelsPerDegree, totalColumns, firstRow, firstColumn, rows, columns }),
      upToM: HORIZON.maxDistanceM,
    },
  ]
}

/* O tamanho de um pixel do relevo da Lua inteira no equador, em metros inteiros: o que a tela diz
   para avisar que, fora do polo, o horizonte vem de um relevo bem mais grosso. */
export function globalMetersPerPixel(global) {
  return Math.round((MOON_RADIUS_M * Math.PI) / 180 / global.pixelsPerDegree)
}

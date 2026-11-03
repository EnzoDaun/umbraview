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
import { polarGridRelief, tiledPolarRelief } from './relief.js'

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

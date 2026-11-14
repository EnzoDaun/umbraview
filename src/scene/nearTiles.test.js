/* Quais ladrilhos do relevo fino a cena desenha e como cada um vira malha (card C6). Os casos
 * usam o manifest.json de verdade: é a grade dele (20 × 20 ladrilhos de 20 km, 332 que existem)
 * que decide quais ladrilhos há em volta de um ponto. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MOON_RADIUS_M, latLonToUnit, polarXYToUnit, unitToPolarXY } from '../engine/geometry.js'
import { tiledPolarRelief } from '../engine/relief.js'
import { engineToScene, sceneToEngine } from './coordinates.js'
import {
  NEAR_CENTER_MESH,
  NEAR_CENTER_TILES,
  NEAR_MAX_ALTITUDE_M,
  NEAR_RING_BUILDS_PER_FRAME,
  NEAR_RING_LEVEL,
  NEAR_RING_MESH,
  NEAR_RING_TILES,
  nearCoverMask,
  nearFrameStep,
  nearRingBlock,
  nearTileBlock,
  nearTileGrid,
  nearTileIndexAt,
  nearTilesStep,
} from './nearTiles.js'
import { buildNormalMap, buildReliefCap, coverTriangles, reliefUvs, reliefVertexLabels } from './reliefMesh.js'

const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'relief', 'manifest.json'), 'utf8'))
const { tileM, originX, originY, tilePx, tileColumns } = manifest.near

// a câmera na distância mínima da cena (LunarScene.jsx), em cima de um ponto da Lua
const MIN_DISTANCE = 1.02

function cameraAbove(latDeg, lonDeg, distance = MIN_DISTANCE) {
  return engineToScene(latLonToUnit(latDeg, lonDeg)).map((v) => v * distance)
}

function cameraAbovePolarXY(px, py, distance = MIN_DISTANCE) {
  return engineToScene(polarXYToUnit(px, py)).map((v) => v * distance)
}

const name = (r, c) => `r${String(r).padStart(2, '0')}c${String(c).padStart(2, '0')}`

function readTile(tile) {
  const file = readFileSync(join(process.cwd(), 'public', 'data', 'relief', 'near', `${tile}.bin`))
  return new Int16Array(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength))
}

function tileUnder(latDeg, lonDeg) {
  const [px, py] = unitToPolarXY(latLonToUnit(latDeg, lonDeg))
  return [Math.floor((originY - py) / tileM), Math.floor((px - originX) / tileM)]
}

/* As linhas e colunas dos ladrilhos de um bloco. */
function blockBounds(block) {
  const cells = block.map((tile) => tile.match(/^r(\d+)c(\d+)$/).slice(1).map(Number))
  const rows = cells.map(([r]) => r)
  const columns = cells.map(([, c]) => c)
  return { minRow: Math.min(...rows), maxRow: Math.max(...rows), minColumn: Math.min(...columns), maxColumn: Math.max(...columns) }
}

describe('nearTileBlock', () => {
  it.each([
    [NEAR_CENTER_TILES, -89.6, 40],
    [NEAR_CENTER_TILES, -89.9, -120],
    [NEAR_CENTER_TILES, -88.2, 75],
    [NEAR_CENTER_TILES, -87.5, 190],
    [NEAR_RING_TILES, -89.6, 40],
    [NEAR_RING_TILES, -89.9, -120],
    [NEAR_RING_TILES, -88.2, 75],
  ])('com %s ladrilhos de lado, em (%s°, %s°), pega o quadrado inteiro, com o ponto longe da borda', (size, latDeg, lonDeg) => {
    const block = nearTileBlock(manifest, cameraAbove(latDeg, lonDeg), size)
    expect(block).toHaveLength(size * size)
    const { minRow, maxRow, minColumn, maxColumn } = blockBounds(block)
    expect([maxRow - minRow, maxColumn - minColumn]).toEqual([size - 1, size - 1])
    // o ponto embaixo da câmera, na projeção, fica a pelo menos meio ladrilho a menos que a metade
    // do bloco da borda dele: 10 km no centro, 50 km no anel. É o centro da tela.
    const [px, py] = unitToPolarXY(latLonToUnit(latDeg, lonDeg))
    const left = originX + minColumn * tileM
    const top = originY - minRow * tileM
    const margin = (size / 2 - 0.5) * tileM - 1e-6
    expect(px - left).toBeGreaterThanOrEqual(margin)
    expect(left + size * tileM - px).toBeGreaterThanOrEqual(margin)
    expect(top - py).toBeGreaterThanOrEqual(margin)
    expect(py - (top - size * tileM)).toBeGreaterThanOrEqual(margin)
    // e o ladrilho embaixo da câmera está no bloco
    const [r, c] = tileUnder(latDeg, lonDeg)
    expect(block).toContain(name(r, c))
  })

  it('o anel tem o centro dentro dele: os ladrilhos do centro são também do anel', () => {
    const position = cameraAbove(-88.2, 75)
    const ring = nearTileBlock(manifest, position, NEAR_RING_TILES)
    for (const tile of nearTileBlock(manifest, position, NEAR_CENTER_TILES)) expect(ring).toContain(tile)
  })

  it('longe da superfície, nenhum: dali o relevo fino nem aparece, e só pesaria', () => {
    const justAbove = 1 + (NEAR_MAX_ALTITUDE_M + 1000) / MOON_RADIUS_M
    expect(nearTileBlock(manifest, cameraAbove(-89.6, 40, justAbove))).toEqual([])
    expect(nearTileBlock(manifest, cameraAbove(-89.6, 40, justAbove), NEAR_RING_TILES)).toEqual([])
    const justBelow = 1 + (NEAR_MAX_ALTITUDE_M - 1000) / MOON_RADIUS_M
    expect(nearTileBlock(manifest, cameraAbove(-89.6, 40, justBelow))).toHaveLength(4)
  })

  it('fora da grade do relevo fino, nenhum', () => {
    expect(nearTileBlock(manifest, cameraAbove(-80, 0))).toEqual([])
    // em cima do polo norte, a projeção polar sul manda o ponto para o infinito
    expect(nearTileBlock(manifest, [0, MIN_DISTANCE, 0])).toEqual([])
  })

  it('logo fora da grade, nenhum, mesmo com ladrilho do lado de dentro', () => {
    // r10c19, r11c19 e r00c10 existem: sem conferir a grade, o canto mais perto pediria eles
    expect(manifest.near.tiles).toEqual(expect.arrayContaining(['r10c19', 'r11c19', 'r00c10']))
    expect(nearTileBlock(manifest, cameraAbovePolarXY(originX + 20 * tileM + 2000, originY - 10.5 * tileM))).toEqual([])
    expect(nearTileBlock(manifest, cameraAbovePolarXY(originX + 10.5 * tileM, originY + 2000))).toEqual([])
  })

  it('na borda da grade, só os ladrilhos que o manifesto tem', () => {
    // o primeiro ladrilho do manifesto fica na linha 0: a linha de cima dele não existe. Com a
    // câmera no quarto de cima dele, o canto mais perto é o de cima, e o bloco pede a linha −1
    const first = manifest.near.tiles[0]
    const [, r, c] = first.match(/^r(\d+)c(\d+)$/).map(Number)
    const block = nearTileBlock(manifest, cameraAbovePolarXY(originX + (c + 0.5) * tileM, originY - (r + 0.25) * tileM))
    expect(block).toContain(first)
    expect(block.length).toBeLessThan(4)
    for (const tile of block) expect(manifest.near.tiles).toContain(tile)
  })
})

describe.each([
  ['o centro', NEAR_CENTER_MESH],
  ['o anel', NEAR_RING_MESH],
])('nearTileGrid com a malha d%s', (_, options) => {
  const zeros = new Int16Array(tilePx * tilePx)
  const columns = (tilePx - 1 - options.start) / options.step + 1

  function meshOf(tile) {
    return buildReliefCap(nearTileGrid(manifest, tile, zeros), options).positions
  }

  it('um ladrilho vizinho começa onde o outro termina, sem fresta e sem sobra', () => {
    // a borda de cada ladrilho repete o pixel do vizinho; a malha usa a da direita e a de baixo
    // e pula a da esquerda e a de cima, então a última coluna de um é a primeira do outro. Para
    // isso o passo tem que dividir os 250 pixels do ladrilho.
    expect(options.start).toBe(manifest.near.marginPx)
    expect(Number.isInteger(columns)).toBe(true)
    const left = meshOf('r10c10')
    const right = meshOf('r10c11')
    const lastOfLeft = left.slice((columns - 1) * 3, columns * 3)
    const firstOfRight = right.slice(0, 3)
    lastOfLeft.forEach((v, i) => expect(v).toBeCloseTo(firstOfRight[i], 6))
    // e o primeiro vértice de um não repete o segundo do outro: a distância entre eles é um passo
    const secondOfRight = right.slice(3, 6)
    expect(Math.hypot(...secondOfRight.map((v, i) => v - lastOfLeft[i])) * MOON_RADIUS_M).toBeCloseTo(
      options.step * manifest.near.resolutionM,
      -1,
    )
  })

  it('com o ladrilho de verdade, cada vértice fica na altura que o motor lê no mesmo ponto', () => {
    /* A cena e o horizonte precisam ver o mesmo relevo: se a malha pegasse o pixel do lado, a
       sombra na tela não bateria com o que o painel diz. O motor lê o ladrilho com o
       tiledPolarRelief (src/engine/relief.js); com só o r10c10 carregado, os vértices da última
       coluna e linha, que já são do vizinho, dão NaN e ficam de fora. */
    const heights = readTile('r10c10')
    const tiles = []
    tiles[10 * tileColumns + 10] = heights
    const engine = tiledPolarRelief({ ...manifest.near, tiles, scale: manifest.heightScale })
    const { positions } = buildReliefCap(nearTileGrid(manifest, 'r10c10', heights), options)

    let compared = 0
    let worstM = 0
    for (let i = 0; i < positions.length; i += 3) {
      const vertex = sceneToEngine([positions[i], positions[i + 1], positions[i + 2]])
      const radius = Math.hypot(...vertex)
      const expectedM = engine.sample(...vertex.map((v) => v / radius))
      if (Number.isNaN(expectedM)) continue
      compared++
      worstM = Math.max(worstM, Math.abs((radius - 1) * MOON_RADIUS_M - expectedM))
    }
    // a última coluna e a última linha são do vizinho
    expect(compared).toBe((columns - 1) * (columns - 1))
    // a diferença é o arredondamento do Float32 das posições, uns 20 cm
    expect(worstM).toBeLessThan(0.5)
  })
})

describe('o mapa de normais de um ladrilho de verdade', () => {
  // o raio de um ponto da projeção, na cena, na altura zero
  const radialAt = (px, py) => engineToScene(polarXYToUnit(px, py))
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const normalAt = ({ normals, width }, tr, tc) => Array.from(normals.slice((tr * width + tc) * 3, (tr * width + tc) * 3 + 3))

  it('toda normal tem tamanho 1 e aponta para fora da Lua', () => {
    const grid = nearTileGrid(manifest, 'r10c10', readTile('r10c10'))
    const map = buildNormalMap(grid, { start: NEAR_CENTER_MESH.start })
    expect([map.width, map.height]).toEqual([250, 250])
    let worstLength = 0
    let inward = 0
    for (let i = 0; i < map.width * map.height; i++) {
      const n = Array.from(map.normals.slice(i * 3, i * 3 + 3))
      worstLength = Math.max(worstLength, Math.abs(Math.hypot(...n) - 1))
      const tr = Math.floor(i / map.width)
      const tc = i % map.width
      if (dot(n, radialAt(grid.x0 + (tc + 1.5) * grid.resolutionM, grid.y0 - (tr + 1.5) * grid.resolutionM)) <= 0) inward++
    }
    expect(worstLength).toBeLessThan(1e-6)
    expect(inward).toBe(0)
  })

  it.each([
    ['de lado', 'r10c11', false],
    ['de cima para baixo', 'r11c10', true],
  ])('na emenda %s entre dois ladrilhos, a normal é a mesma do relevo emendado: a luz não muda de um lado para o outro', (_, nextName, below) => {
    /* A borda de cada ladrilho repete um pixel do vizinho, e o mapa usa esse pixel na conta da
       normal da borda. O teste junta o r10c10 e o vizinho numa grade só e confere que o mapa de cada
       um bate com o da grade emendada, dos dois lados da emenda. Sem isso, cada ladrilho fazia a
       conta da borda sozinho, e a luz mudava em linha reta na emenda (visto pelo Marco em 12/11). As
       colunas e as linhas têm cada uma a sua conta, então as duas emendas são conferidas. */
    const first = readTile('r10c10')
    const next = readTile(nextName)
    const across = 2 * tilePx - 2
    const [columns, rows] = below ? [tilePx, across] : [across, tilePx]
    // (a, b): b é a posição ao longo da emenda, a é a de atravessar
    const at = (a, b) => (below ? a * columns + b : b * columns + a)
    const fromTile = (a, b) => (below ? a * tilePx + b : b * tilePx + a)
    const joined = new Int16Array(columns * rows)
    for (let b = 0; b < tilePx; b++) {
      for (let a = 0; a < tilePx; a++) joined[at(a, b)] = first[fromTile(a, b)]
      // os dois primeiros pixels do vizinho repetem os dois últimos do r10c10
      for (let a = 2; a < tilePx; a++) joined[at(tilePx - 2 + a, b)] = next[fromTile(a, b)]
    }
    const firstGrid = nearTileGrid(manifest, 'r10c10', first)
    const joinedMap = buildNormalMap({ ...firstGrid, heights: joined, columns, rows }, { start: 1 })
    const firstMap = buildNormalMap(firstGrid, { start: 1 })
    const nextMap = buildNormalMap(nearTileGrid(manifest, nextName, next), { start: 1 })
    const texel = (map, a, b) => (below ? normalAt(map, a, b) : normalAt(map, b, a))
    let worst = 0
    for (let b = 0; b < 250; b++) {
      // o último texel do r10c10 (pixel 250) e o primeiro do vizinho (pixel 1, o 251 da grade emendada)
      worst = Math.max(worst, 1 - dot(texel(firstMap, 249, b), texel(joinedMap, 249, b)))
      worst = Math.max(worst, 1 - dot(texel(nextMap, 0, b), texel(joinedMap, 250, b)))
    }
    // 1e-6 é o arredondamento do Float32; a conta de um lado só, na borda, erra uns 1e-5 ou mais
    expect(worst).toBeLessThan(1e-6)
  })

  it.each([
    ['do centro', NEAR_CENTER_MESH],
    ['do anel', NEAR_RING_MESH],
  ])('o mapa do ladrilho cobre a malha %s, e o último vértice cai na borda do mapa', (_, options) => {
    // as duas camadas usam o mesmo mapa, cada uma com o seu passo: a luz só fica no lugar certo se
    // os vértices das duas caem no mesmo pixel do mapa que o relevo deles
    const uvs = reliefUvs(nearTileGrid(manifest, 'r10c10', readTile('r10c10')), options)
    // os vértices vão dos pixels 1 a 251; o mapa vai do pixel 1 ao 250
    const columns = (tilePx - 1 - options.start) / options.step + 1
    expect(uvs.length / 2).toBe(columns * columns)
    // as coordenadas saem em Float32Array, com uns 7 algarismos
    expect(uvs[0]).toBeCloseTo(0.5 / 250, 6)
    expect(uvs[(columns - 1) * 2]).toBeCloseTo(250.5 / 250, 6)
    expect(uvs[uvs.length - 1]).toBeCloseTo(250.5 / 250, 6)
  })
})

describe('as malhas das duas camadas', () => {
  it('o centro tem um vértice a cada 400 m, e o anel, a cada 800 m', () => {
    /* Com 160 m, na janela maximizada de uma tela de 1920 × 1080, cada triângulo do centro ficava
       com uns 2 pixels, e o antisserrilhado (o MSAA que o React Three Fiber liga) pinta de novo um
       pixel para cada triângulo que encosta nele. Na Intel UHD 630, o quadro com o anel ia a 13,5 ms
       (90% abaixo de 21,7 ms), contra 9,0 ms (10,5 ms) com 400 m, e o medidor desligou o relevo fino
       (13/11). A luz vem do mapa de normais de 80 m, e não dos vértices: no mesmo lugar, a imagem
       mudou mais que 8 tons em 154 de 847.754 pixels (docs/backlog.md, C6, sexta rodada). */
    expect(NEAR_CENTER_MESH.step * manifest.near.resolutionM).toBe(400)
    expect(NEAR_RING_MESH.step * manifest.near.resolutionM).toBe(800)
  })

  it('o anel é mais ralo que o centro', () => {
    /* Embaixo do centro, a peça do anel não faz sombra (NearRelief.jsx) porque é mais lisa que ele:
       no fundo de uma cratera, ela fica acima do centro e faria sombra nele. Com o anel mais fino
       que o centro, a conta virava ao contrário. */
    expect(NEAR_RING_MESH.step).toBeGreaterThan(NEAR_CENTER_MESH.step)
  })

  it('o ladrilho inteiro vira malha, com altura de verdade', () => {
    const heights = new Int16Array(tilePx * tilePx).fill(2000) // 1 km acima da esfera
    const { positions } = buildReliefCap(nearTileGrid(manifest, 'r10c10', heights), NEAR_CENTER_MESH)
    const columns = (tilePx - 1 - NEAR_CENTER_MESH.start) / NEAR_CENTER_MESH.step + 1
    expect(positions.length / 3).toBe(columns * columns)
    // as posições saem em Float32Array, com uns 7 algarismos: 6 casas são cerca de 1 m na Lua, e
    // a altura conferida é de 1 km
    let worstM = 0
    for (let i = 0; i < positions.length; i += 3) {
      const radius = Math.hypot(positions[i], positions[i + 1], positions[i + 2])
      worstM = Math.max(worstM, Math.abs(radius - (1 + 1000 / MOON_RADIUS_M)) * MOON_RADIUS_M)
    }
    expect(worstM).toBeLessThan(1)
  })
})

/* Onde a malha de um ladrilho começa e termina na projeção, lido dos vértices dela. */
function meshExtent(tile, options) {
  const { positions } = buildReliefCap(nearTileGrid(manifest, tile, new Int16Array(tilePx * tilePx)), options)
  const extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  for (let i = 0; i < positions.length; i += 3) {
    const vertex = sceneToEngine([positions[i], positions[i + 1], positions[i + 2]])
    const length = Math.hypot(...vertex)
    const [px, py] = unitToPolarXY(vertex.map((v) => v / length))
    extent.minX = Math.min(extent.minX, px)
    extent.maxX = Math.max(extent.maxX, px)
    extent.minY = Math.min(extent.minY, py)
    extent.maxY = Math.max(extent.maxY, py)
  }
  return extent
}

describe('nearTileIndexAt e o buraco do grosso', () => {
  const r10c10 = 10 * tileColumns + 10

  it.each([
    ['o centro', NEAR_CENTER_MESH],
    ['o anel', NEAR_RING_MESH],
  ])('o ladrilho de um ponto é o que tem a malha em cima dele, dos quatro lados, com %s', (_, options) => {
    /* A malha vai do centro do primeiro pixel do ladrilho ao do primeiro do vizinho: meio pixel
       (40 m) para a direita e para baixo da borda dele na grade. Com o buraco na borda da grade, o
       grosso sumia numa faixa de 40 m à esquerda e em cima onde o fino ainda não começou, e a
       esfera aparecia por ela. As duas camadas começam no mesmo pixel, então vale para as duas. A
       folga de 2 m é o arredondamento do Float32 das posições. */
    const at = (px, py) => nearTileIndexAt(manifest, px, py)
    const { minX, maxX, minY, maxY } = meshExtent('r10c10', options)
    const middleX = (minX + maxX) / 2
    const middleY = (minY + maxY) / 2
    expect(at(middleX, middleY)).toBe(r10c10)
    expect([at(minX + 2, middleY), at(minX - 2, middleY)]).toEqual([r10c10, r10c10 - 1])
    expect([at(maxX - 2, middleY), at(maxX + 2, middleY)]).toEqual([r10c10, r10c10 + 1])
    expect([at(middleX, minY + 2), at(middleX, minY - 2)]).toEqual([r10c10, r10c10 + tileColumns])
    expect([at(middleX, maxY - 2), at(middleX, maxY + 2)]).toEqual([r10c10, r10c10 - tileColumns])
  })

  it('fora da grade, −1', () => {
    expect(nearTileIndexAt(manifest, originX - 1000, 0)).toBe(-1)
    expect(nearTileIndexAt(manifest, 0, originY + 1000)).toBe(-1)
    expect(nearTileIndexAt(manifest, -originX + 1000, 0)).toBe(-1)
    // o ponto do polo norte, que a projeção manda para o infinito: a conta dá NaN
    expect(nearTileIndexAt(manifest, NaN, NaN)).toBe(-1)
  })

  it('nearCoverMask marca os ladrilhos dados', () => {
    const mask = nearCoverMask(manifest, ['r10c10', 'r00c06'])
    expect(mask).toHaveLength(manifest.near.tileColumns * manifest.near.tileRows)
    expect(Array.from(mask.entries()).filter(([, value]) => value === 1).map(([index]) => index)).toEqual([6, r10c10])
  })

  describe('no far.bin do site', () => {
    const pasta = join(process.cwd(), 'public', 'data', 'relief')
    const arquivo = readFileSync(join(pasta, manifest.far.file))
    const heights = new Int16Array(arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength))
    const grid = { ...manifest.far, heights, heightScale: manifest.heightScale }
    const { indices } = buildReliefCap(grid)
    const labels = reliefVertexLabels(grid, (px, py) => nearTileIndexAt(manifest, px, py))
    const block = nearTileBlock(manifest, cameraAbove(-89.6, 40))
    const kept = coverTriangles(indices, labels, nearCoverMask(manifest, block))

    it('sai exatamente o quadrado com os quatro cantos embaixo do bloco', () => {
      const covered = new Set(block.map((tile) => tile.match(/^r(\d+)c(\d+)$/).slice(1).map(Number)).map(([r, c]) => r * tileColumns + c))
      const keptSet = new Set()
      for (let i = 0; i < kept.length; i += 6) keptSet.add(kept[i] * 1e7 + kept[i + 5])
      let removed = 0
      for (let i = 0; i < indices.length; i += 6) {
        const corners = [indices[i], indices[i + 1], indices[i + 2], indices[i + 5]]
        const allCovered = corners.every((vertex) => covered.has(labels[vertex]))
        expect(keptSet.has(indices[i] * 1e7 + indices[i + 5])).toBe(!allCovered)
        if (allCovered) removed++
      }
      // o mesmo buraco que a conta de antes (buildReliefIndices com nearTilesCover) abria no
      // navegador, em 11/11: 249.034 triângulos, 248.234 com o bloco de (−89,6°, 40°)
      expect(indices.length / 3).toBe(249034)
      expect(kept.length / 3).toBe(248234)
      expect(removed).toBe((249034 - 248234) / 2)
    })
  })
})

describe('nearTilesStep', () => {
  // as alturas de um ladrilho que chegou; o conteúdo não importa aqui
  const arrived = new Int16Array(1)
  const builtOf = (...names) => (tile) => names.includes(tile)

  it('monta um ladrilho por quadro, na ordem do bloco', () => {
    const heights = new Map([
      ['r10c11', arrived],
      ['r10c10', arrived],
    ])
    const block = ['r10c10', 'r10c11']
    expect(nearTilesStep(block, heights, builtOf())).toEqual({ build: 'r10c10', ready: null })
    expect(nearTilesStep(block, heights, builtOf('r10c10'))).toEqual({ build: 'r10c11', ready: null })
  })

  it('monta o ladrilho que chegou sem esperar os outros: a troca sai assim que o último chegar', () => {
    // esperando o bloco inteiro para montar, os quatro seriam montados só no fim, em quatro quadros
    // seguidos, e a troca atrasaria mais três quadros
    expect(nearTilesStep(['r10c10', 'r10c11'], new Map([['r10c10', arrived]]), builtOf())).toEqual({
      build: 'r10c10',
      ready: null,
    })
  })

  it('com o bloco inteiro montado, ele vai para a tela, na ordem do bloco', () => {
    const heights = new Map([
      ['r10c11', arrived],
      ['r10c10', arrived],
    ])
    expect(nearTilesStep(['r10c10', 'r10c11'], heights, builtOf('r10c10', 'r10c11'))).toEqual({
      build: null,
      ready: ['r10c10', 'r10c11'],
    })
  })

  it('enquanto falta chegar um ladrilho do bloco, nada muda na tela: o bloco de antes continua', () => {
    // sem isto, os ladrilhos que saem do bloco sumiam antes de os novos chegarem, e o grosso
    // cobria o lugar por alguns quadros: o relevo fino piscava a cada troca de bloco
    const block = ['r10c10', 'r10c11']
    expect(nearTilesStep(block, new Map([['r10c10', arrived]]), builtOf('r10c10'))).toEqual({ build: null, ready: null })
    expect(nearTilesStep(block, new Map(), builtOf())).toEqual({ build: null, ready: null })
  })

  it('o ladrilho que falhou não segura o bloco: os outros entram, e o grosso cobre o lugar dele', () => {
    const heights = new Map([
      ['r10c10', arrived],
      ['r10c11', null],
    ])
    expect(nearTilesStep(['r10c10', 'r10c11'], heights, builtOf('r10c10'))).toEqual({ build: null, ready: ['r10c10'] })
  })

  it('sem bloco (a câmera subiu ou saiu da grade), o relevo fino sai da tela na hora', () => {
    expect(nearTilesStep([], new Map(), builtOf('r10c10'))).toEqual({ build: null, ready: [] })
  })
})

describe('nearFrameStep, as duas camadas num quadro', () => {
  const arrived = new Int16Array(1)
  const all = (names) => new Map(names.map((tile) => [tile, arrived]))
  const ringNames = Array.from({ length: 12 }, (_, i) => name(10 + Math.floor(i / 4), 10 + (i % 4)))
  const centerNames = ['r10c10', 'r10c11']
  // o que já está montado: as malhas do centro e do anel, e os mapas de normais (por padrão, o dos
  // ladrilhos com alguma malha)
  const builtOf = (center, ring, maps = [...center, ...ring]) => (tile, layer) =>
    (layer === 'center' ? center : layer === 'ring' ? ring : maps).includes(tile)
  const layer = (block, heights, shown = []) => ({ block, heights, shown })

  it('o centro monta primeiro, um ladrilho em dois quadros: o mapa de normais e depois a malha', () => {
    // o quadro do mapa, com a subida da textura, leva uns 9 ms (até uns 25): a malha fica para o
    // seguinte, para ele não ficar mais longo
    const first = nearFrameStep({
      center: layer(centerNames, all(centerNames)),
      ring: layer(ringNames, all(ringNames)),
      isBuilt: builtOf([], [], []),
    })
    expect(first).toEqual({ build: [['r10c10', 'map']], center: null, ring: null })
    const second = nearFrameStep({
      center: layer(centerNames, all(centerNames)),
      ring: layer(ringNames, all(ringNames)),
      isBuilt: builtOf([], [], ['r10c10']),
    })
    expect(second).toEqual({ build: [['r10c10', 'center']], center: null, ring: null })
  })

  it('o anel monta várias peças por quadro: com o mapa pronto, cada uma é barata', () => {
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames), centerNames),
      ring: layer(ringNames, all(ringNames)),
      isBuilt: builtOf(centerNames, centerNames, ringNames),
    })
    const pending = ringNames.filter((tile) => !centerNames.includes(tile))
    expect(step.build).toEqual(pending.slice(0, NEAR_RING_BUILDS_PER_FRAME).map((tile) => [tile, 'ring']))
    expect([step.center, step.ring]).toEqual([null, null])
  })

  it('no anel, um mapa de normais por quadro, junto com as malhas dos que já têm o mapa', () => {
    const pending = ringNames.filter((tile) => !centerNames.includes(tile))
    const withMap = pending.slice(0, 3)
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames), centerNames),
      ring: layer(ringNames, all(ringNames)),
      isBuilt: builtOf(centerNames, centerNames, [...centerNames, ...withMap]),
    })
    expect(step.build).toEqual([...withMap.map((tile) => [tile, 'ring']), [pending[3], 'map']])
  })

  it('o centro só troca com a malha de 800 m dos ladrilhos dele montada também', () => {
    // ela passa por baixo do centro e tapa a fresta na emenda dele com o anel, também quando o
    // anel na tela é o de antes e não chega até ali (um arrasto de 4 ladrilhos)
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames)),
      ring: layer([], new Map()),
      isBuilt: builtOf(centerNames, []),
    })
    expect(step).toEqual({ build: centerNames.map((tile) => [tile, 'ring']), center: null, ring: null })
  })

  it('a troca do centro sai sem montagem no mesmo quadro, e o anel monta depois', () => {
    // a troca e a montagem juntas fariam um quadro longo
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames)),
      ring: layer(ringNames, all(ringNames)),
      isBuilt: builtOf(centerNames, centerNames),
    })
    expect(step).toEqual({ build: [], center: centerNames, ring: null })
  })

  it('o ladrilho do anel que falhou não é montado nem segura o anel: o grosso cobre o lugar dele', () => {
    const failed = ringNames[5]
    expect(centerNames).not.toContain(failed)
    const heights = all(ringNames)
    heights.set(failed, null)
    const ok = ringNames.filter((tile) => tile !== failed)
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames), centerNames),
      ring: layer(ringNames, heights),
      isBuilt: builtOf(centerNames, ok),
    })
    expect(step).toEqual({ build: [], center: null, ring: ok })
  })

  it('o ladrilho do centro que ainda não chegou não é montado, nem a peça dele do anel', () => {
    // sem as alturas não há mapa de normais, e a cena quebraria no quadro (NearRelief.jsx pega o
    // mapa do ladrilho para montar a malha); o caso é comum: um dos 4 ainda baixando
    const step = nearFrameStep({
      center: layer(centerNames, all(['r10c10'])),
      ring: layer([], new Map()),
      isBuilt: builtOf(['r10c10'], ['r10c10']),
    })
    expect(step).toEqual({ build: [], center: null, ring: null })
  })

  it('o mapa de normais do anel é o de um ladrilho que chegou, mesmo com um que falhou antes dele no bloco', () => {
    const failed = ringNames[2]
    expect(centerNames).not.toContain(failed)
    const heights = all(ringNames)
    heights.set(failed, null)
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames), centerNames),
      ring: layer(ringNames, heights),
      isBuilt: builtOf(centerNames, centerNames),
    })
    expect(step.build).toEqual([[ringNames[3], 'map']])
  })

  it('com tudo montado, as duas camadas trocam no mesmo quadro', () => {
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames)),
      ring: layer(ringNames, all(ringNames)),
      isBuilt: builtOf(centerNames, ringNames),
    })
    expect(step).toEqual({ build: [], center: centerNames, ring: ringNames })
  })

  it('o que já está na tela não troca de novo', () => {
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames), centerNames),
      ring: layer(ringNames, all(ringNames), ringNames),
      isBuilt: builtOf(centerNames, ringNames),
    })
    expect(step).toEqual({ build: [], center: null, ring: null })
  })

  it('o anel espera o bloco inteiro dele, como o centro', () => {
    const missing = ringNames[5]
    const arrivedRing = ringNames.filter((tile) => tile !== missing)
    const step = nearFrameStep({
      center: layer(centerNames, all(centerNames), centerNames),
      ring: layer(ringNames, all(arrivedRing), []),
      isBuilt: builtOf(centerNames, arrivedRing),
    })
    expect(centerNames).not.toContain(missing)
    expect(step).toEqual({ build: [], center: null, ring: null })
  })
})

describe('nearRingBlock, quando o anel é pedido', () => {
  const position = cameraAbove(-88.2, 75)
  const center = nearTileBlock(manifest, position)
  const ringNow = nearTileBlock(manifest, position, NEAR_RING_TILES)
  const before = ['r09c09']

  it('com o centro desta posição na tela, no degrau de cima, pede o anel em volta da câmera', () => {
    const ring = nearRingBlock(manifest, position, { centerBlock: center, centerShown: center, level: NEAR_RING_LEVEL, ring: before })
    expect(ring).toEqual(ringNow)
    expect(ring).toHaveLength(36)
  })

  it('enquanto o centro desta posição não está na tela, fica o pedido de antes', () => {
    // arrastando, o centro troca a cada bloco do caminho: pedir os 36 de cada um baixaria à toa
    expect(nearRingBlock(manifest, position, { centerBlock: center, centerShown: [], level: NEAR_RING_LEVEL, ring: before })).toBe(before)
    const elsewhere = nearTileBlock(manifest, cameraAbove(-89.6, 40))
    expect(nearRingBlock(manifest, position, { centerBlock: elsewhere, centerShown: elsewhere, level: NEAR_RING_LEVEL, ring: before })).toBe(
      before,
    )
  })

  it('com um ladrilho do centro que falhou, o anel é pedido do mesmo jeito', () => {
    // sem isto, o anel inteiro ficava de fora enquanto a câmera não saísse do bloco, e não só o
    // lugar do ladrilho que falhou
    const heights = new Map(center.map((tile) => [tile, new Int16Array(1)]))
    heights.set(center[1], null)
    const shown = center.filter((tile) => tile !== center[1])
    const options = { centerBlock: center, centerShown: shown, level: NEAR_RING_LEVEL, ring: before }
    expect(nearRingBlock(manifest, position, { ...options, centerHeights: heights })).toEqual(ringNow)
    // o ladrilho que ainda não chegou (e não falhou) continua segurando o anel
    const waiting = new Map(heights)
    waiting.delete(center[1])
    expect(nearRingBlock(manifest, position, { ...options, centerHeights: waiting })).toBe(before)
  })

  it('abaixo do degrau do anel (o medidor desceu), nenhum', () => {
    expect(nearRingBlock(manifest, position, { centerBlock: center, centerShown: center, level: NEAR_RING_LEVEL - 1, ring: before })).toEqual(
      [],
    )
  })

  it('com a câmera alta, o centro vazio na tela e o anel vazio também', () => {
    const high = cameraAbove(-88.2, 75, 1 + (NEAR_MAX_ALTITUDE_M + 1000) / MOON_RADIUS_M)
    expect(nearRingBlock(manifest, high, { centerBlock: [], centerShown: [], level: NEAR_RING_LEVEL, ring: ringNow })).toEqual([])
  })
})

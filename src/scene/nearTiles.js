/* Quais ladrilhos do relevo fino a cena desenha, e como cada um vira malha (card C6).
 *
 * O relevo fino (80 m por pixel, ladrilhos de 20 km, card E2) só aparece de perto: de longe, um
 * pixel dele fica menor que um pixel da tela e só pesaria. Ele vem em duas camadas, em volta do
 * ponto que fica embaixo da câmera: o centro, com 2 × 2 ladrilhos e um vértice a cada 400 m, e o
 * anel, com 6 × 6 ladrilhos e um vértice a cada 800 m, que cobre a tela inteira na distância
 * mínima. O anel inclui os ladrilhos do centro, desenhados por baixo dele: assim não sobra fresta
 * na emenda entre as duas camadas (reliefLayers.js diz quem aparece por cima de quem). A câmera
 * sempre olha para o centro da Lua (o alvo dos controles), então o ponto embaixo dela é o centro
 * da tela.
 *
 * Este arquivo não conhece o three nem o React: devolve nomes de ladrilho e números, e é testado
 * no Node, como o reliefMesh.js.
 */
import { MOON_RADIUS_M, unitToPolarXY } from '../engine/geometry.js'
import { sceneToEngine } from './coordinates.js'

/* Até que altura da câmera, acima da esfera de raio 1, o relevo fino aparece. Daqui a câmera vê
   uns 120 km de altura na tela: com uns 600 pixels de altura, cada um cobre uns 200 m, e o relevo
   grosso, com um vértice a cada 1,9 km, já mostra os triângulos. Mais alto, os 80 m do mapa de
   normais do relevo fino somem no pixel: a 80 km, cada pixel da tela já cobre de 2 a 2,6 pixels do
   mapa (com 761 ou 600 pixels de altura). A distância mínima dos controles fica a uns 35 km
   (LunarScene.jsx). */
export const NEAR_MAX_ALTITUDE_M = 80000

/* Quantos ladrilhos de lado tem o centro: 2 dá 40 km de lado, em volta do canto de ladrilho mais
   perto do ponto embaixo da câmera. Assim o centro da tela fica a pelo menos 10 km da borda dele.
   Na distância mínima, a tela vê uns 27 km para cima e para baixo do centro (o fov de 75° do React
   Three Fiber): o centro cobre o meio dela, que é para onde a pessoa olha. O número tem que ser
   par, aqui e no anel: o bloco fica com metade dele de cada lado do canto, e com um ímpar a metade
   não seria um número inteiro de ladrilhos.
   Medido em 11/11/2026 com o cronômetro da placa de vídeo (EXT_disjoint_timer_query_webgl2), numa
   Intel UHD 630, a câmera na distância mínima e o centro ainda a 160 m: com 3 × 3, 12,8 ms por
   quadro (p95 de 16,3 ms), no limite dos 16,7 ms. Numa segunda rodada, com a tela de 538 × 584
   pixels: sem o relevo fino, 4,7 ms (p95 de 6,2 ms); com 2 × 2, de 9,4 a 10,9 ms (p95 de 11,4 a
   11,9 ms). Em 13/11, com o centro a 400 m e a tela de 1114 × 761 (a janela maximizada de uma tela
   de 1920 × 1080): sem o relevo fino, 5,9 ms (90% dos quadros abaixo de 7,8 ms); só o centro,
   6,9 ms (8,0 ms); o centro e o anel, 9,0 ms (10,5 ms). O 3 × 3 a 400 m não foi medido. */
export const NEAR_CENTER_TILES = 2

/* Quantos ladrilhos de lado tem o anel: 6 dá 120 km de lado, e o centro da tela fica a pelo menos
   50 km da borda de fora. Na distância mínima (uns 35 km de altitude), a tela vê uns 27 km para
   cima e para baixo e, numa janela com proporção de até 1,8 (largura sobre altura), até uns 48 km
   para os lados: fica coberta. Mais alto, as beiradas de uma janela larga ficam no relevo grosso
   (com a proporção de 1,5, a partir de uns 43 km de altitude), e com o Sol baixo a borda do anel
   fica um pouco mais clara que o grosso (docs/backlog.md, C6, "Aberto"). São 36 ladrilhos de 1.250
   triângulos: 45 mil, mais que os 20 mil do centro. */
export const NEAR_RING_TILES = 6

/* Como cada ladrilho do centro vira malha (buildReliefCap). Um vértice a cada 5 pixels, ou 400 m:
   cada ladrilho fica com 2.601 vértices e 5.000 triângulos. A borda e o fundo de uma cratera de
   1 km vêm do mapa de normais de 80 m (buildNormalMap), e não dos vértices; a malha só dá a altura,
   que a câmera, olhando sempre para o centro da Lua, quase não vê.
   Até 13/11 eram 160 m. Na janela maximizada de uma tela de 1920 × 1080, um pixel da tela cobre uns
   70 m na distância mínima, e cada triângulo ficava com uns 2 pixels; o antisserrilhado (o MSAA que
   o React Three Fiber liga) pinta de novo um pixel para cada triângulo que encosta nele. Na Intel
   UHD 630, 1 quadro em cada 10 passava de 18 ms, e o medidor desligou o relevo fino. Com 400 m,
   cada triângulo tem uns 6 pixels, 9 em cada 10 quadros ficam abaixo de 14 ms, e a imagem quase
   não muda (docs/backlog.md, C6, sexta rodada). O passo tem que dividir os 250 pixels do ladrilho
   (2, 5, 10...): com 3 ou 4, a malha não chegaria à borda do vizinho e abriria uma fresta.
   O start pula a borda da esquerda e a de cima, que repetem o vizinho: a malha de um ladrilho
   termina na borda da direita, que é o primeiro pixel usado do vizinho. Sem isso, dois ladrilhos
   vizinhos teriam uma faixa de 80 m desenhada duas vezes ou uma fresta.
   O reachM infinito no nearTileGrid desliga a borda que desce até a esfera: isso só vale para o
   relevo grosso, que termina em volta de 77°S. */
export const NEAR_CENTER_MESH = { step: 5, start: 1, overlapM: 0 }

/* Como cada ladrilho do anel vira malha: um vértice a cada 10 pixels, ou 800 m, 1.250 triângulos,
   4 vezes menos que o centro, e ainda 2,4 vezes mais fino que o relevo grosso. O passo divide os
   250 pixels; o 8 (640 m) não dividiria e abriria fresta. O start é o mesmo do centro: as malhas
   das duas camadas vão até o mesmo lugar (nearTileIndexAt conta com isso). */
export const NEAR_RING_MESH = { step: 10, start: 1, overlapM: 0 }

/* Os degraus do medidor (frameBudget.js, levels): 2, o centro e o anel; 1, só o centro. O anel só
   aparece no degrau NEAR_RING_LEVEL. */
export const NEAR_LEVELS = 2
export const NEAR_RING_LEVEL = 2

/* Quantas malhas do anel são montadas num quadro, com o mapa de normais do ladrilho já pronto.
   Montar uma leva uns 0,4 ms (medido no navegador do CIT-DES06): 8 são uns 3 ms, ao lado do mapa
   de um ladrilho (um por quadro, nearFrameStep, que diz quanto ele leva). Uma malha do centro, a
   400 m, leva uns 2 ms, e vai num quadro só dela. */
export const NEAR_RING_BUILDS_PER_FRAME = 8

// o mesmo formato de nome do reliefFiles.js e dos arquivos de public/data/relief/near/
const tileName = (r, c) => `r${String(r).padStart(2, '0')}c${String(c).padStart(2, '0')}`

function parseTileName(name) {
  const [, r, c] = name.match(/^r(\d+)c(\d+)$/)
  return [Number(r), Number(c)]
}

export const sameNames = (a, b) => a.length === b.length && a.every((name, i) => name === b[i])

/* manifest: o manifest.json do relevo. cameraPosition: a posição da câmera na cena, em raios da
   Lua. size: quantos ladrilhos de lado (NEAR_CENTER_TILES ou NEAR_RING_TILES). Devolve os nomes
   dos ladrilhos do bloco que existem no manifesto (o script só gravou os que algum ponto da área
   usa), ou nenhum se a câmera estiver alta ou longe da grade. */
export function nearTileBlock(manifest, cameraPosition, size = NEAR_CENTER_TILES) {
  const length = Math.hypot(...cameraPosition)
  if ((length - 1) * MOON_RADIUS_M > NEAR_MAX_ALTITUDE_M) return []
  const [px, py] = unitToPolarXY(sceneToEngine(cameraPosition).map((v) => v / length))
  const { tileM, originX, originY, tileColumns, tileRows, tiles } = manifest.near
  const column = Math.floor((px - originX) / tileM)
  const row = Math.floor((originY - py) / tileM)
  // escrito assim para um NaN (a câmera em cima do polo norte) também ficar de fora
  if (!(column >= 0 && row >= 0 && column < tileColumns && row < tileRows)) return []

  // o canto de ladrilho mais perto do ponto: o bloco fica com ele no meio
  const cornerColumn = Math.round((px - originX) / tileM)
  const cornerRow = Math.round((originY - py) / tileM)
  const half = size / 2
  const existing = new Set(tiles)
  const names = []
  for (let r = cornerRow - half; r < cornerRow + half; r++) {
    for (let c = cornerColumn - half; c < cornerColumn + half; c++) {
      const name = tileName(r, c)
      if (existing.has(name)) names.push(name)
    }
  }
  return names
}

/* A grade de um ladrilho no formato do buildReliefCap: as alturas dele (tilePx × tilePx, a linha 0
   em cima, com a borda repetida do vizinho) e onde o primeiro pixel fica na projeção, a mesma conta
   do tiledPolarRelief (src/engine/relief.js). */
export function nearTileGrid(manifest, name, heights) {
  const { tileM, tilePx, marginPx, resolutionM, originX, originY } = manifest.near
  const [r, c] = parseTileName(name)
  const margin = marginPx * resolutionM
  return {
    heights,
    heightScale: manifest.heightScale,
    resolutionM,
    reachM: Infinity,
    x0: originX + c * tileM - margin,
    y0: originY - r * tileM + margin,
    columns: tilePx,
    rows: tilePx,
  }
}

/* O ladrilho cuja malha fica em cima de um ponto da projeção: o número dele na grade (linha ×
   colunas + coluna), ou −1 fora da grade. É o rótulo dos vértices do relevo grosso para o buraco
   embaixo do fino (reliefVertexLabels e coverTriangles, em reliefMesh.js): numa cratera, o grosso
   (a média de 1,9 km) fica acima do fundo e cobriria o fino.
   A malha de um ladrilho não fica exatamente na borda dele na grade: ela vai do centro do primeiro
   pixel usado ao do primeiro pixel do vizinho, meio pixel (40 m) para a direita e para baixo. Sem
   esse deslocamento, o buraco abria 40 m antes de o fino começar, à esquerda e em cima, e a esfera
   lisa aparecia pela fresta. */
export function nearTileIndexAt(manifest, px, py) {
  const { tileM, marginPx, resolutionM, originX, originY, tileColumns, tileRows } = manifest.near
  const shiftM = (NEAR_CENTER_MESH.start - marginPx + 0.5) * resolutionM
  const column = Math.floor((px - originX - shiftM) / tileM)
  const row = Math.floor((originY - shiftM - py) / tileM)
  // escrito assim para um NaN (o ponto do polo norte) também ficar de fora
  if (!(column >= 0 && row >= 0 && column < tileColumns && row < tileRows)) return -1
  return row * tileColumns + column
}

/* Um Uint8Array com 1 no número de cada ladrilho dado (nearTileIndexAt): o covered do
   coverTriangles. */
export function nearCoverMask(manifest, names) {
  const { tileColumns, tileRows } = manifest.near
  const mask = new Uint8Array(tileColumns * tileRows)
  for (const name of names) {
    const [r, c] = parseTileName(name)
    mask[r * tileColumns + c] = 1
  }
  return mask
}

/* O que uma camada do relevo fino faz neste quadro. block: os ladrilhos que a câmera pede agora
   (nearTileBlock). heights: o que já chegou deles (useNearTiles), com null no que falhou.
   isBuilt(name): se a malha dele já está montada.
   Devolve { build, ready }:
   - build: o ladrilho para montar agora, ou null.
   - ready: os ladrilhos que vão para a tela, quando o bloco inteiro já chegou (ou falhou) e está
     montado; null enquanto falta algum. Com null, o bloco de antes continua na tela. Trocando
     antes, os ladrilhos que saem do bloco sumiam antes de os novos chegarem, e o grosso cobria o
     lugar por alguns quadros: o relevo fino piscava a cada troca de bloco. O que falhou fica de
     fora, e ali o grosso cobre. */
export function nearTilesStep(block, heights, isBuilt) {
  const build = block.find((name) => heights.get(name) && !isBuilt(name)) ?? null
  if (build || !block.every((name) => heights.has(name))) return { build, ready: null }
  return { build: null, ready: block.filter((name) => heights.get(name)) }
}

/* O que as duas camadas fazem neste quadro (NearRelief). center e ring: { block, heights, shown }
   de cada uma (shown: os nomes na tela agora). isBuilt(name, kind), com kind 'map' (o mapa de
   normais do ladrilho, buildNormalMap, que as duas camadas usam), 'center' ou 'ring' (a malha).
   Devolve { build, center, ring }:
   - build: o que montar neste quadro, pares [nome, kind]. Um ladrilho do centro leva dois quadros:
     num, o mapa e a subida dele para a placa de vídeo (uns 3 ms e mais uns 6 ms, até uns 25 ms
     juntos); no seguinte, a malha (uns 2 ms, até 3 ms), medidos no navegador do CIT-DES06 em
     13/11/2026. A malha de 400 m caberia no quadro do mapa e pouparia 4 quadros na primeira
     aproximação, mas o quadro do mapa já é o mais longo da montagem. As malhas do anel com o mapa
     pronto são baratas (0,4 ms) e vão até NEAR_RING_BUILDS_PER_FRAME, junto com um mapa. O centro
     vem primeiro: é o meio da tela.
   - center e ring: a lista nova da camada para a tela, ou null se ela não muda. A troca do centro
     sai num quadro sem montagem: as duas juntas fariam um quadro longo.
   Cada ladrilho do centro leva também a peça dele do anel, que a cena desenha por baixo (o anel de
   800 m embaixo do centro, reliefLayers.js), e o centro só troca com ela montada. Assim a emenda do
   centro sempre tem o anel embaixo, também quando o anel na tela é o de antes e não chega até ali
   (num arrasto de 4 ladrilhos): sem nada embaixo, a junção da borda do centro com a de 800 m, que
   não se encontram vértice a vértice, deixava pontos do fundo aparecendo. */
export function nearFrameStep({ center, ring, isBuilt }) {
  const centerStep = nearTilesStep(center.block, center.heights, (name) => isBuilt(name, 'map') && isBuilt(name, 'center'))
  if (centerStep.build) {
    const kind = isBuilt(centerStep.build, 'map') ? 'center' : 'map'
    return { build: [[centerStep.build, kind]], center: null, ring: null }
  }
  const underlays = center.block.filter((name) => center.heights.get(name) && !isBuilt(name, 'ring'))
  if (underlays.length > 0) return { build: underlays.map((name) => [name, 'ring']), center: null, ring: null }
  const centerSwap = centerStep.ready && !sameNames(centerStep.ready, center.shown) ? centerStep.ready : null

  const ringPending = ring.block.filter((name) => ring.heights.get(name) && !isBuilt(name, 'ring'))
  if (!centerSwap && ringPending.length > 0) {
    const cheap = ringPending.filter((name) => isBuilt(name, 'map')).slice(0, NEAR_RING_BUILDS_PER_FRAME)
    const nextMap = ringPending.find((name) => !isBuilt(name, 'map'))
    const build = [...cheap.map((name) => [name, 'ring']), ...(nextMap ? [[nextMap, 'map']] : [])]
    return { build, center: null, ring: null }
  }

  const ringStep = nearTilesStep(ring.block, ring.heights, (name) => isBuilt(name, 'ring'))
  const ringSwap = ringStep.ready && !sameNames(ringStep.ready, ring.shown) ? ringStep.ready : null
  return { build: [], center: centerSwap, ring: ringSwap }
}

/* Os ladrilhos do anel que a cena pede agora (NearRelief). level: o degrau do medidor. ring: o
   pedido de agora. centerHeights: o que chegou do centro (useNearTiles), com null no que falhou.
   O anel só é pedido no degrau de cima e com o centro da posição de agora já na tela: arrastando,
   o centro troca a cada bloco do caminho, e pedir os 36 ladrilhos de cada um baixaria uns 54
   ladrilhos num arrasto de 10 pixels; pedindo o anel só onde a câmera para, 42, e o centro do fim
   chega depois dos mesmos 2,3 MB do centro sozinho (simulado no Node com a memória da página,
   numa revisão do desenho em 12/11). Enquanto isso, fica o pedido de antes, e o anel de antes
   continua na tela. O ladrilho do centro que falhou não conta: ele nunca vai para a tela, e
   esperar por ele deixaria o anel inteiro de fora enquanto a câmera não saísse do bloco. */
export function nearRingBlock(manifest, cameraPosition, { centerBlock, centerShown, centerHeights = new Map(), level, ring }) {
  if (level < NEAR_RING_LEVEL) return []
  const centerNow = nearTileBlock(manifest, cameraPosition, NEAR_CENTER_TILES)
  const centerSettled = centerBlock.filter((name) => centerHeights.get(name) !== null)
  if (!sameNames(centerNow, centerBlock) || !sameNames(centerSettled, centerShown)) return ring
  return nearTileBlock(manifest, cameraPosition, NEAR_RING_TILES)
}

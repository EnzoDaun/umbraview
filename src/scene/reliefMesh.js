/* A malha do relevo do polo sul (card C2), a partir do relevo grosso do card E2 (far.bin).
 *
 * A grade do far.bin está na projeção polar dos arquivos LOLA: 802 × 802 alturas, 960 m por pixel,
 * a linha 0 é a de cima. Cada pixel vira um vértice no lugar dele na Lua (polarXYToUnit), na altura
 * real: o raio da cena é 1, e a altura entra como fração do raio da Lua. Sem exagero de propósito:
 * a altura exagerada alonga a sombra na mesma proporção, e a cena mostraria sombra onde o motor diz
 * que o Sol está à vista (decisão do Marco no C2, 06/11/2026).
 *
 * Só ficam os pixels até o reachM do manifesto, o círculo que o script garante ter dado. Na borda,
 * a altura vai a zero aos poucos, para a malha encostar na esfera lisa do resto da Lua. Essa faixa
 * fica por volta de 77°S, longe da área que a pessoa escolhe (até 84°S, card E2).
 *
 * Este arquivo não conhece o three: devolve números, e a cena monta a geometria com eles. Assim a
 * conta é testada no Node, sem WebGL.
 */
import { MOON_RADIUS_M, polarXYToUnit } from '../engine/geometry.js'
import { engineToScene } from './coordinates.js'

/* Um vértice a cada 2 pixels: 1,9 km entre vértices e uns 126 mil vértices no círculo. Com todos os
   pixels seriam 4 vezes mais, e cada um é desenhado duas vezes por quadro (a cena e a sombra). O C4
   mede o peso nos notebooks da equipe; se sobrar folga, este número pode cair para 1. */
export const RELIEF_STEP = 2

/* Quanto a esfera lisa entra por baixo da malha. A borda da malha é feita de quadradinhos da
   grade, então fica dentesada até um passo da grade inteiro (√2 · 2 · 960 m ≈ 2,7 km) para dentro
   do círculo; com 4 km de folga não sobra fresta entre as duas. */
export const EDGE_OVERLAP_M = 4000

/* A largura da faixa em que a altura vai a zero, antes da folga acima. Larga demais, aplainaria
   montanhas que fazem sombra na área de escolha; estreita demais, a borda vira um degrau. */
export const EDGE_FADE_M = 10000

/* Distância na projeção polar (a partir do polo) para o ângulo no centro da Lua, em radianos. A
   projeção estereográfica põe o ponto a 2R·tan(θ/2) do polo (geometry.js). */
export function polarDistanceToAngle(rhoM) {
  return 2 * Math.atan(rhoM / (2 * MOON_RADIUS_M))
}

/* O thetaLength da sphereGeometry do three (o ângulo a partir do polo norte) para a esfera lisa
   parar onde começa a malha do relevo, com a folga de EDGE_OVERLAP_M por baixo dela. */
export function smoothSphereThetaLength(reachM, overlapM = EDGE_OVERLAP_M) {
  return Math.PI - polarDistanceToAngle(reachM - overlapM)
}

/* far: o campo far do manifest.json (resolutionM, reachM, x0, y0, columns, rows), mais heights (o
   Int16Array do far.bin) e heightScale (do manifesto: metros por unidade guardada).
   Devolve { positions, indices }: três números por vértice, na cena, e três índices por
   triângulo, com a frente virada para fora da Lua (a luz do three só ilumina a frente). */
export function buildReliefCap(
  { heights, heightScale, resolutionM, reachM, x0, y0, columns, rows },
  { step = RELIEF_STEP, overlapM = EDGE_OVERLAP_M, fadeM = EDGE_FADE_M } = {},
) {
  const gridColumns = Math.floor((columns - 1) / step) + 1
  const gridRows = Math.floor((rows - 1) / step) + 1
  // de onde em diante a altura já é zero: dali para fora a esfera lisa também está desenhada
  const flatFromM = reachM - overlapM
  const vertexOf = new Int32Array(gridColumns * gridRows).fill(-1)
  const positions = []

  for (let gr = 0; gr < gridRows; gr++) {
    const r = gr * step
    const py = y0 - (r + 0.5) * resolutionM // centro do pixel; a linha 0 é a de cima
    for (let gc = 0; gc < gridColumns; gc++) {
      const c = gc * step
      const px = x0 + (c + 0.5) * resolutionM
      const rho = Math.hypot(px, py)
      if (rho > reachM) continue
      const fade = Math.max(0, Math.min(1, (flatFromM - rho) / fadeM))
      const heightM = heights[r * columns + c] * heightScale * fade
      const radius = 1 + heightM / MOON_RADIUS_M
      const [x, y, z] = engineToScene(polarXYToUnit(px, py))
      vertexOf[gr * gridColumns + gc] = positions.length / 3
      positions.push(x * radius, y * radius, z * radius)
    }
  }

  const indices = []
  for (let gr = 0; gr < gridRows - 1; gr++) {
    for (let gc = 0; gc < gridColumns - 1; gc++) {
      const a = vertexOf[gr * gridColumns + gc]
      const b = vertexOf[gr * gridColumns + gc + 1]
      const c = vertexOf[(gr + 1) * gridColumns + gc]
      const d = vertexOf[(gr + 1) * gridColumns + gc + 1]
      // quadrado com um canto fora do círculo fica de fora: a esfera lisa cobre o lugar dele
      if (a < 0 || b < 0 || c < 0 || d < 0) continue
      // Nesta ordem a frente fica para fora: a coluna cresce para −z e a linha para −x na cena, e
      // o polo sul olha para −y. A ordem contrária deixaria a Lua escura vista de fora.
      indices.push(a, c, b, b, c, d)
    }
  }

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) }
}

/* O céu de estrelas de verdade (C5): o catálogo HYG v4.4 até a magnitude 6,5, gerado por
 * scripts/prepare-data/prepare_stars.py em public/data/stars/stars.bin.
 *
 * As direções vêm no referencial equatorial J2000 e giram para o fixo da Lua pela mesma rotação do
 * Sol e da Terra (moonFixedMatrix, ephemeris.js): com outra conta, o céu da cena sairia do lugar em
 * relação à luz. As estrelas não piscam: a Lua não tem atmosfera.
 */
import { engineToScene } from './coordinates.js'

export const STARS_URL = 'data/stars/stars.bin'
const VALUES_PER_STAR = 5

/* O raio da esfera do céu, em raios da Lua: longe o bastante para a câmera mais afastada (6) não
   chegar perto, e dentro do plano mais distante que ela desenha (20). */
export const STAR_RADIUS = 12

/* O tamanho na tela, em pixels: cada magnitude a menos é 2,5 vezes mais brilho, que aqui vira um
   ponto maior. A mais fraca ainda tem 1 pixel. */
export function starSizePx(magnitude) {
  return Math.max(1, 1 + (6.5 - magnitude) * 0.55)
}

/* De 0 (azulada, B−V −0,3) a 1 (alaranjada, B−V 2). Sem B−V, a de uma estrela como o Sol (0,65). */
export function starColorMix(bv) {
  const value = Number.isNaN(bv) ? 0.65 : bv
  return Math.min(1, Math.max(0, (value + 0.3) / 2.3))
}

/* data: o Float32Array do stars.bin. matrix: os nove números do moonFixedMatrix, linha a linha.
   Devolve as posições na cena e, por estrela, o tamanho e a mistura de cor. */
export function buildStarAttributes(data, matrix) {
  const count = Math.floor(data.length / VALUES_PER_STAR)
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const mixes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const x = data[VALUES_PER_STAR * i]
    const y = data[VALUES_PER_STAR * i + 1]
    const z = data[VALUES_PER_STAR * i + 2]
    const engine = [
      matrix[0] * x + matrix[1] * y + matrix[2] * z,
      matrix[3] * x + matrix[4] * y + matrix[5] * z,
      matrix[6] * x + matrix[7] * y + matrix[8] * z,
    ]
    const scene = engineToScene(engine)
    positions[3 * i] = scene[0] * STAR_RADIUS
    positions[3 * i + 1] = scene[1] * STAR_RADIUS
    positions[3 * i + 2] = scene[2] * STAR_RADIUS
    sizes[i] = starSizePx(data[VALUES_PER_STAR * i + 3])
    mixes[i] = starColorMix(data[VALUES_PER_STAR * i + 4])
  }
  return { positions, sizes, mixes }
}

// @vitest-environment node
/* As estrelas da cena saem de public/data/stars/stars.bin, gerado por prepare_stars.py a partir do
 * catálogo HYG v4.4. Aqui o arquivo do disco é lido como a cena vai ler (Float32, 5 números por
 * estrela) e conferido contra o próprio catálogo: um arquivo cortado, fora de ordem ou com os
 * eixos trocados poria o céu errado na tela sem nenhum erro aparecer. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const FILE = fileURLToPath(new URL('../../public/data/stars/stars.bin', import.meta.url))
const FIELDS = 5 // x, y, z, magnitude, B−V
const BYTES_PER_STAR = FIELDS * Float32Array.BYTES_PER_ELEMENT
const MAX_MAGNITUDE = 6.5

/* Sirius como está no HYG v4.4 (https://codeberg.org/astronexus/hyg, data/hyg/CURRENT/
 * hyg_v44.csv.gz, linha id = 32263, lida em 15/11/2026). O x, y, z do catálogo está em parsecs
 * e, pela documentação dele (data/hyg/README.md), tem +X no equinócio vernal de 2000, +Z no polo
 * norte celeste e +Y em ascensão reta 6 h. É outra coluna, não a ra/dec que o script usa: se o
 * script lesse a ascensão reta em graus em vez de horas, ou trocasse um eixo, a direção não bateria. */
const SIRIUS = { xPc: -0.494323, yPc: 2.476731, zPc: -0.758485, magnitude: -1.44, colorIndex: 0.009 }

/* Contagens do catálogo com o filtro de magnitude ≤ 6,5 e sem o Sol, lidas da saída do
 * prepare_stars.py em 15/11/2026. */
const STAR_COUNT = 8920
const WITHOUT_COLOR_INDEX = 40

function readStars() {
  const bytes = readFileSync(FILE)
  // cópia para um ArrayBuffer alinhado: o Buffer do Node pode começar em qualquer byte do pool dele
  return {
    byteLength: bytes.byteLength,
    values: new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength - (bytes.byteLength % 4))),
  }
}

describe('estrelas do HYG em public/data/stars/stars.bin', () => {
  const { byteLength, values } = readStars()
  const count = Math.floor(values.length / FIELDS)

  it('tem 20 bytes por estrela, sem sobra, e as estrelas que o catálogo dá até a magnitude 6,5', () => {
    expect(byteLength % BYTES_PER_STAR).toBe(0)
    expect(count).toBe(STAR_COUNT)
  })

  it('guarda a direção de cada estrela como vetor de tamanho 1', () => {
    let worst = 0
    for (let i = 0; i < count; i++) {
      const [x, y, z] = values.subarray(i * FIELDS, i * FIELDS + 3)
      worst = Math.max(worst, Math.abs(Math.hypot(x, y, z) - 1))
    }
    // 1e-6: o que o arredondamento para Float32 tira de um vetor unitário
    expect(worst).toBeLessThan(1e-6)
  })

  it('só tem magnitude até 6,5, da mais brilhante para a mais fraca', () => {
    let outOfOrder = 0
    let tooFaint = 0
    for (let i = 0; i < count; i++) {
      const magnitude = values[i * FIELDS + 3]
      if (!(magnitude <= MAX_MAGNITUDE)) tooFaint++
      if (i > 0 && !(magnitude >= values[(i - 1) * FIELDS + 3])) outOfOrder++
    }
    expect(tooFaint).toBe(0)
    expect(outOfOrder).toBe(0)
  })

  it('começa por Sirius, na direção e na magnitude que o catálogo dá, sem o Sol na frente', () => {
    const [x, y, z, magnitude, colorIndex] = values.subarray(0, FIELDS)
    const distance = Math.hypot(SIRIUS.xPc, SIRIUS.yPc, SIRIUS.zPc)
    // 5 casas: o x, y, z do catálogo tem 6 casas em parsecs, a 2,6 pc de distância
    expect(x).toBeCloseTo(SIRIUS.xPc / distance, 5)
    expect(y).toBeCloseTo(SIRIUS.yPc / distance, 5)
    expect(z).toBeCloseTo(SIRIUS.zPc / distance, 5)
    expect(magnitude).toBeCloseTo(SIRIUS.magnitude, 5)
    expect(colorIndex).toBeCloseTo(SIRIUS.colorIndex, 5)
  })

  it('deixa NaN no B−V de quem não tem índice de cor no catálogo, e número em todas as outras', () => {
    let missing = 0
    for (let i = 0; i < count; i++) {
      if (Number.isNaN(values[i * FIELDS + 4])) missing++
      else expect(Number.isFinite(values[i * FIELDS + 4])).toBe(true)
    }
    expect(missing).toBe(WITHOUT_COLOR_INDEX)
  })
})

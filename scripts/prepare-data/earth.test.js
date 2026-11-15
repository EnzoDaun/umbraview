// @vitest-environment node
/* A imagem da Terra do site (public/data/earth/color.jpg, gerada por prepare_earth.py): o arquivo
 * existe, é um JPEG do tamanho combinado e cabe no limite do repositório. A vista do sistema lê a
 * imagem como latitude e longitude, duas vezes mais larga que alta; outro formato esticaria os
 * continentes na esfera. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const FILE = join(process.cwd(), 'public', 'data', 'earth', 'color.jpg')

/* A largura e a altura de um JPEG, lidas do cabeçalho dele: o bloco que começa com FF C0 (ou C1,
   C2) traz a altura e a largura em dois bytes cada. */
function jpegSize(bytes) {
  let offset = 2
  while (offset < bytes.length) {
    const marker = bytes[offset + 1]
    const length = bytes.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7), channels: bytes[offset + 9] }
    }
    offset += 2 + length
  }
  throw new Error('o arquivo não tem o bloco de tamanho de um JPEG')
}

describe('imagem da Terra em public/data/earth/color.jpg', () => {
  const bytes = readFileSync(FILE)

  it('é um JPEG colorido de 2048 × 1024, em latitude e longitude', () => {
    // todo JPEG começa com FF D8
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8])
    expect(jpegSize(bytes)).toEqual({ width: 2048, height: 1024, channels: 3 })
  })

  it('pesa pouco: bem abaixo de 1 MB, para a vista do sistema abrir rápido', () => {
    expect(bytes.length).toBeGreaterThan(50_000)
    expect(bytes.length).toBeLessThan(1_000_000)
  })
})

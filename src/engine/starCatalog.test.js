// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { STAR_STRIDE, colorIndexToKelvin, decodeStars, kelvinToRgb, starColors } from './starCatalog.js'

async function readStars() {
  const bytes = await readFile(join(process.cwd(), 'public', 'data', 'stars', 'stars.bin'))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('leitura do arquivo de estrelas', () => {
  it('separa direção, magnitude e índice de cor, na ordem do arquivo', () => {
    const data = new Float32Array([1, 0, 0, -1.44, 0.009, 0, 0.6, 0.8, 2.5, NaN])
    const { count, directions, magnitudes, colorIndex } = decodeStars(data.buffer)
    expect(count).toBe(2)
    expect(Array.from(directions)).toEqual([1, 0, 0, 0, Math.fround(0.6), Math.fround(0.8)])
    expect(Array.from(magnitudes)).toEqual([Math.fround(-1.44), 2.5])
    expect(colorIndex[0]).toBeCloseTo(0.009, 6)
    expect(colorIndex[1]).toBeNaN()
  })

  it('recusa arquivo cortado, vazio ou que não é ArrayBuffer', () => {
    // um download cortado, ou uma página de erro no lugar do arquivo, viraria estrela no céu
    expect(() => decodeStars(new ArrayBuffer(STAR_STRIDE * 4 + 3))).toThrow(/múltiplo/)
    expect(() => decodeStars(new ArrayBuffer(0))).toThrow(/múltiplo/)
    expect(() => decodeStars(Buffer.alloc(20))).toThrow(/ArrayBuffer/)
  })

  it('o arquivo do site tem só estrelas de verdade: direção de tamanho 1 e magnitude até 6,5, em ordem', async () => {
    const { count, directions, magnitudes } = decodeStars(await readStars())
    // o olho humano vê uns milhares de estrelas até a magnitude 6,5; o catálogo HYG tem perto de 9 mil
    expect(count).toBeGreaterThan(5000)
    expect(count).toBeLessThan(12000)
    for (let i = 0; i < count; i++) {
      const length = Math.hypot(directions[3 * i], directions[3 * i + 1], directions[3 * i + 2])
      expect(Math.abs(length - 1)).toBeLessThan(1e-5)
      expect(magnitudes[i]).toBeLessThanOrEqual(6.5)
      if (i > 0) expect(magnitudes[i]).toBeGreaterThanOrEqual(magnitudes[i - 1])
    }
  })
})

describe('cor da estrela pelo índice B−V', () => {
  it('a temperatura cai quando o B−V sobe, e o Sol (B−V 0,65) fica perto de 5.800 K', () => {
    expect(colorIndexToKelvin(-0.2)).toBeGreaterThan(colorIndexToKelvin(0.65))
    expect(colorIndexToKelvin(0.65)).toBeGreaterThan(colorIndexToKelvin(1.6))
    // Ballesteros (2012) dá 5.770 K para B−V = 0,65; o Sol tem 5.772 K
    expect(colorIndexToKelvin(0.65)).toBeGreaterThan(5600)
    expect(colorIndexToKelvin(0.65)).toBeLessThan(5950)
  })

  it('o corpo negro de 6.500 K cai no ponto conhecido do diagrama de cor, quase branco', () => {
    const [r, g, b] = kelvinToRgb(6500)
    // x = 0,3135 e y = 0,3237 são quase o branco do sRGB (D65: 0,3127 e 0,3290): os três canais perto de 1
    expect(Math.max(r, g, b)).toBe(1)
    expect(Math.min(r, g, b)).toBeGreaterThan(0.85)
  })

  it('estrela quente puxa para o azul, e estrela fria, para o laranja', () => {
    const hot = kelvinToRgb(20000)
    const cool = kelvinToRgb(3200)
    expect(hot[2]).toBe(1)
    expect(hot[0]).toBeLessThan(0.75)
    expect(cool[0]).toBe(1)
    expect(cool[2]).toBeLessThan(0.45)
    // nunca um canal negativo nem acima de 1, mesmo fora da faixa da aproximação
    for (const kelvin of [500, 1667, 2222, 4000, 25000, 60000]) {
      for (const channel of kelvinToRgb(kelvin)) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(1)
      }
    }
  })

  it('estrela sem B−V no catálogo fica branca, e não com uma cor inventada', () => {
    const colors = starColors(new Float32Array([NaN, 1.8]))
    expect(Array.from(colors.slice(0, 3))).toEqual([1, 1, 1])
    expect(colors[3]).toBe(1)
    expect(colors[5]).toBeLessThan(0.5)
  })
})

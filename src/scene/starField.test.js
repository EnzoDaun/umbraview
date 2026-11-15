// @vitest-environment node
import { GeoMoon, MakeTime } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'

import { moonFixedFrameAt } from '../engine/ephemeris.js'
import { engineToScene } from './coordinates.js'
import { STAR_STRIDE, parseStars, skyRotationMatrix, starBrightness, starColor } from './starField.js'

const QUANDO = Date.UTC(2026, 10, 15, 12)

function arquivoCom(estrelas) {
  const dados = new Float32Array(estrelas.flat())
  return dados.buffer
}

describe('arquivo das estrelas (parseStars)', () => {
  it('separa a direção, a magnitude e o índice de cor de cada estrela', () => {
    const estrelas = parseStars(arquivoCom([[1, 0, 0, -1.44, 0.01], [0, 0, 1, 6.5, 1.5]]))
    expect(estrelas.count).toBe(2)
    expect(Array.from(estrelas.directions)).toEqual([1, 0, 0, 0, 0, 1])
    expect(estrelas.magnitudes[0]).toBeCloseTo(-1.44, 5)
    expect(estrelas.colorIndexes[1]).toBeCloseTo(1.5, 5)
  })

  it('recusa um arquivo cortado, que não fecha em estrelas inteiras', () => {
    expect(() => parseStars(new ArrayBuffer(STAR_STRIDE * 4 + 3))).toThrow(/estrelas/)
  })
})

describe('cor e brilho de uma estrela', () => {
  it('estrela quente (B−V negativo) é azulada, e estrela fria (B−V alto) é avermelhada', () => {
    const [r1, , b1] = starColor(-0.2)
    const [r2, , b2] = starColor(1.6)
    expect(b1).toBeGreaterThan(r1)
    expect(r2).toBeGreaterThan(b2)
  })

  it('fora da faixa do catálogo, a cor para no extremo em vez de estourar', () => {
    expect(starColor(-5)).toEqual(starColor(-0.4))
    expect(starColor(9)).toEqual(starColor(2))
    for (const canal of starColor(0.65)) expect(canal).toBeGreaterThan(0)
  })

  it('quanto menor a magnitude, mais brilhante; e fica sempre entre 0 e 1', () => {
    expect(starBrightness(-1.44)).toBeGreaterThan(starBrightness(2))
    expect(starBrightness(2)).toBeGreaterThan(starBrightness(6.5))
    expect(starBrightness(-10)).toBe(1)
    expect(starBrightness(6.5)).toBeGreaterThan(0)
  })
})

describe('giro do céu na cena (skyRotationMatrix)', () => {
  it('leva uma direção do catálogo à mesma direção que o motor e a convenção da cena dão', () => {
    const m = skyRotationMatrix(QUANDO)
    const estrela = [0.6, 0.64, 0.48]
    const esperado = engineToScene(moonFixedFrameAt(QUANDO)(...estrela))
    for (let linha = 0; linha < 3; linha++) {
      // a matriz está em colunas, como o three guarda: elemento (linha, coluna) em m[coluna * 4 + linha]
      const valor = m[linha] * estrela[0] + m[4 + linha] * estrela[1] + m[8 + linha] * estrela[2]
      expect(valor).toBeCloseTo(esperado[linha], 12)
    }
    expect(m.length).toBe(16)
    expect(m[15]).toBe(1)
  })

  it('põe a Terra, vista do polo sul, baixa no céu: é o que a libração do painel mostra', () => {
    const m = skyRotationMatrix(QUANDO)
    const lua = GeoMoon(MakeTime(new Date(QUANDO)))
    const tamanho = Math.hypot(lua.x, lua.y, lua.z)
    const terra = [-lua.x / tamanho, -lua.y / tamanho, -lua.z / tamanho]
    const y = m[1] * terra[0] + m[5] * terra[1] + m[9] * terra[2]
    // o y da cena aponta para o polo norte da Lua: a Terra fica a menos de 7° do equador dela
    expect(Math.abs(Math.asin(y)) * (180 / Math.PI)).toBeLessThan(7)
  })
})

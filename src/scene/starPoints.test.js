// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  FAR_MAGNITUDE_LIMIT, NEAR_MAGNITUDE_LIMIT, magnitudeLimit, starAnchor, starBrightness, starPosition, starReveal,
  starSizePx, starVisibility,
} from './starPoints.js'

describe('tamanho e brilho da estrela na tela', () => {
  it('estrela mais brilhante (magnitude menor) nunca fica menor nem mais apagada', () => {
    const magnitudes = [-1.44, 0, 1, 2.5, 4, 5.5, 6.5]
    for (let i = 1; i < magnitudes.length; i++) {
      expect(starSizePx(magnitudes[i])).toBeLessThanOrEqual(starSizePx(magnitudes[i - 1]))
      expect(starBrightness(magnitudes[i])).toBeLessThanOrEqual(starBrightness(magnitudes[i - 1]))
    }
  })

  it('Sirius é um ponto de uns 6 px, e a estrela no limite do olho ainda aparece', () => {
    expect(starSizePx(-1.44)).toBeGreaterThan(5.5)
    expect(starSizePx(-1.44)).toBeLessThanOrEqual(6.5)
    // um ponto menor que 1 px some entre dois pixels da tela
    expect(starSizePx(6.5)).toBeGreaterThan(1)
    expect(starBrightness(6.5)).toBeGreaterThan(0.1)
    expect(starBrightness(-1.44)).toBe(1)
  })
})

describe('céu que responde ao zoom', () => {
  it('de perto não revela nada, de longe revela tudo, e nunca passa disso', () => {
    expect(starReveal(1.02, 2, 60)).toBe(0)
    expect(starReveal(2, 2, 60)).toBe(0)
    expect(starReveal(60, 2, 60)).toBe(1)
    expect(starReveal(500, 2, 60)).toBe(1)
  })

  it('cada passo da roda revela o mesmo tanto: dobrar a distância soma sempre a mesma fração', () => {
    const step = starReveal(8, 2, 64) - starReveal(4, 2, 64)
    expect(starReveal(16, 2, 64) - starReveal(8, 2, 64)).toBeCloseTo(step, 12)
    expect(starReveal(32, 2, 64) - starReveal(16, 2, 64)).toBeCloseTo(step, 12)
    // e sempre para a frente
    expect(step).toBeGreaterThan(0)
  })

  it('o limite de magnitude vai do das estrelas das constelações ao do catálogo inteiro', () => {
    expect(magnitudeLimit(0)).toBe(NEAR_MAGNITUDE_LIMIT)
    expect(magnitudeLimit(1)).toBe(FAR_MAGNITUDE_LIMIT)
    // o catálogo do site vai até a magnitude 6,5: de longe, nenhuma estrela fica de fora
    expect(starVisibility(6.5, 1)).toBe(1)
  })

  it('de perto, a estrela brilhante aparece inteira e a fraca não aparece', () => {
    expect(starVisibility(1, 0)).toBe(1)
    expect(starVisibility(6.5, 0)).toBe(0)
    // perto do limite, ela acende aos poucos
    const half = starVisibility(NEAR_MAGNITUDE_LIMIT, 0)
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(1)
  })

  it('afastar a câmera nunca apaga uma estrela que já estava à vista', () => {
    for (const magnitude of [0, 3, 4.8, 5.5, 6.5]) {
      let last = 0
      for (let reveal = 0; reveal <= 1.0001; reveal += 0.1) {
        const now = starVisibility(magnitude, Math.min(1, reveal))
        expect(now).toBeGreaterThanOrEqual(last)
        last = now
      }
    }
  })
})

describe('zoom que sai de dentro do céu', () => {
  const direction = [0.6, 0, 0.8]
  const SHELL = 300

  it('perto, o céu fica no infinito: a estrela anda com a câmera e não muda de direção', () => {
    expect(starAnchor(50, 90, 900)).toBe(0)
    for (const camera of [[4, 0, 0], [0, -30, 12], [80, 5, -20]]) {
      const star = starPosition(direction, camera, 0, SHELL)
      const fromCamera = star.map((value, i) => value - camera[i])
      const length = Math.hypot(...fromCamera)
      fromCamera.forEach((value, i) => expect(value / length).toBeCloseTo(direction[i], 12))
    }
  })

  it('longe, o céu fica preso à cena: a estrela para na casca, e a câmera se afasta dela', () => {
    expect(starAnchor(900, 90, 900)).toBe(1)
    const near = starPosition(direction, [0, 0, 1000], 1, SHELL)
    const far = starPosition(direction, [0, 0, 5000], 1, SHELL)
    expect(near).toEqual(far)
    expect(Math.hypot(...near)).toBeCloseTo(SHELL, 9)
  })

  it('de bem longe, a casca inteira cabe num canto do céu: é o aglomerado', () => {
    // vista de 6.000 raios, uma casca de 300 ocupa menos de 3° para cada lado
    const halfAngleDeg = (Math.asin(SHELL / 6000) * 180) / Math.PI
    expect(halfAngleDeg).toBeLessThan(3)
  })

  it('a passagem é contínua: no meio do caminho a estrela fica entre os dois lugares', () => {
    const camera = [0, 0, 400]
    const middle = starPosition(direction, camera, 0.5, SHELL)
    const atInfinity = starPosition(direction, camera, 0, SHELL)
    const anchored = starPosition(direction, camera, 1, SHELL)
    middle.forEach((value, i) => expect(value).toBeCloseTo((atInfinity[i] + anchored[i]) / 2, 9))
  })
})

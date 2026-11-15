// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { fitDistance } from './framing.js'

const GRAU = Math.PI / 180

/* Quanto da menor medida da tela a Lua (raio 1) ocupa, com a câmera a essa distância. */
function ocupa(distancia, fovDeg, aspect) {
  const meioVertical = (fovDeg / 2) * GRAU
  const meioHorizontal = Math.atan(Math.tan(meioVertical) * aspect)
  return Math.asin(1 / distancia) / Math.min(meioVertical, meioHorizontal)
}

describe('distância da câmera para a Lua caber na tela (fitDistance)', () => {
  it.each([
    ['tela larga, 1366 × 768', 1366 / 768],
    ['quadrada', 1],
    ['celular em pé, 390 × 844', 390 / 844],
  ])('na %s, a Lua inteira ocupa a parte pedida da menor medida', (_, aspect) => {
    const distancia = fitDistance({ fovDeg: 35, aspect, fill: 0.8 })
    expect(ocupa(distancia, 35, aspect)).toBeCloseTo(0.8, 9)
  })

  it('tela mais estreita pede a câmera mais longe', () => {
    expect(fitDistance({ fovDeg: 35, aspect: 0.5, fill: 0.8 })).toBeGreaterThan(fitDistance({ fovDeg: 35, aspect: 1.6, fill: 0.8 }))
  })
})

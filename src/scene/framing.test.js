// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { easeInOut, fitDistance, flyPosition } from './framing.js'

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

describe('o voo da câmera até o ponto escolhido (flyPosition)', () => {
  const de = [0, -4, 0.01]
  const ate = [2.8, 0, 0]
  const tamanho = (v) => Math.hypot(...v)

  it('começa onde a câmera está e termina em cima do ponto, na distância pedida', () => {
    flyPosition(de, ate, 0).forEach((v, i) => expect(v).toBeCloseTo(de[i], 9))
    flyPosition(de, ate, 1).forEach((v, i) => expect(v).toBeCloseTo(ate[i], 9))
  })

  it('no meio do caminho, dá a volta por fora da Lua, e não em linha reta por dentro dela', () => {
    const meio = flyPosition(de, ate, 0.5)
    // a distância ao centro fica entre a de saída e a de chegada: a linha reta passaria a 2,3
    expect(tamanho(meio)).toBeCloseTo((tamanho(de) + tamanho(ate)) / 2, 6)
    expect(meio[0]).toBeGreaterThan(0)
    expect(meio[1]).toBeLessThan(0)
  })

  it('para o ponto do outro lado da Lua, ainda dá um caminho, sem número quebrado', () => {
    const meio = flyPosition([0, 0, 3], [0, 0, -3], 0.5)
    for (const v of meio) expect(Number.isFinite(v)).toBe(true)
    expect(tamanho(meio)).toBeCloseTo(3, 6)
  })

  it('a curva do tempo sai devagar, corre no meio e chega devagar', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 9)
    expect(easeInOut(0.1)).toBeLessThan(0.1)
    expect(easeInOut(0.9)).toBeGreaterThan(0.9)
  })
})

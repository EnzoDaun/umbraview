import { describe, expect, it } from 'vitest'

import { HORIZON, MIN_LANDING_WINDOW_HOURS, NEAR_LAYER_UP_TO_M } from './config.js'

/* O config.js não tem conta, mas um número errado aqui muda o horizonte inteiro sem nenhum outro
   teste perceber: o motor roda com qualquer valor. Estes testes seguram o que o resto do motor
   supõe sobre eles. */

describe('parâmetros do motor (config.js)', () => {
  it('o passo ao longo do chão é de 40 m até 40 km e de 0,1% da distância dali em diante', () => {
    expect(HORIZON.step(0)).toBe(40)
    expect(HORIZON.step(39999)).toBe(40)
    expect(HORIZON.step(40000)).toBe(40)
    expect(HORIZON.step(100000)).toBe(100)
    expect(HORIZON.step(HORIZON.maxDistanceM)).toBe(200)
  })

  it('o relevo fino vale perto do ponto, antes de onde o horizonte para de olhar', () => {
    expect(NEAR_LAYER_UP_TO_M).toBeGreaterThan(0)
    expect(NEAR_LAYER_UP_TO_M).toBeLessThan(HORIZON.maxDistanceM)
  })

  it('o horizonte tem um número inteiro de direções e um mastro de altura positiva', () => {
    expect(Number.isInteger(HORIZON.directions)).toBe(true)
    expect(HORIZON.directions).toBeGreaterThan(0)
    expect(HORIZON.mastM).toBeGreaterThan(0)
  })

  it('os parâmetros do horizonte não mudam com o site rodando', () => {
    expect(Object.isFrozen(HORIZON)).toBe(true)
  })

  it('a janela mínima de pouso é um número de horas positivo', () => {
    expect(MIN_LANDING_WINDOW_HOURS).toBeGreaterThan(0)
  })
})

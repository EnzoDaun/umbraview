import { describe, expect, it } from 'vitest'

import { CAMERA_FOV_DEG, FRAME_FILL, fitDistance } from './framing.js'

const DEG = Math.PI / 180

/* O meio ângulo que a Lua (raio 1) ocupa vista de longe, contra o meio campo de visão de cada eixo. */
function fits(aspect, distance) {
  const moon = Math.asin(1 / distance)
  const vertical = (CAMERA_FOV_DEG / 2) * DEG
  const horizontal = Math.atan(Math.tan(vertical) * aspect)
  return moon <= Math.min(vertical, horizontal) * FRAME_FILL + 1e-9
}

describe('a Lua inteira cabe na cena, em qualquer tela (item 1)', () => {
  // a região da cena nas três telas pedidas: a proporção dela, e não a da janela, é a que conta
  it.each([
    ['1366 × 768, ao lado do painel', 900 / 600],
    ['1920 × 1080, ao lado do painel', 1450 / 900],
    ['celular 390 × 844, em pé', 358 / 420],
    ['faixa estreita e alta', 0.4],
  ])('%s', (_nome, aspect) => {
    const distance = fitDistance(aspect)
    expect(fits(aspect, distance)).toBe(true)
    // e não fica longe à toa: um pouco mais perto já corta
    expect(fits(aspect, distance * 0.97)).toBe(false)
  })
})

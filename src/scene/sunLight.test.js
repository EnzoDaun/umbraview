/* Onde a cena põe a luz do Sol (card C2): a luz sai do polo na direção do ponto onde o Sol está a
 * pino, pela mesma conversão do marcador do ponto (coordinates.js). */
import { describe, expect, it } from 'vitest'

import { latLonToScene } from './coordinates.js'
import { SUN_DISTANCE, SUN_TARGET, sunLightPosition } from './sunLight.js'

describe('sunLightPosition', () => {
  it('com o Sol a pino em (0°, 0°), a luz fica do lado +x do polo', () => {
    const [x, y, z] = sunLightPosition({ lat: 0, lon: 0 })
    expect(x).toBeCloseTo(SUN_DISTANCE, 12)
    expect(y).toBeCloseTo(-1, 12)
    expect(z).toBeCloseTo(0, 12)
  })

  it('a direção do alvo até a luz é a do ponto subsolar, em qualquer lugar', () => {
    const subsolar = { lat: -1.4, lon: 123.4 }
    const posicao = sunLightPosition(subsolar)
    const direcao = latLonToScene(subsolar.lat, subsolar.lon)
    posicao.forEach((valor, i) => expect((valor - SUN_TARGET[i]) / SUN_DISTANCE).toBeCloseTo(direcao[i], 12))
  })
})

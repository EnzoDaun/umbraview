/* A conversão de ponto da Lua para ponto da cena (cards C2 e C3). Os quatro pontos da convenção
 * vêm do card C3 do backlog; o último caso confere que a luz da cena sai do mesmo lado que o Sol do
 * motor, que é o erro que a troca de eixos causaria. */
import { describe, expect, it } from 'vitest'

import { computeEphemeris } from '../engine/ephemeris.js'
import { unitToLatLon } from '../engine/geometry.js'
import { engineToScene, latLonToScene } from './coordinates.js'

function confereVetor(recebido, esperado) {
  recebido.forEach((valor, i) => expect(valor).toBeCloseTo(esperado[i], 12))
}

describe('latLonToScene', () => {
  it('(0°, 0°) fica em +x', () => {
    confereVetor(latLonToScene(0, 0), [1, 0, 0])
  })

  it('(0°, 90° leste) fica em −z', () => {
    confereVetor(latLonToScene(0, 90), [0, 0, -1])
  })

  it('o polo norte fica em +y', () => {
    confereVetor(latLonToScene(90, 0), [0, 1, 0])
  })

  it('o polo sul fica em −y', () => {
    confereVetor(latLonToScene(-90, 0), [0, -1, 0])
  })
})

describe('engineToScene', () => {
  it('troca o z para cima do motor pelo y para cima da cena', () => {
    confereVetor(engineToScene([1, 2, 3]), [1, 3, -2])
  })

  it('o Sol que a luz usa, por latitude e longitude, é o mesmo Sol do motor', () => {
    // 14/11/2026, 00:00 UTC, o começo do hackathon; qualquer data serve
    const { sunDirection } = computeEphemeris(Date.UTC(2026, 10, 14), 1, 1)
    const direcao = [sunDirection[0], sunDirection[1], sunDirection[2]]
    const { lat, lon } = unitToLatLon(direcao)
    const tamanho = Math.hypot(...direcao)
    confereVetor(latLonToScene(lat, lon), engineToScene(direcao.map((v) => v / tamanho)))
  })
})

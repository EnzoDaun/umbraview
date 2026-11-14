/* A conversão de ponto da Lua para ponto da cena e de volta (cards C2 e C3). Os quatro pontos da
 * convenção vêm do card C3 do backlog; o caso do Sol confere que a luz da cena sai do mesmo lado
 * que o Sol do motor, que é o erro que a troca de eixos causaria. */
import { describe, expect, it } from 'vitest'

import { computeEphemeris } from '../engine/ephemeris.js'
import { unitToLatLon } from '../engine/geometry.js'
import { engineToScene, latLonToScene, sceneToEngine, sceneToLatLon } from './coordinates.js'

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

function confereLatLon({ lat, lon }, latDeg, lonDeg) {
  expect(lat).toBeCloseTo(latDeg, 12)
  expect(lon).toBeCloseTo(lonDeg, 12)
}

describe('sceneToLatLon', () => {
  it('volta os quatro pontos da convenção', () => {
    confereLatLon(sceneToLatLon([1, 0, 0]), 0, 0)
    confereLatLon(sceneToLatLon([0, 0, -1]), 0, 90)
    expect(sceneToLatLon([0, 1, 0]).lat).toBeCloseTo(90, 12)
    expect(sceneToLatLon([0, -1, 0]).lat).toBeCloseTo(-90, 12)
  })

  it('não depende do tamanho do vetor: o clique cai no relevo, acima ou abaixo do raio 1', () => {
    const { lat, lon } = sceneToLatLon(latLonToScene(-87, 40).map((v) => v * 1.004))
    expect(lat).toBeCloseTo(-87, 10)
    expect(lon).toBeCloseTo(40, 10)
  })

  // Perto do polo, um erro pequeno no vetor vira um erro grande na longitude: é ali que a ida e
  // volta precisa ser conferida.
  it.each([
    [-84, 0],
    [-85.3, 37.1],
    [-89.475, -137.44],
    [-89.99, 120],
    [-88, 179.5],
  ])('a ida e volta de (%s°, %s°) dá o mesmo ponto', (latDeg, lonDeg) => {
    const { lat, lon } = sceneToLatLon(latLonToScene(latDeg, lonDeg))
    expect(lat).toBeCloseTo(latDeg, 9)
    expect(lon).toBeCloseTo(lonDeg, 9)
  })
})

describe('sceneToEngine', () => {
  // o relevo fino (card C6) acha o ladrilho embaixo da câmera pela posição dela na cena, mas a
  // grade dos ladrilhos está na convenção do motor
  it.each([
    [[0.3, -0.5, 0.81]],
    [[0, -1, 0]],
    [[1, 0, 0]],
    [[-0.2, 0.7, -0.4]],
  ])('desfaz o engineToScene de %j', (point) => {
    confereVetor(sceneToEngine(engineToScene(point)), point)
  })
})

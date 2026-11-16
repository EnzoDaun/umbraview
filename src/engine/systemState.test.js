// @vitest-environment node
import { Body, GeoMoon, GeoVector, MakeTime } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'

import { computeEphemeris } from './ephemeris.js'
import { unitToLatLon } from './geometry.js'
import {
  SIDEREAL_MONTH_DAYS,
  SYNODIC_MONTH_DAYS,
  computeMoonOrbit,
  computeSystemState,
  equatorialToMoonFixedMatrix,
} from './systemState.js'

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a) => Math.sqrt(dot(a, a))
const GRAU = 180 / Math.PI
const DIA = 86400e3
const NORTE_DA_ECLIPTICA = [0, 0, 1]
const anguloEmGraus = (a, b) => Math.acos(dot(a, b) / (norm(a) * norm(b))) * GRAU

/* Datas espalhadas pelo mês e pelo ano: a libração e a fase mudam o tempo todo, e um teste numa
   data só passaria por coincidência. */
const DATAS = [
  Date.UTC(2026, 10, 14),
  Date.UTC(2026, 10, 21, 6),
  Date.UTC(2027, 1, 3, 17, 30),
  Date.UTC(2027, 5, 28, 9),
  Date.UTC(2028, 8, 9, 23),
]

describe('matriz do referencial equatorial para o fixo da Lua', () => {
  it('leva o vetor Lua→Sol equatorial para a mesma direção do Sol que o motor entrega', () => {
    for (const data of DATAS) {
      const m = equatorialToMoonFixedMatrix(data)
      expect(m).toHaveLength(9)
      const tempo = MakeTime(new Date(data))
      const lua = GeoMoon(tempo)
      const sol = GeoVector(Body.Sun, tempo, true)
      // o Sol visto do centro da Lua, e não da Terra: é o vetor que o computeEphemeris gira
      const v = [sol.x - lua.x, sol.y - lua.y, sol.z - lua.z]
      const girado = [0, 1, 2].map((linha) => dot([m[3 * linha], m[3 * linha + 1], m[3 * linha + 2]], v))
      const tamanho = norm(girado)
      const eph = computeEphemeris(data, 1, 1)
      for (let k = 0; k < 3; k++) {
        expect(girado[k] / tamanho).toBeCloseTo(eph.sunDirection[k], 12)
      }
    }
  })

  it('é uma rotação: linhas de tamanho 1, perpendiculares, sem espelhar o céu', () => {
    const m = equatorialToMoonFixedMatrix(DATAS[0])
    const linhas = [0, 1, 2].map((i) => [m[3 * i], m[3 * i + 1], m[3 * i + 2]])
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(dot(linhas[i], linhas[j])).toBeCloseTo(i === j ? 1 : 0, 12)
      }
    }
    // determinante +1; com −1 as constelações apareceriam espelhadas
    expect(dot(linhas[0], cross(linhas[1], linhas[2]))).toBeCloseTo(1, 12)
  })
})

describe('estado do sistema Terra–Lua–Sol na eclíptica', () => {
  it('a distância da Lua é o tamanho do earthPositionKm do motor', () => {
    for (const data of DATAS) {
      const estado = computeSystemState(data)
      const eph = computeEphemeris(data, 1, 1)
      const doMotor = norm([eph.earthPositionKm[0], eph.earthPositionKm[1], eph.earthPositionKm[2]])
      expect(estado.moonDistanceKm).toBeCloseTo(doMotor, 6)
      expect(norm(estado.moonPositionKm)).toBeCloseTo(estado.moonDistanceKm, 6)
    }
  })

  it('os vetores de direção têm tamanho 1', () => {
    for (const data of DATAS) {
      const estado = computeSystemState(data)
      for (const v of [estado.sunDirection, estado.moonNorthPole, estado.earthNorthPole]) {
        expect(v).toHaveLength(3)
        expect(Math.abs(norm(v) - 1)).toBeLessThan(1e-12)
      }
    }
  })

  /* A libração É o ponto subterrestre: a latitude e a longitude, no referencial fixo da Lua, do
     ponto da superfície que tem a Terra no zênite. Sem libração esse ponto seria sempre (0°, 0°);
     ela é o quanto ele passeia. Aqui os dois caminhos são independentes: o da esquerda vem do
     modelo de rotação da IAU (computeEphemeris), o da direita das séries de libração do
     astronomy-engine. Se a tela mostrasse uma libração que não bate com a posição da Terra no
     céu, um dos dois estaria errado. */
  it('a libração bate com o ponto subterrestre do motor a menos de 0,3°', () => {
    for (const data of DATAS) {
      const estado = computeSystemState(data)
      const eph = computeEphemeris(data, 1, 1)
      const terra = [eph.earthPositionKm[0], eph.earthPositionKm[1], eph.earthPositionKm[2]]
      const tamanho = norm(terra)
      const sub = unitToLatLon(terra.map((c) => c / tamanho))
      expect(Math.abs(sub.lat - estado.libration.latDeg), 'latitude').toBeLessThan(0.3)
      expect(Math.abs(sub.lon - estado.libration.lonDeg), 'longitude').toBeLessThan(0.3)
    }
  })

  it('a libração anda: não é sempre o mesmo ponto', () => {
    const a = computeSystemState(DATAS[0]).libration
    const b = computeSystemState(DATAS[0] + 7 * DIA).libration
    expect(Math.abs(a.lonDeg - b.lonDeg) + Math.abs(a.latDeg - b.latDeg)).toBeGreaterThan(1)
  })

  it('o eixo da Terra faz cerca de 23,4° com o norte da eclíptica', () => {
    for (const data of DATAS) {
      const angulo = anguloEmGraus(computeSystemState(data).earthNorthPole, NORTE_DA_ECLIPTICA)
      expect(angulo).toBeGreaterThan(23.3)
      expect(angulo).toBeLessThan(23.5)
    }
  })

  it('o eixo da Lua fica quase em pé na eclíptica, a cerca de 1,5°', () => {
    for (const data of DATAS) {
      const angulo = anguloEmGraus(computeSystemState(data).moonNorthPole, NORTE_DA_ECLIPTICA)
      expect(angulo).toBeGreaterThan(1.4)
      expect(angulo).toBeLessThan(1.7)
    }
  })

  it('o Sol fica no plano da eclíptica', () => {
    for (const data of DATAS) {
      // é o que define a eclíptica; um giro para o lado errado deixaria o Sol a até 23° do plano
      expect(Math.abs(computeSystemState(data).sunDirection[2])).toBeLessThan(1e-3)
    }
  })

  it('a fase e a fração iluminada contam a mesma história', () => {
    for (const data of DATAS) {
      const estado = computeSystemState(data)
      expect(estado.phaseAngleDeg).toBeGreaterThanOrEqual(0)
      expect(estado.phaseAngleDeg).toBeLessThan(360)
      expect(estado.illuminatedFraction).toBeGreaterThanOrEqual(0)
      expect(estado.illuminatedFraction).toBeLessThanOrEqual(1)
      // 0 = nova (escura), 180 = cheia (toda iluminada): a fração segue (1 − cos fase) / 2
      const esperado = (1 - Math.cos(estado.phaseAngleDeg / GRAU)) / 2
      expect(Math.abs(estado.illuminatedFraction - esperado)).toBeLessThan(0.02)
    }
  })

  it('a fase bate com a geometria: o ângulo Sol–Terra–Lua na eclíptica', () => {
    for (const data of DATAS) {
      const estado = computeSystemState(data)
      const lonLua = Math.atan2(estado.moonPositionKm[1], estado.moonPositionKm[0]) * GRAU
      const lonSol = Math.atan2(estado.sunDirection[1], estado.sunDirection[0]) * GRAU
      const diferenca = (((lonLua - lonSol) % 360) + 360) % 360
      const erro = Math.abs(((diferenca - estado.phaseAngleDeg + 540) % 360) - 180)
      expect(erro).toBeLessThan(0.05)
    }
  })
})

describe('órbita da Lua para desenhar', () => {
  it('tem samples pontos, todos a uma distância possível da Terra', () => {
    const orbita = computeMoonOrbit(DATAS[0], 128)
    expect(orbita).toBeInstanceOf(Float32Array)
    expect(orbita).toHaveLength(128 * 3)
    for (let i = 0; i < 128; i++) {
      const d = norm([orbita[3 * i], orbita[3 * i + 1], orbita[3 * i + 2]])
      expect(d).toBeGreaterThan(356000)
      expect(d).toBeLessThan(407000)
    }
  })

  it('é centrada na data: o ponto do meio é a Lua de agora', () => {
    const data = DATAS[1]
    const orbita = computeMoonOrbit(data, 129)
    const agora = computeSystemState(data).moonPositionKm
    for (let k = 0; k < 3; k++) {
      // Float32 guarda 7 algarismos: em 400 mil km, sobra menos de 0,1 km de arredondamento
      expect(Math.abs(orbita[3 * 64 + k] - agora[k])).toBeLessThan(0.1)
    }
  })

  it('dá uma volta: o primeiro e o último ponto ficam perto, e o meio fica do outro lado', () => {
    const orbita = computeMoonOrbit(DATAS[0], 129)
    const primeiro = [orbita[0], orbita[1], orbita[2]]
    const ultimo = [orbita[3 * 128], orbita[3 * 128 + 1], orbita[3 * 128 + 2]]
    const meio = [orbita[3 * 64], orbita[3 * 64 + 1], orbita[3 * 64 + 2]]
    // um mês sideral depois a Lua volta à mesma direção entre as estrelas (a menos de poucos graus)
    expect(anguloEmGraus(primeiro, ultimo)).toBeLessThan(5)
    expect(anguloEmGraus(primeiro, meio)).toBeGreaterThan(170)
  })

  it('o plano da órbita faz cerca de 5,1° com a eclíptica', () => {
    const orbita = computeMoonOrbit(DATAS[0], 4)
    const a = [orbita[0], orbita[1], orbita[2]]
    const b = [orbita[3], orbita[4], orbita[5]]
    const angulo = anguloEmGraus(cross(a, b), NORTE_DA_ECLIPTICA)
    expect(angulo).toBeGreaterThan(4.9)
    expect(angulo).toBeLessThan(5.4)
  })

  it('os meses vêm da ficha da NASA, e o sinódico é o mais longo', () => {
    expect(SIDEREAL_MONTH_DAYS).toBeGreaterThan(27.3)
    expect(SIDEREAL_MONTH_DAYS).toBeLessThan(27.4)
    expect(SYNODIC_MONTH_DAYS).toBeGreaterThan(29.5)
    expect(SYNODIC_MONTH_DAYS).toBeLessThan(29.6)
  })
})

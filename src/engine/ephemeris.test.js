// @vitest-environment node
import { GeoMoon, MakeTime } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'

import { computeEphemeris, moonFixedFrameAt } from './ephemeris.js'
import reference from './fixtures/spiceReference.json'
import { MOON_RADIUS_M, latLonToUnit, localFrame } from './geometry.js'

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const GRAU = 180 / Math.PI
const HORA = 3600e3

/* Azimute e elevação de uma direção, no referencial do ponto: a régua que o teste usa para
   comparar com o SPICE, escrita à parte do motor. */
function azEl(direcao, { east, north, up }) {
  const tamanho = Math.sqrt(dot(direcao, direcao))
  const el = Math.asin(dot(direcao, up) / tamanho) * GRAU
  const az = (Math.atan2(dot(direcao, east), dot(direcao, north)) * GRAU + 360) % 360
  return [az, el]
}

const diferencaDeAngulo = (a, b) => Math.abs(((a - b + 540) % 360) - 180)

describe('posição do Sol e da Terra vistos da Lua', () => {
  it('bate com o SPICE do JPL a menos de 0,01°, em três pontos ao longo de um ano', () => {
    expect(reference.rows.length).toBeGreaterThan(200)
    let piorEl = 0
    let piorAz = 0
    for (const linha of reference.rows) {
      const p = latLonToUnit(linha.lat, linha.lon)
      const frame = localFrame(p)
      const raioKm = (MOON_RADIUS_M + linha.altKm * 1000) / 1000
      const eph = computeEphemeris(Date.parse(linha.utc + 'Z'), 1, 1)
      const sol = [eph.sunDirection[0], eph.sunDirection[1], eph.sunDirection[2]]
      const terra = [0, 1, 2].map((i) => eph.earthPositionKm[i] - p[i] * raioKm)
      for (const [direcao, [azSpice, elSpice]] of [[sol, linha.SUN], [terra, linha.EARTH]]) {
        const [az, el] = azEl(direcao, frame)
        piorEl = Math.max(piorEl, Math.abs(el - elSpice))
        // perto do zênite o azimute perde o sentido; os pontos de referência não chegam lá
        piorAz = Math.max(piorAz, diferencaDeAngulo(az, azSpice))
      }
    }
    expect(piorEl, 'maior diferença na elevação (graus)').toBeLessThan(0.01)
    expect(piorAz, 'maior diferença no azimute (graus)').toBeLessThan(0.01)
  })

  it('tem um instante por passo, com distâncias de Sol e Terra possíveis', () => {
    const eph = computeEphemeris(Date.UTC(2026, 10, 14), 48, 1)
    expect(eph.count).toBe(48)
    expect(eph.stepHours).toBe(1)
    expect(eph.sunDirection).toHaveLength(48 * 3)
    expect(eph.earthPositionKm).toHaveLength(48 * 3)
    expect(eph.sunDistanceKm).toHaveLength(48)
    for (let i = 0; i < 48; i++) {
      const s = [eph.sunDirection[3 * i], eph.sunDirection[3 * i + 1], eph.sunDirection[3 * i + 2]]
      const t = [eph.earthPositionKm[3 * i], eph.earthPositionKm[3 * i + 1], eph.earthPositionKm[3 * i + 2]]
      expect(Math.abs(Math.sqrt(dot(s, s)) - 1)).toBeLessThan(1e-12)
      // a Terra fica entre 356 mil e 407 mil km da Lua; o Sol, a cerca de 1 UA (149,6 milhões de km)
      expect(Math.sqrt(dot(t, t))).toBeGreaterThan(356000)
      expect(Math.sqrt(dot(t, t))).toBeLessThan(407000)
      expect(Math.abs(eph.sunDistanceKm[i] / 149597870.7 - 1)).toBeLessThan(0.02)
    }
  })

  it('o instante i da série é o mesmo que começar a série i horas depois', () => {
    const inicio = Date.UTC(2026, 10, 14)
    const serie = computeEphemeris(inicio, 30, 2)
    const i = 17
    const sozinho = computeEphemeris(inicio + i * 2 * HORA, 1, 2)
    for (let k = 0; k < 3; k++) {
      expect(serie.sunDirection[3 * i + k]).toBeCloseTo(sozinho.sunDirection[k], 12)
      expect(serie.earthPositionKm[3 * i + k]).toBeCloseTo(sozinho.earthPositionKm[k], 6)
    }
    // e o Sol anda: em 34 horas a direção dele no céu da Lua muda
    expect(Math.abs(serie.sunDirection[3 * i] - serie.sunDirection[0])).toBeGreaterThan(1e-3)
  })
})

describe('giro do céu para o referencial fixo da Lua (moonFixedFrameAt)', () => {
  const quando = Date.UTC(2026, 10, 15, 12)

  it('leva a direção da Terra, no referencial equatorial, à mesma direção que o computeEphemeris dá', () => {
    const girar = moonFixedFrameAt(quando)
    const lua = GeoMoon(MakeTime(new Date(quando)))
    const terra = girar(-lua.x, -lua.y, -lua.z)
    const tamanho = Math.sqrt(dot(terra, terra))
    const { earthPositionKm } = computeEphemeris(quando, 1, 1)
    const esperado = Array.from(earthPositionKm)
    const tamanhoEsperado = Math.sqrt(dot(esperado, esperado))
    for (let i = 0; i < 3; i++) expect(terra[i] / tamanho).toBeCloseTo(esperado[i] / tamanhoEsperado, 12)
  })

  it('é um giro: não muda o tamanho do vetor', () => {
    const girado = moonFixedFrameAt(quando)(0.3, -0.5, 0.8)
    expect(Math.sqrt(dot(girado, girado))).toBeCloseTo(Math.sqrt(0.09 + 0.25 + 0.64), 12)
  })

  it('o céu dá a volta com o mês sideral: 27,32 dias depois, uma estrela volta quase ao mesmo lugar', () => {
    const estrela = [0.6, 0.64, 0.48]
    const antes = moonFixedFrameAt(quando)(...estrela)
    const meioMes = moonFixedFrameAt(quando + 13.66 * 24 * HORA)(...estrela)
    const mesInteiro = moonFixedFrameAt(quando + 27.32 * 24 * HORA)(...estrela)
    const angulo = (a, b) => Math.acos(Math.min(1, dot(a, b))) * GRAU
    expect(angulo(antes, meioMes)).toBeGreaterThan(90)
    expect(angulo(antes, mesInteiro)).toBeLessThan(5)
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Body, GeoMoon, MakeTime, RotationAxis } from 'astronomy-engine'

import { computeEphemeris, moonFixedMatrix, moonFixedRotation } from './ephemeris.js'
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

/* C1: a rotação para o referencial fixo da Lua sai do arquivo, para as estrelas (C5) girarem com a
   mesma conta do Sol e da Terra. Exportar não pode mudar os números do computeEphemeris. */
describe('rotação para o referencial fixo da Lua, exportada (C1)', () => {
  const instante = Date.UTC(2026, 10, 14, 6)

  it('aplicada à mão na Lua do astronomy-engine, dá a mesma Terra do computeEphemeris', () => {
    const time = MakeTime(new Date(instante))
    const moon = GeoMoon(time)
    const terra = moonFixedRotation(RotationAxis(Body.Moon, time))(-moon.x, -moon.y, -moon.z)
    const eph = computeEphemeris(instante, 1, 1)
    for (let k = 0; k < 3; k++) expect(terra[k] * 149597870.7).toBeCloseTo(eph.earthPositionKm[k], 6)
  })

  it('moonFixedMatrix dá a mesma rotação, em nove números, linha a linha', () => {
    const m = moonFixedMatrix(instante)
    const giro = moonFixedRotation(RotationAxis(Body.Moon, MakeTime(new Date(instante))))
    const v = [0.3, -0.5, 0.81]
    const esperado = giro(...v)
    for (let r = 0; r < 3; r++) {
      expect(m[3 * r] * v[0] + m[3 * r + 1] * v[1] + m[3 * r + 2] * v[2]).toBeCloseTo(esperado[r], 12)
    }
  })

  it('o polo norte da Lua, no referencial equatorial, vira o eixo z do referencial fixo', () => {
    const { ra, dec } = RotationAxis(Body.Moon, MakeTime(new Date(instante)))
    const a = (ra * 15 * Math.PI) / 180
    const d = (dec * Math.PI) / 180
    const polo = moonFixedRotation({ ra, dec, spin: 0 })(Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d))
    expect(polo[2]).toBeCloseTo(1, 12)
  })
})

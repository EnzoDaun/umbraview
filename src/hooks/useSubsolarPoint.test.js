import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import reference from '../engine/fixtures/spiceReference.json'
import { latLonToUnit, localFrame } from '../engine/geometry.js'
import { useSubsolarPoint } from './useSubsolarPoint.js'

const DEG = 180 / Math.PI
const HOUR_MS = 3600e3
const DAY_MS = 24 * HOUR_MS
const NOV_14 = new Date(Date.UTC(2026, 10, 14))

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/* Azimute e elevação de uma direção no referencial do ponto, escritos à parte do motor, como no
   ephemeris.test.js. */
function azEl(direction, { east, north, up }) {
  const length = Math.sqrt(dot(direction, direction))
  const el = Math.asin(dot(direction, up) / length) * DEG
  const az = (Math.atan2(dot(direction, east), dot(direction, north)) * DEG + 360) % 360
  return [az, el]
}

const angleDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180)

function renderSubsolar(date) {
  return renderHook(({ date }) => useSubsolarPoint(date), { initialProps: { date } })
}

describe('useSubsolarPoint: onde o Sol está a pino, para a luz da cena', () => {
  it('visto dos pontos da referência do SPICE, o Sol fica na altura e na direção que o SPICE dá', () => {
    // a luz da cena sai do centro da Lua na direção deste ponto; de um ponto no chão, o Sol tem que
    // aparecer onde o SPICE diz (a diferença de olhar do centro ou do chão é 0,0007°)
    expect(reference.rows.length).toBeGreaterThan(200)
    const { result, rerender } = renderSubsolar(NOV_14)
    let worstEl = 0
    let worstAz = 0
    for (const row of reference.rows) {
      rerender({ date: new Date(Date.parse(row.utc + 'Z')) })
      const sun = latLonToUnit(result.current.lat, result.current.lon)
      const [az, el] = azEl(sun, localFrame(latLonToUnit(row.lat, row.lon)))
      worstEl = Math.max(worstEl, Math.abs(el - row.SUN[1]))
      worstAz = Math.max(worstAz, angleDifference(az, row.SUN[0]))
    }
    expect(worstEl, 'maior diferença na elevação (graus)').toBeLessThan(0.01)
    expect(worstAz, 'maior diferença no azimute (graus)').toBeLessThan(0.01)
  })

  it('em um ano, a latitude do ponto fica entre −1,6° e 1,6° e passa dos dois lados do equador', () => {
    // o eixo da Lua quase não se inclina em relação ao Sol: medido em 03/11/2026, um ponto por dia
    // a partir de 14/11/2026, de −1,556° a 1,547°. Uma troca de eixos poria o ponto a dezenas de graus.
    const { result, rerender } = renderSubsolar(NOV_14)
    const latitudes = []
    for (let day = 0; day < 365; day++) {
      rerender({ date: new Date(NOV_14.getTime() + day * DAY_MS) })
      latitudes.push(result.current.lat)
    }
    expect(Math.max(...latitudes)).toBeLessThan(1.6)
    expect(Math.min(...latitudes)).toBeGreaterThan(-1.6)
    expect(Math.max(...latitudes) - Math.min(...latitudes)).toBeGreaterThan(2.5)
  })

  it('a mesma data dá o mesmo objeto, e outra data dá outro ponto', () => {
    // a cena refaz a luz quando o objeto muda; um objeto novo a cada render refaria à toa
    const { result, rerender } = renderSubsolar(NOV_14)
    const first = result.current
    expect(first).toEqual({ lat: expect.any(Number), lon: expect.any(Number) })
    rerender({ date: new Date(NOV_14.getTime()) })
    expect(result.current).toBe(first)
    rerender({ date: new Date(NOV_14.getTime() + 6 * HOUR_MS) })
    // em 6 horas o Sol anda uns 3° de longitude no céu da Lua (uma volta em 29,5 dias)
    expect(angleDifference(result.current.lon, first.lon)).toBeGreaterThan(2)
  })
})

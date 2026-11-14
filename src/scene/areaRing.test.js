/* O anel que mostra até onde dá para escolher um ponto (card C8). A conta fica fora do componente
 * para ser testada sem WebGL; que o anel aparece em volta da área se confere no navegador, no
 * "Pronto quando" do card. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MOON_RADIUS_M } from '../engine/geometry.js'
import { AREA_RING_LIFT_M, AREA_RING_SEGMENTS, buildAreaRing, closeRing } from './areaRing.js'
import { sceneToLatLon } from './coordinates.js'
import { reliefHeightAtM } from './picking.js'

const reliefDir = join(process.cwd(), 'public', 'data', 'relief')
const manifest = JSON.parse(readFileSync(join(reliefDir, 'manifest.json'), 'utf8'))
const heights = new Int16Array(readFileSync(join(reliefDir, manifest.far.file)).buffer.slice(0))
const relief = { manifest, heights }

/* Os pontos de 3 em 3 números, como o three recebe. */
function pointsOf(positions) {
  const points = []
  for (let i = 0; i < positions.length; i += 3) points.push([positions[i], positions[i + 1], positions[i + 2]])
  return points
}

describe('buildAreaRing', () => {
  const positions = buildAreaRing(relief)
  const points = pointsOf(positions)

  it('tem um ponto por segmento; quem fecha a volta é o closeRing', () => {
    expect(positions).toBeInstanceOf(Float32Array)
    expect(points).toHaveLength(AREA_RING_SEGMENTS)
  })

  it('todo ponto fica na latitude do limite da área, lida do manifesto (84°S)', () => {
    expect(manifest.areaMaxLatDeg).toBe(-84)
    expect(points).toHaveLength(AREA_RING_SEGMENTS)
    for (const point of points) {
      expect(sceneToLatLon(point).lat).toBeCloseTo(manifest.areaMaxLatDeg, 4)
    }
  })

  it('dá a volta inteira, com os pontos espaçados por igual em longitude', () => {
    const step = 360 / AREA_RING_SEGMENTS
    const lons = points.map((point) => sceneToLatLon(point).lon)
    expect(lons).toHaveLength(AREA_RING_SEGMENTS)
    for (let i = 1; i < lons.length; i++) {
      const gap = (((lons[i] - lons[i - 1]) % 360) + 360) % 360
      expect(gap).toBeCloseTo(step, 4)
    }
  })

  it('cada ponto fica um pouco acima do relevo daquele lugar, e não no raio 1', () => {
    expect(points).toHaveLength(AREA_RING_SEGMENTS)
    let lowest = Infinity
    let highest = -Infinity
    for (const point of points) {
      const { lat, lon } = sceneToLatLon(point)
      const surface = 1 + reliefHeightAtM(relief, lat, lon) / MOON_RADIUS_M
      const lift = (Math.hypot(...point) - surface) * MOON_RADIUS_M
      lowest = Math.min(lowest, lift)
      highest = Math.max(highest, lift)
    }
    // a conta é em Float32, que no raio 1 erra uns 0,1 m
    expect(lowest).toBeGreaterThan(AREA_RING_LIFT_M - 1)
    expect(highest).toBeLessThan(AREA_RING_LIFT_M + 1)
  })

  it('segue o relevo: os pontos não ficam todos na mesma altura', () => {
    const radii = points.map((point) => Math.hypot(...point))
    const spreadM = (Math.max(...radii) - Math.min(...radii)) * MOON_RADIUS_M
    expect(spreadM).toBeGreaterThan(1000)
  })

  it('sem o relevo, não há anel: a área ainda não é conhecida', () => {
    expect(buildAreaRing(null)).toBeNull()
  })
})

describe('closeRing', () => {
  it('repete o primeiro ponto no fim, numa lista comum: a faixa do Drei não fecha a volta sozinha', () => {
    // o lineLoop do three fechava; a faixa (o Line do Drei, AreaRing.jsx) não fecha, e lê os pontos
    // com map e flat, que um Float32Array não tem
    const closed = closeRing(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))
    expect(Array.isArray(closed)).toBe(true)
    expect(closed).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3])
  })

  it('sem anel, nada', () => {
    expect(closeRing(null)).toBeNull()
  })
})

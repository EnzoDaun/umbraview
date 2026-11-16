/* O giro do céu de estrelas na convenção de eixos da cena: uma direção equatorial tem que cair no
 * mesmo ponto da cena em que o motor e o coordinates.js a põem. */
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { equatorialToMoonFixedMatrix } from '../engine/systemState.js'
import { engineToScene } from '../scene/coordinates.js'
import { skyRotationForScene, useSkyRotation } from './useSkyRotation.js'

const DATE = Date.UTC(2026, 10, 15, 12)

const apply = (m, [x, y, z]) => [0, 1, 2].map((row) => m[3 * row] * x + m[3 * row + 1] * y + m[3 * row + 2] * z)

describe('giro do céu para a cena', () => {
  it('é a matriz do motor seguida da troca de eixos da cena', () => {
    const engine = equatorialToMoonFixedMatrix(DATE)
    const scene = skyRotationForScene(DATE)
    for (const direction of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.36, -0.48, 0.8]]) {
      const expected = engineToScene(apply(engine, direction))
      apply(scene, direction).forEach((value, i) => expect(value).toBeCloseTo(expected[i], 12))
    }
  })

  it('o polo norte da Lua, visto do céu, cai no +y da cena', () => {
    // a terceira linha da matriz do motor é o eixo da Lua no referencial equatorial
    const engine = equatorialToMoonFixedMatrix(DATE)
    const pole = [engine[6], engine[7], engine[8]]
    const [x, y, z] = apply(skyRotationForScene(DATE), pole)
    expect(x).toBeCloseTo(0, 12)
    expect(y).toBeCloseTo(1, 12)
    expect(z).toBeCloseTo(0, 12)
  })

  it('devolve o mesmo array enquanto a data não muda, e outro quando ela muda', () => {
    const { result, rerender } = renderHook(({ date }) => useSkyRotation(date), { initialProps: { date: new Date(DATE) } })
    const first = result.current
    rerender({ date: new Date(DATE) })
    expect(result.current).toBe(first)
    rerender({ date: new Date(DATE + 6 * 3600e3) })
    expect(result.current).not.toBe(first)
    // em 6 horas a Lua gira uns 3,3°: o céu anda
    expect(Math.abs(result.current[0] - first[0])).toBeGreaterThan(1e-3)
  })
})

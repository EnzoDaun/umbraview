import { describe, expect, it } from 'vitest'

import { moonFixedMatrix } from '../engine/ephemeris.js'
import { latLonToUnit } from '../engine/geometry.js'
import { engineToScene } from './coordinates.js'
import { STAR_RADIUS, buildStarAttributes, starColorMix, starSizePx } from './starField.js'

const DATA = Float32Array.from([
  // uma estrela na direção x do J2000, magnitude 0, B−V 0,6
  1, 0, 0, 0, 0.6,
  // uma fraca, na direção z, sem B−V
  0, 0, 1, 6, Number.NaN,
])

describe('o céu de estrelas da cena (C5)', () => {
  it('gira as direções para o referencial fixo da Lua e passa para os eixos da cena', () => {
    const matrix = moonFixedMatrix(Date.UTC(2026, 10, 15))
    const { positions } = buildStarAttributes(DATA, matrix)
    const esperado = engineToScene([matrix[0], matrix[3], matrix[6]]).map((v) => v * STAR_RADIUS)
    for (let k = 0; k < 3; k++) expect(positions[k]).toBeCloseTo(esperado[k], 5)
  })

  it('o polo norte celeste fica a menos de 30° do polo norte da Lua', () => {
    // o eixo da Lua fica a uns 25° do polo celeste (inclinação da órbita mais a do equador)
    const { positions } = buildStarAttributes(DATA, moonFixedMatrix(Date.UTC(2026, 10, 15)))
    const polo = [positions[3], positions[4], positions[5]].map((v) => v / STAR_RADIUS)
    const norteDaLua = engineToScene(latLonToUnit(90, 0))
    const cos = polo[0] * norteDaLua[0] + polo[1] * norteDaLua[1] + polo[2] * norteDaLua[2]
    expect(cos).toBeGreaterThan(Math.cos((30 * Math.PI) / 180))
  })

  it('estrela mais brilhante desenha maior, e nenhuma some', () => {
    expect(starSizePx(-1.4)).toBeGreaterThan(starSizePx(2))
    expect(starSizePx(2)).toBeGreaterThan(starSizePx(6.5))
    expect(starSizePx(6.5)).toBeGreaterThan(0)
  })

  it('B−V vira a mistura entre a cor quente e a fria, e sem B−V fica a de uma estrela como o Sol', () => {
    expect(starColorMix(-0.3)).toBe(0)
    expect(starColorMix(2)).toBe(1)
    expect(starColorMix(0.6)).toBeGreaterThan(0.3)
    expect(starColorMix(Number.NaN)).toBe(starColorMix(0.65))
  })
})

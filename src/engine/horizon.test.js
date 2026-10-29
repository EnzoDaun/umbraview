import { describe, expect, it } from 'vitest'

import { HORIZON } from './config.js'
import { MOON_RADIUS_M as R, latLonToUnit, localFrame } from './geometry.js'
import { computeHorizon, horizonElevationAt } from './horizon.js'

/* O horizonte é provado com relevo inventado de propósito, cuja resposta sai de uma conta à mão.
   Assim o teste não depende de arquivo de relevo nem de ter rodado o motor antes. */

const PONTO = latLonToUnit(-89.5, 30)
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/* Ângulo, visto do centro da Lua, entre o ponto escolhido e o ponto (x, y, z) do relevo. */
const anguloAte = (x, y, z) => Math.acos(Math.max(-1, Math.min(1, dot(PONTO, [x, y, z]))))

/* Elevação exata de um relevo de altura h a uma distância d (no chão), vista de um observador a
   observadorM acima do raio de referência: a conta que o horizonte faz, escrita à parte. */
function elevacao(h, d, observadorM) {
  const th = d / R
  return Math.atan(((R + h) * Math.cos(th) - (R + observadorM)) / ((R + h) * Math.sin(th)))
}

const camadaUnica = (sample) => [{ relief: { sample }, upToM: Infinity }]

describe('horizonte de um ponto', () => {
  it('na Lua lisa, o horizonte cai o que a curvatura manda para um mastro de 2 m', () => {
    const h = computeHorizon(camadaUnica(() => 0), PONTO, HORIZON)
    const esperado = -Math.acos(R / (R + HORIZON.mastM))
    expect(h.elevationsRad).toHaveLength(HORIZON.directions)
    expect(h.observerHeightM).toBe(HORIZON.mastM)
    for (const e of h.elevationsRad) expect(Math.abs(e - esperado)).toBeLessThan(1e-6)
  })

  it('um paredão de 1 km a 10 km de distância sobe no horizonte o que a conta à mão manda', () => {
    const d = 10000
    const h = computeHorizon(camadaUnica((x, y, z) => (anguloAte(x, y, z) * R >= d ? 1000 : 0)), PONTO, HORIZON)
    const esperado = elevacao(1000, d, HORIZON.mastM)
    // a primeira amostra depois do paredão fica até 40 m além dele, e por isso um pouco mais baixa
    for (const e of h.elevationsRad) {
      expect(e).toBeLessThanOrEqual(esperado + 1e-7)
      expect(esperado - e).toBeLessThan(5e-4)
    }
  })

  it('cada distância usa a camada certa: a fina até upToM, a grossa depois', () => {
    // A camada fina devolve 5 km se for consultada além dos 10 km; a grossa, se for consultada
    // antes. Usar a camada errada em qualquer distância põe uma montanha de 5 km no horizonte.
    // O paredão certo (3 km a 50 km) precisa ficar acima da queda do chão liso perto do ponto
    // (−0,0015 rad): com 500 m ele ficaria abaixo dela e não apareceria no horizonte.
    const fina = { upToM: 10000, relief: { sample: (x, y, z) => (anguloAte(x, y, z) * R > 10000 ? 5000 : 0) } }
    const grossa = {
      upToM: Infinity,
      relief: { sample: (x, y, z) => { const d = anguloAte(x, y, z) * R; return d <= 10000 ? 5000 : d >= 50000 ? 3000 : 0 } },
    }
    const h = computeHorizon([fina, grossa], PONTO, HORIZON)
    const esperado = elevacao(3000, 50000, HORIZON.mastM)
    for (const e of h.elevationsRad) expect(Math.abs(e - esperado)).toBeLessThan(2e-4)
  })

  it('azimute 0° é o norte e 90° é o leste', () => {
    // Montanha de 2 km só numa fatia estreita a leste do ponto (até uns 25° do leste), a partir
    // de 5 km. Uma fatia estreita, e não metade do mapa: a fronteira de meio mapa passaria
    // exatamente pelo norte e pelo sul, e o arredondamento decidiria de que lado eles caem.
    const { east } = localFrame(PONTO)
    const sample = (x, y, z) => {
      const d = [x - PONTO[0], y - PONTO[1], z - PONTO[2]]
      const paraLeste = dot(d, east) / Math.sqrt(dot(d, d)) > 0.9
      return paraLeste && anguloAte(x, y, z) * R > 5000 ? 2000 : 0
    }
    const h = computeHorizon(camadaUnica(sample), PONTO, HORIZON)
    expect(h.elevationsRad[90]).toBeGreaterThan(0.1)
    for (const outra of [0, 180, 270]) expect(h.elevationsRad[outra]).toBeLessThan(0)
  })

  it('ponto fora do relevo carregado é erro, e não um horizonte vazio', () => {
    expect(() => computeHorizon(camadaUnica(() => NaN), PONTO, HORIZON)).toThrow(/fora do relevo/)
  })
})

describe('elevação do horizonte num azimute qualquer', () => {
  const horizonte = { elevationsRad: Float32Array.from([0, 1, 2, 3]), directions: 4 }
  const grau = Math.PI / 180

  it('interpola em linha reta entre as duas direções vizinhas', () => {
    expect(horizonElevationAt(horizonte, 45 * grau)).toBeCloseTo(0.5, 9)
    expect(horizonElevationAt(horizonte, 135 * grau)).toBeCloseTo(1.5, 9)
  })

  it('dá a volta: depois da última direção vem a primeira', () => {
    expect(horizonElevationAt(horizonte, 315 * grau)).toBeCloseTo(1.5, 9)
    expect(horizonElevationAt(horizonte, -45 * grau)).toBeCloseTo(1.5, 9)
    expect(horizonElevationAt(horizonte, 360 * grau)).toBeCloseTo(0, 9)
  })
})

import { describe, expect, it } from 'vitest'

import { computeEphemeris } from './ephemeris.js'
import reference from './fixtures/spiceReference.json'
import { latLonToUnit, localFrame } from './geometry.js'
import { computeSeries, diskFraction, findLandingWindows, nextChange, nextSunset } from './series.js'

/* Horizonte de mentira, da mesma altura em todas as direções: com ele, a resposta de cada
   instante sai de uma conta à mão. */
function horizonteReto(lat, lon, elevacaoRad, observerHeightM = 0) {
  const point = latLonToUnit(lat, lon)
  return {
    elevationsRad: new Float32Array(360).fill(elevacaoRad),
    directions: 360,
    point,
    frame: localFrame(point),
    observerHeightM,
  }
}

const diferencaDeAngulo = (a, b) => Math.abs(((a - b + 540) % 360) - 180)

describe('fração do disco acima do horizonte', () => {
  it('disco inteiro acima, inteiro abaixo e metade com o centro na linha', () => {
    expect(diskFraction(1)).toBe(1)
    expect(diskFraction(3)).toBe(1)
    expect(diskFraction(-1)).toBe(0)
    expect(diskFraction(-3)).toBe(0)
    expect(diskFraction(0)).toBeCloseTo(0.5, 12)
  })

  it('o que falta de um lado sobra do outro, e cresce junto com a altura', () => {
    let anterior = 0
    for (const d of [-0.9, -0.5, -0.1, 0.1, 0.5, 0.9]) {
      expect(diskFraction(d) + diskFraction(-d)).toBeCloseTo(1, 12)
      expect(diskFraction(d)).toBeGreaterThan(anterior)
      anterior = diskFraction(d)
    }
  })
})

describe('série hora a hora de um ponto', () => {
  it('elevação e azimute do Sol e da Terra batem com o SPICE do JPL a menos de 0,01°', () => {
    let pior = 0
    for (const linha of reference.rows) {
      const h = horizonteReto(linha.lat, linha.lon, -0.1, linha.altKm * 1000)
      const s = computeSeries(h, computeEphemeris(Date.parse(linha.utc + 'Z'), 1, 1))
      pior = Math.max(
        pior,
        Math.abs(s.sunElevationDeg[0] - linha.SUN[1]),
        Math.abs(s.earthElevationDeg[0] - linha.EARTH[1]),
        diferencaDeAngulo(s.sunAzimuthDeg[0], linha.SUN[0]),
        diferencaDeAngulo(s.earthAzimuthDeg[0], linha.EARTH[0]),
      )
    }
    expect(pior, 'maior diferença (graus)').toBeLessThan(0.01)
  })

  it('com o horizonte na altura do centro do Sol, metade do disco está à vista', () => {
    const inicio = Date.UTC(2026, 10, 14)
    const eph = computeEphemeris(inicio, 1, 1)
    const sondagem = computeSeries(horizonteReto(-86, 2.06, -0.5), eph)
    const centroDoSol = (sondagem.sunElevationDeg[0] * Math.PI) / 180
    const s = computeSeries(horizonteReto(-86, 2.06, centroDoSol), eph)
    expect(s.sunFraction[0]).toBeCloseTo(0.5, 3)
    expect(s.sunHorizonDeg[0]).toBeCloseTo(sondagem.sunElevationDeg[0], 4)
    expect(sondagem.sunFraction[0]).toBe(1)
  })

  it('a margem da Terra é zero quando a borda de cima dela encosta no horizonte', () => {
    const eph = computeEphemeris(Date.UTC(2026, 10, 14), 1, 1)
    const sondagem = computeSeries(horizonteReto(-86, 2.06, -0.5), eph)
    // a Terra vista da Lua tem cerca de 2° de diâmetro (entre 1,8° e 2,1°, conforme a distância)
    const raioDaTerra = sondagem.earthMarginDeg[0] - (sondagem.earthElevationDeg[0] + 28.6479)
    const bordaDeCima = ((sondagem.earthElevationDeg[0] + raioDaTerra) * Math.PI) / 180
    expect(raioDaTerra).toBeGreaterThan(0.88)
    expect(raioDaTerra).toBeLessThan(1.04)
    const s = computeSeries(horizonteReto(-86, 2.06, bordaDeCima), eph)
    expect(Math.abs(s.earthMarginDeg[0])).toBeLessThan(1e-4)
  })
})

describe('quando o Sol e a Terra mudam', () => {
  const serie = (sunFraction, earthMarginDeg, stepHours = 1) => ({
    stepHours, sunFraction: Float32Array.from(sunFraction), earthMarginDeg: Float32Array.from(earthMarginDeg),
  })

  it('próxima mudança do Sol: o pôr cai entre duas horas, onde metade do disco some', () => {
    expect(nextChange('sun', serie([1, 1, 0.8, 0.2, 0], [1, 1, 1, 1, 1]), 0)).toEqual({ visibleNow: true, hours: 2.5 })
    expect(nextChange('sun', serie([0, 0.1, 0.9, 1], [1, 1, 1, 1]), 0)).toEqual({ visibleNow: false, hours: 1.5 })
    expect(nextChange('sun', serie([1, 1, 1], [1, 1, 1]), 0)).toEqual({ visibleNow: true, hours: null })
  })

  it('próxima mudança da Terra: quando a margem cruza zero', () => {
    expect(nextChange('earth', serie([1, 1, 1], [1, 0.5, -0.5], 2), 0)).toEqual({ visibleNow: true, hours: 3 })
  })

  it('próximo pôr do Sol: com o Sol escondido agora, é o pôr depois do próximo nascer', () => {
    expect(nextSunset(serie([1, 1, 0.8, 0.2, 0], [1, 1, 1, 1, 1]), 0)).toBe(2.5)
    expect(nextSunset(serie([0, 0.1, 0.9, 1, 0.75, 0.25], [1, 1, 1, 1, 1, 1]), 0)).toBe(4.5)
    expect(nextSunset(serie([1, 1, 1], [1, 1, 1]), 0)).toBeNull()
    expect(nextSunset(serie([0, 0, 0], [1, 1, 1]), 0)).toBeNull()
  })

  it('janelas de pouso: só os trechos seguidos com Sol e Terra que duram o mínimo pedido', () => {
    const n = 400
    const sol = new Array(n).fill(0)
    const terra = new Array(n).fill(-1)
    for (let i = 10; i < 160; i++) { sol[i] = 1; terra[i] = 1 } // 150 h seguidas
    for (let i = 200; i < 300; i++) { sol[i] = 1; terra[i] = 1 } // 100 h
    for (let i = 320; i < 400; i++) { sol[i] = 0.4; terra[i] = 1 } // Sol abaixo de metade do disco
    expect(findLandingWindows(serie(sol, terra), 144)).toEqual([{ start: 10, hours: 150, ongoing: false, open: false }])
    expect(findLandingWindows(serie(sol, terra), 1)).toHaveLength(2)
  })
})

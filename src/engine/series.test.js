// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { computeEphemeris } from './ephemeris.js'
import reference from './fixtures/spiceReference.json'
import { latLonToUnit, localFrame } from './geometry.js'
import { computeSeries, diskFraction, findLandingWindows, nextChange, nextSetting, nextSunset } from './series.js'

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

  it('próximo pôr da Terra: quando a margem passa de positiva a zero; com a Terra escondida agora, é o pôr depois da volta', () => {
    expect(nextSetting('earth', serie([1, 1, 1], [1, 0.5, -0.5], 2), 0)).toBe(3)
    expect(nextSetting('earth', serie([1, 1, 1, 1, 1], [-1, 1, 1, 0.5, -1.5]), 0)).toBe(3.25)
    expect(nextSetting('earth', serie([1, 1, 1], [1, 1, 1]), 0)).toBeNull()
    expect(nextSetting('earth', serie([1, 1, 1], [-1, -1, -1]), 0)).toBeNull()
  })

  it('o próximo pôr do Sol sai igual pela conta geral e pela do Sol', () => {
    const series = [
      serie([1, 1, 0.8, 0.2, 0], [1, 1, 1, 1, 1]),
      serie([0, 0.1, 0.9, 1, 0.75, 0.25], [1, 1, 1, 1, 1, 1]),
      serie([1, 1, 1], [1, 1, 1]),
    ]
    for (const s of series) expect(nextSetting('sun', s, 0)).toBe(nextSunset(s, 0))
  })

  it('janela de pouso: entra quando o último dos dois aparece e sai quando o primeiro some, entre duas horas', () => {
    const n = 400
    const sol = new Array(n).fill(0)
    const terra = new Array(n).fill(-1)
    // a Terra aparece na hora 8; o Sol passa da metade do disco entre a 9 (0,2) e a 10 (0,8)
    for (let i = 8; i < 170; i++) terra[i] = 1
    sol[9] = 0.2
    sol[10] = 0.8
    for (let i = 11; i < 175; i++) sol[i] = 1
    // a Terra some primeiro: entre a 159 (margem 0,5) e a 160 (margem −0,5)
    terra[159] = 0.5
    for (let i = 160; i < 170; i++) terra[i] = -0.5
    expect(findLandingWindows(serie(sol, terra), 144)).toEqual([
      { startHours: 9.5, endHours: 159.5, startsBeforePeriod: false, endsAfterPeriod: false },
    ])
  })

  it('quando o Sol e a Terra mudam na mesma hora, vale o mais tarde na entrada e o mais cedo na saída', () => {
    // entre as horas 1 e 2: a Terra cruza zero na metade (1,5), o Sol só aos três quartos (1,75)
    // entre as horas 4 e 5: o Sol cai abaixo de metade na metade (4,5), a Terra só aos três quartos (4,75)
    const sol = [0, 0.2, 0.6, 1, 1, 0, 0, 0]
    const terra = [-1, -1, 1, 1, 1.5, -0.5, -1, -1]
    expect(findLandingWindows(serie(sol, terra), 1)).toEqual([
      { startHours: 1.75, endHours: 4.5, startsBeforePeriod: false, endsAfterPeriod: false },
    ])
  })

  it('janela de pouso que termina pelo Sol termina no pôr do Sol', () => {
    const sol = [0, 0, 1, 1, 1, 0.8, 0.2, 0, 0, 0]
    const terra = new Array(10).fill(1)
    const [janela] = findLandingWindows(serie(sol, terra), 1)
    expect(janela.endHours).toBe(5.5)
    expect(janela.endHours).toBe(nextSunset(serie(sol, terra), 0))
  })

  it('o mínimo pedido vale para a janela inteira dentro do período', () => {
    const n = 400
    const sol = new Array(n).fill(0)
    const terra = new Array(n).fill(1)
    for (let i = 200; i < 300; i++) sol[i] = 1 // cerca de 100 h
    expect(findLandingWindows(serie(sol, terra), 144)).toEqual([])
    expect(findLandingWindows(serie(sol, terra), 1)).toHaveLength(1)
  })

  it('janela cortada no começo ou no fim do período fica na lista, marcada, mesmo mais curta que o mínimo', () => {
    // à vista desde o primeiro instante até entre as horas 2 e 3; e de novo entre a 7 e a 8 até o último
    const sol = [1, 1, 1, 0, 0, 0, 0, 0, 1, 1]
    const terra = new Array(10).fill(1)
    expect(findLandingWindows(serie(sol, terra, 2), 144)).toEqual([
      { startHours: 0, endHours: 5, startsBeforePeriod: true, endsAfterPeriod: false },
      { startHours: 15, endHours: 18, startsBeforePeriod: false, endsAfterPeriod: true },
    ])
  })
})

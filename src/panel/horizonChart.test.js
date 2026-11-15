import { describe, expect, it } from 'vitest'

import { CHART, horizonChartModel } from './horizonChart.js'

const plano = (deg) => Array.from({ length: 360 }, () => deg)
const ponto = (azimuthDeg, elevationDeg, visible) => ({ azimuthDeg, elevationDeg, visible })

describe('o desenho da vista do horizonte (item 2)', () => {
  it('o contorno do relevo vai de 0° a 360° e fecha embaixo, para virar área', () => {
    const model = horizonChartModel({ horizonDeg: plano(1), sun: [], earth: [] })
    expect(model.terrainPath.startsWith(`M0 ${CHART.height}`)).toBe(true)
    expect(model.terrainPath).toContain(`L${CHART.width} `)
    expect(model.terrainPath.endsWith('Z')).toBe(true)
  })

  it('o caminho do astro se parte onde muda entre à vista e escondido', () => {
    const sun = [ponto(10, 1, true), ponto(11, 1, true), ponto(12, 0, false), ponto(13, 0, false)]
    const { sunSegments } = horizonChartModel({ horizonDeg: plano(0), sun, earth: [] })
    expect(sunSegments.map((s) => s.visible)).toEqual([true, false])
    // o trecho escondido começa no último ponto à vista, para a linha não ter buraco
    expect(sunSegments[1].points).toHaveLength(3)
  })

  it('o caminho que passa de 359° para 0° se parte, em vez de riscar a vista inteira', () => {
    const sun = [ponto(358, 1, true), ponto(359.5, 1, true), ponto(1, 1, true), ponto(2, 1, true)]
    const { sunSegments } = horizonChartModel({ horizonDeg: plano(0), sun, earth: [] })
    expect(sunSegments).toHaveLength(2)
    for (const segment of sunSegments) {
      const xs = segment.points.map(([x]) => x)
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(CHART.width / 2)
    }
  })

  it('a escala vertical cobre o relevo e os astros, com o 0° do horizonte plano dentro', () => {
    const model = horizonChartModel({ horizonDeg: plano(4), sun: [ponto(0, -2, false)], earth: [ponto(0, 9, true)] })
    expect(model.minDeg).toBeLessThanOrEqual(-2)
    expect(model.maxDeg).toBeGreaterThanOrEqual(9)
    expect(model.yOf(0)).toBeGreaterThan(model.yOf(4))
  })

  it('conta as horas à vista e a altura máxima do relevo, para o resumo em texto', () => {
    const sun = [ponto(0, 1, true), ponto(1, 1, false), ponto(2, 1, true)]
    const earth = [ponto(0, 1, false)]
    const horizon = plano(1)
    horizon[200] = 7.25
    const model = horizonChartModel({ horizonDeg: horizon, sun, earth })
    expect(model.sunVisibleHours).toBe(2)
    expect(model.earthVisibleHours).toBe(0)
    expect(model.totalHours).toBe(3)
    expect(model.highestTerrain).toEqual({ elevationDeg: 7.25, azimuthDeg: 200 })
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'

import reference from './fixtures/polarReference.json'
import { latLonToUnit, localFrame, measurePolarPolygon, polarXYToUnit, unitToLatLon, unitToPolarXY } from './geometry.js'

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const length = (a) => Math.sqrt(dot(a, a))

/* Pontos de ida e volta: o equador, os dois polos de perto, a longitude dando a volta em ±180°
   e dois pontos do polo sul que também estão na referência do SPICE. */
const POINTS = [
  [0, 0], [12.5, 77], [-45, -30], [-89.999, 10], [89.999, -170],
  [-89.475, -137.44], [-86, 2.06], [-60, 179.9], [-60, -179.9],
]

describe('latitude e longitude no referencial da Lua', () => {
  it('cada eixo cai onde o referencial dos dados LOLA manda', () => {
    const casos = [
      [[0, 0], [1, 0, 0]],
      [[0, 90], [0, 1, 0]],
      [[90, 0], [0, 0, 1]],
      [[-90, 0], [0, 0, -1]],
    ]
    for (const [[lat, lon], esperado] of casos) {
      const p = latLonToUnit(lat, lon)
      for (let i = 0; i < 3; i++) expect(p[i]).toBeCloseTo(esperado[i], 12)
    }
  })

  it('ida e volta devolve a mesma latitude e longitude', () => {
    for (const [lat, lon] of POINTS) {
      const volta = unitToLatLon(latLonToUnit(lat, lon))
      expect(Math.abs(volta.lat - lat)).toBeLessThan(1e-9)
      expect(Math.abs(volta.lon - lon)).toBeLessThan(1e-9)
    }
  })
})

describe('projeção polar sul dos arquivos LOLA', () => {
  /* A referência é o pyproj (scripts/references/polar_reference.py). Uma ida e volta sozinha não
     pegaria x trocado com y: a fórmula errada desfaria o próprio erro. */
  it('a posição x/y bate com a do pyproj a menos de 1 mm', () => {
    expect(reference.points.length).toBeGreaterThan(20)
    for (const ponto of reference.points) {
      const [x, y] = unitToPolarXY(latLonToUnit(ponto.lat, ponto.lon))
      expect(Math.abs(x - ponto.x), `x em ${ponto.lat}, ${ponto.lon}`).toBeLessThan(1e-3)
      expect(Math.abs(y - ponto.y), `y em ${ponto.lat}, ${ponto.lon}`).toBeLessThan(1e-3)
    }
  })

  /* A volta compara x/y com x/y, e não com a latitude e a longitude da referência: os valores da
     referência são arredondados ao micrômetro, e perto do polo (x de 20 m) esse arredondamento
     sozinho já desloca a longitude em 1e-8 grau. */
  it('ida e volta x/y devolve o mesmo ponto', () => {
    for (const ponto of reference.points) {
      const p = polarXYToUnit(ponto.x, ponto.y)
      const [x, y] = unitToPolarXY(p)
      expect(Math.abs(x - ponto.x)).toBeLessThan(1e-6)
      expect(Math.abs(y - ponto.y)).toBeLessThan(1e-6)
      expect(Math.abs(length(p) - 1)).toBeLessThan(1e-12)
    }
  })
})

describe('referencial local (leste, norte, cima)', () => {
  it('três eixos de tamanho 1, perpendiculares, com cima apontando para fora da Lua', () => {
    for (const [lat, lon] of POINTS.filter(([lat]) => Math.abs(lat) < 89.99)) {
      const p = latLonToUnit(lat, lon)
      const { east, north, up } = localFrame(p)
      for (const eixo of [east, north, up]) expect(Math.abs(length(eixo) - 1)).toBeLessThan(1e-12)
      expect(Math.abs(dot(east, north))).toBeLessThan(1e-12)
      expect(Math.abs(dot(east, up))).toBeLessThan(1e-12)
      expect(Math.abs(dot(north, up))).toBeLessThan(1e-12)
      expect(dot(up, p)).toBeCloseTo(1, 12)
    }
  })

  it('leste aponta para a longitude maior e norte para a latitude maior', () => {
    const p = latLonToUnit(-60, 30)
    const { east, north } = localFrame(p)
    const maisLeste = latLonToUnit(-60, 30.01)
    const maisNorte = latLonToUnit(-59.99, 30)
    const d = (a) => [a[0] - p[0], a[1] - p[1], a[2] - p[2]]
    expect(dot(d(maisLeste), east)).toBeGreaterThan(0)
    expect(dot(d(maisNorte), north)).toBeGreaterThan(0)
  })
})

describe('contorno de uma região perto do polo sul (card E16)', () => {
  /* O contorno chega como no GeoJSON: [longitude, latitude], com o último canto repetindo o primeiro.
     Os cantos são montados na própria projeção polar, a partir de um centro conhecido. */
  function ringAround(centerLat, centerLon, cornersM) {
    const [cx, cy] = unitToPolarXY(latLonToUnit(centerLat, centerLon))
    const ring = cornersM.map(([dx, dy]) => {
      const { lat, lon } = unitToLatLon(polarXYToUnit(cx + dx, cy + dy))
      return [lon, lat]
    })
    return [...ring, ring[0]]
  }
  const SQUARE_20_KM = [[-10000, -10000], [10000, -10000], [10000, 10000], [-10000, 10000]]

  it('o centro de um quadrado de 20 km é o ponto em volta do qual ele foi montado', () => {
    for (const [lat, lon] of [[-85.4266, 31.7428], [-88.23, -64.6284], [-84.3347, 30.5923]]) {
      const center = measurePolarPolygon(ringAround(lat, lon, SQUARE_20_KM))
      expect(Math.abs(center.lat - lat)).toBeLessThan(1e-9)
      expect(Math.abs(center.lon - lon)).toBeLessThan(1e-9)
    }
  })

  it('em cima da longitude 180°, o centro fica em 180°, e não em 0°', () => {
    // a média das longitudes dos cantos (perto de +180 e de -180) daria perto de 0°
    const center = measurePolarPolygon(ringAround(-86, 180, SQUARE_20_KM))
    expect(Math.abs(center.lat + 86)).toBeLessThan(1e-9)
    expect(Math.abs(Math.abs(center.lon) - 180)).toBeLessThan(1e-9)
  })

  it('o centro é o da área, e não a média dos cantos', () => {
    /* Um trapézio com a base de 20 km, o topo de 10 km e 20 km de altura: o centro da área fica a
       20 · (20 + 2 · 10) / (3 · (20 + 10)) = 8,889 km da base, e a média dos cantos, a 10 km. */
    const trapezoid = [[-10000, 0], [10000, 0], [5000, 20000], [-5000, 20000]]
    const [cx, cy] = unitToPolarXY(latLonToUnit(-86, 40))
    const expected = unitToLatLon(polarXYToUnit(cx, cy + (20000 * 40) / 90))
    const center = measurePolarPolygon(ringAround(-86, 40, trapezoid))
    expect(Math.abs(center.lat - expected.lat)).toBeLessThan(1e-9)
    expect(Math.abs(center.lon - expected.lon)).toBeLessThan(1e-9)
  })

  it('a área é medida na projeção polar: 400 km² para o quadrado de 20 km', () => {
    expect(measurePolarPolygon(ringAround(-85, 10, SQUARE_20_KM)).areaM2).toBeCloseTo(4e8, 0)
  })
})

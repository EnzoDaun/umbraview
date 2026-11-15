// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { computeEphemeris } from './ephemeris.js'
import { latLonToUnit } from './geometry.js'
import { ECLIPTIC_SKY_MATRIX, SIDEREAL_YEAR_DAYS, earthOrbitPath, moonOrbitPath, sunPositionAu, systemStateAt } from './system.js'

const GRAU = 180 / Math.PI
const NOV_14 = Date.UTC(2026, 10, 14)
const DIA = 24 * 3600e3
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const tamanho = (v) => Math.hypot(...v)
const angulo = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (tamanho(a) * tamanho(b))))) * GRAU
// a matriz 4 × 4 em colunas: a coluna c é a direção de um eixo do corpo no desenho
const coluna = (m, c) => [m[4 * c], m[4 * c + 1], m[4 * c + 2]]
// no desenho, o y aponta para o norte do plano da órbita da Terra (a eclíptica)
const NORTE = [0, 1, 0]

describe('a Terra, a Lua e o Sol num instante (systemStateAt)', () => {
  const estado = systemStateAt(NOV_14)

  it('a Lua fica à distância que ela tem da Terra: entre o perigeu e o apogeu', () => {
    expect(estado.distanceKm).toBeGreaterThan(356000)
    expect(estado.distanceKm).toBeLessThan(407000)
    expect(tamanho(estado.moonKm)).toBeCloseTo(estado.distanceKm, 3)
  })

  it('a órbita da Lua fica a uns 5° do plano da órbita da Terra, e nunca longe dele', () => {
    let maior = 0
    for (let d = 0; d < 28; d++) {
      const { moonKm } = systemStateAt(NOV_14 + d * DIA)
      maior = Math.max(maior, Math.abs(90 - angulo(moonKm, NORTE)))
    }
    expect(maior).toBeGreaterThan(4.5)
    expect(maior).toBeLessThan(5.5)
  })

  it('o eixo da Terra está inclinado 23,4° e o da Lua, 1,5°, em relação ao norte da eclíptica', () => {
    // o eixo y do corpo, no desenho, é o polo norte dele
    expect(angulo(coluna(estado.earthMatrix, 1), NORTE)).toBeCloseTo(23.44, 1)
    expect(angulo(coluna(estado.moonMatrix, 1), NORTE)).toBeGreaterThan(1.4)
    expect(angulo(coluna(estado.moonMatrix, 1), NORTE)).toBeLessThan(1.7)
  })

  it('a Lua mostra sempre a mesma face para a Terra, a menos da libração', () => {
    for (let d = 0; d < 28; d += 3) {
      const { moonKm, moonMatrix, subEarth } = systemStateAt(NOV_14 + d * DIA)
      // o eixo x da Lua, no desenho, é o meio do lado visível (latitude 0°, longitude 0°)
      const paraATerra = moonKm.map((v) => -v)
      const desvio = angulo(coluna(moonMatrix, 0), paraATerra)
      expect(desvio).toBeLessThan(9)
      // o desvio é a própria libração: o ponto da Lua com a Terra a pino
      const meioDoLadoVisivel = latLonToUnit(0, 0)
      expect(desvio).toBeCloseTo(angulo(latLonToUnit(subEarth.lat, subEarth.lon), meioDoLadoVisivel), 1)
    }
  })

  it('a direção do Sol e o ponto com o Sol a pino batem com o motor do horizonte', () => {
    const { sunDirection } = computeEphemeris(NOV_14, 1, 1)
    const { subSolar } = estado
    const esperado = Array.from(sunDirection)
    expect(angulo(latLonToUnit(subSolar.lat, subSolar.lon), esperado)).toBeLessThan(0.01)
    expect(tamanho(estado.sunDirection)).toBeCloseTo(1, 12)
  })

  it('a parte iluminada da Lua vista da Terra vai de quase 0 a quase 1 ao longo de um mês', () => {
    const fracoes = Array.from({ length: 30 }, (_, d) => systemStateAt(NOV_14 + d * DIA).phaseFraction)
    expect(Math.min(...fracoes)).toBeLessThan(0.05)
    expect(Math.max(...fracoes)).toBeGreaterThan(0.95)
  })
})

describe('o caminho da Lua em volta da Terra (moonOrbitPath)', () => {
  it('dá uma volta inteira em um mês sideral: o fim encosta no começo', () => {
    const caminho = moonOrbitPath(NOV_14, 120)
    expect(caminho).toHaveLength(121)
    // a órbita não fecha exatamente (ela gira devagar), mas a Lua volta à mesma direção
    expect(angulo(caminho[0], caminho[120])).toBeLessThan(3)
    expect(angulo(caminho[0], caminho[60])).toBeGreaterThan(170)
  })
})

describe('o céu de estrelas no desenho da eclíptica (ECLIPTIC_SKY_MATRIX)', () => {
  it('põe o polo norte celeste a 23,4° do norte da eclíptica, e não muda o tamanho das direções', () => {
    // a coluna 2 é para onde vai o eixo z do catálogo, o polo norte celeste
    expect(angulo(coluna(ECLIPTIC_SKY_MATRIX, 2), NORTE)).toBeCloseTo(23.44, 1)
    for (let c = 0; c < 3; c++) expect(tamanho(coluna(ECLIPTIC_SKY_MATRIX, c))).toBeCloseTo(1, 12)
  })
})

/* A órbita da Terra em volta do Sol, para a linha dela na vista do sistema. As posições são as do
   motor (a mesma direção do Sol do systemStateAt), só vistas do Sol em vez de vistas da Terra. */
describe('a órbita da Terra em volta do Sol (earthOrbitPath)', () => {
  const PASSOS = 180
  const caminho = earthOrbitPath(NOV_14, PASSOS)

  it('o Sol fica a 1 UA da Terra, na direção que o systemStateAt dá', () => {
    const sol = sunPositionAu(NOV_14)
    // a distância ao Sol varia entre 0,983 UA (janeiro) e 1,017 UA (julho)
    expect(tamanho(sol)).toBeGreaterThan(0.983)
    expect(tamanho(sol)).toBeLessThan(1.017)
    // 1e-4 e não menos: perto de 0° o arco-cosseno só enxerga até uns 1e-6° (o arredondamento do float)
    expect(angulo(sol, systemStateAt(NOV_14).sunDirection)).toBeLessThan(1e-4)
  })

  it('a Terra está no próprio caminho: o primeiro ponto é onde ela está na data, vista do Sol', () => {
    const sol = sunPositionAu(NOV_14)
    // a Terra vista do Sol é o Sol visto da Terra, ao contrário: somados, dão zero
    caminho[0].forEach((valor, k) => expect(valor + sol[k]).toBeCloseTo(0, 12))
    expect(caminho).toHaveLength(PASSOS + 1)
  })

  it('o caminho é quase um círculo de 1 UA, deitado no plano da eclíptica', () => {
    for (const ponto of caminho) {
      expect(tamanho(ponto)).toBeGreaterThan(0.983)
      expect(tamanho(ponto)).toBeLessThan(1.017)
      // o y do desenho é o norte da eclíptica: a Terra nunca sai do plano da própria órbita
      expect(Math.abs(ponto[1])).toBeLessThan(1e-3)
    }
  })

  it('dá uma volta inteira em um ano sideral: termina onde começou, e no meio está do outro lado', () => {
    expect(angulo(caminho[0], caminho[PASSOS])).toBeLessThan(0.5)
    expect(angulo(caminho[0], caminho[PASSOS / 2])).toBeGreaterThan(175)
    // o ano sideral da NASA NSSDC Earth Fact Sheet
    expect(SIDEREAL_YEAR_DAYS).toBe(365.256)
  })

  it('a Terra anda no caminho no sentido certo: um dia depois, perto de 1° adiante', () => {
    const hoje = sunPositionAu(NOV_14).map((v) => -v)
    const amanha = sunPositionAu(NOV_14 + DIA).map((v) => -v)
    const passo = angulo(hoje, amanha)
    expect(passo).toBeGreaterThan(0.95)
    expect(passo).toBeLessThan(1.05)
    // e o ponto de amanhã cai entre o primeiro e o segundo ponto do caminho (2° por trecho)
    expect(angulo(amanha, caminho[1])).toBeLessThan(angulo(hoje, caminho[1]))
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { latLonToScene } from './coordinates.js'
import {
  CAMERA_FOV_DEG, EARTH_RADIUS, FRAME_MARGIN, SYSTEM_COMPRESSION, approach, clampPolar, fitDistance, heroDirection,
  lensShift, nearestAzimuth, orbitAngles, shortestTurn, skyAngle, sunSideStart, systemCamera, systemScale, systemViewRadius,
} from './framing.js'

const DEG = Math.PI / 180

/* A régua do teste, escrita à parte: quanto da meia altura e da meia largura da área livre a Lua
   ocupa, vista da distância d. */
function occupancy({ width, height, insetRight = 0, insetBottom = 0 }, distance) {
  const projected = Math.tan(Math.asin(1 / distance)) / Math.tan((CAMERA_FOV_DEG * DEG) / 2) // em meias alturas da tela
  const radiusPx = projected * (height / 2)
  return {
    vertical: radiusPx / ((height - insetBottom) / 2),
    horizontal: radiusPx / ((width - insetRight) / 2),
  }
}

describe('enquadramento da Lua inteira', () => {
  /* Os três tamanhos que a rodada manda testar, com o painel que a v2 põe por cima da cena: 380 px
     à direita no computador, e a gaveta embaixo no celular. */
  const SCREENS = [
    ['1366×768 com o painel à direita', { width: 1366, height: 768, insetRight: 412 }],
    ['1920×1080 com o painel à direita', { width: 1920, height: 1080, insetRight: 412 }],
    ['celular 390×844 com a gaveta embaixo', { width: 390, height: 844, insetBottom: 380 }],
    ['celular 390×844 com a gaveta fechada', { width: 390, height: 844, insetBottom: 96 }],
    ['tela larga e baixa, sem painel', { width: 2560, height: 600 }],
  ]

  it.each(SCREENS)('%s: a Lua cabe inteira na área livre, com folga, sem ficar pequena', (_, screen) => {
    const distance = fitDistance(screen)
    const { vertical, horizontal } = occupancy(screen, distance)
    // nenhum lado passa da área livre (era o defeito da v1: a borda de cima e a de baixo cortavam)
    expect(Math.max(vertical, horizontal)).toBeLessThanOrEqual(1 / FRAME_MARGIN + 1e-9)
    // e o lado que limita encosta na folga: a Lua não fica menor do que precisa
    expect(Math.max(vertical, horizontal)).toBeCloseTo(1 / FRAME_MARGIN, 6)
  })

  it('quanto mais o painel cobre, mais longe a câmera fica', () => {
    const open = fitDistance({ width: 390, height: 844, insetBottom: 380 })
    const closed = fitDistance({ width: 390, height: 844, insetBottom: 96 })
    expect(open).toBeGreaterThanOrEqual(closed)
    const narrow = fitDistance({ width: 900, height: 768, insetRight: 412 })
    const wide = fitDistance({ width: 900, height: 768 })
    expect(narrow).toBeGreaterThan(wide)
  })

  it('a lente desloca a imagem metade do que o painel cobre, para o meio da área livre', () => {
    expect(lensShift({ insetRight: 412 })).toEqual({ x: 206, y: 0 })
    expect(lensShift({ insetBottom: 380 })).toEqual({ x: 0, y: 190 })
    expect(lensShift({})).toEqual({ x: 0, y: 0 })
  })
})

describe('direção da câmera', () => {
  it('a vista da Lua inteira fica ao sul do equador e a oeste do Sol, para o terminador cruzar o disco', () => {
    const subsolar = { lat: 1.2, lon: 40 }
    const [x, y, z] = heroDirection(subsolar)
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12)
    expect(y).toBeLessThan(0)
    // entre a câmera e o Sol, mais de 45° e menos de 90°: nem Lua cheia nem metade escura
    const sun = latLonToScene(subsolar.lat, subsolar.lon)
    const angle = Math.acos(x * sun[0] + y * sun[1] + z * sun[2]) / DEG
    expect(angle).toBeGreaterThan(45)
    expect(angle).toBeLessThan(90)
  })

  it('os ângulos de órbita devolvem a direção do ponto, na convenção do Spherical do three', () => {
    const point = latLonToScene(-84.79, 29.2)
    const { azimuth, polar } = orbitAngles(point.map((v) => v * 3.5))
    // x = sen(polar)·sen(azimute), y = cos(polar), z = sen(polar)·cos(azimute)
    expect(Math.sin(polar) * Math.sin(azimuth)).toBeCloseTo(point[0], 12)
    expect(Math.cos(polar)).toBeCloseTo(point[1], 12)
    expect(Math.sin(polar) * Math.cos(azimuth)).toBeCloseTo(point[2], 12)
  })

  it('o azimute do voo é o da volta mais perto, mesmo depois de a pessoa dar voltas na Lua', () => {
    const turn = 2 * Math.PI
    // a câmera já deu duas voltas e um pouco; o alvo fica 0,2 rad adiante, e não duas voltas atrás
    expect(nearestAzimuth(0.5, 2 * turn + 0.3)).toBeCloseTo(2 * turn + 0.5, 12)
    // o caminho curto atravessa o ±π em vez de dar a volta inteira
    expect(nearestAzimuth(-3, 3)).toBeCloseTo(3 + (turn - 6), 12)
    expect(nearestAzimuth(3, -3)).toBeCloseTo(-3 - (turn - 6), 12)
    expect(nearestAzimuth(1, 1)).toBeCloseTo(1, 12)
  })

  it('o polar nunca chega em cima do eixo, onde o giro da câmera fica indefinido', () => {
    expect(clampPolar(0)).toBeGreaterThan(0)
    expect(clampPolar(Math.PI)).toBeLessThan(Math.PI)
    expect(clampPolar(1.2)).toBe(1.2)
  })
})

describe('valor que persegue o alvo', () => {
  it('chega no alvo e para, sem passar dele', () => {
    let value = 0
    const seen = []
    for (let i = 0; i < 200 && value !== 206; i++) {
      value = approach(value, 206, 1 / 60, 0.06)
      seen.push(value)
    }
    expect(value).toBe(206)
    expect(Math.max(...seen)).toBe(206)
    // sempre para a frente
    expect(seen.every((v, i) => i === 0 || v >= seen[i - 1])).toBe(true)
  })

  it('metade do caminho em uma meia-vida', () => {
    expect(approach(0, 100, 0.06, 0.06)).toBeCloseTo(50, 9)
  })
})

describe('vista Terra–Lua–Sol', () => {
  // a Terra vista da Lua fica perto da longitude 0° (o +x da cena), a uns 384 mil km
  const earthKm = [384400, 12000, -20000]
  const scale = systemScale(1737400)
  const earth = earthKm.map((v) => v * scale)

  it('a distância é encolhida, e o tamanho da Terra em relação à Lua continua o de verdade', () => {
    // 384.400 km são 221 raios da Lua; encolhidos 9 vezes, uns 24,6
    expect(Math.hypot(...earth)).toBeCloseTo(Math.hypot(...earthKm) / 1737.4 / SYSTEM_COMPRESSION, 9)
    expect(EARTH_RADIUS).toBeCloseTo(3.671, 3)
  })

  it('a câmera mira a Terra e fica do lado da Lua, acima do plano das duas', () => {
    const { target, direction } = systemCamera(earth)
    expect(target).toEqual(earth)
    expect(Math.hypot(...direction)).toBeCloseTo(1, 12)
    // acima do plano
    expect(direction[1]).toBeGreaterThan(0.3)
    // do lado da Lua: a direção da câmera aponta mais para a Lua (a origem) do que para longe dela
    const toMoon = earth.map((v) => -v)
    const along = direction[0] * toMoon[0] + direction[2] * toMoon[2]
    expect(along).toBeGreaterThan(0)
  })

  it('o raio enquadrado cobre a órbita inteira em volta da Terra, com a Lua dentro', () => {
    expect(systemViewRadius(24.6)).toBeGreaterThan(24.6)
  })

  it('o ângulo do céu acompanha o giro em volta do eixo y, e a diferença vai pelo caminho curto', () => {
    // um giro de 30° em volta de y, escrito por linhas: a direção fixa anda 30°
    const a = (30 * Math.PI) / 180
    const turned = [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)]
    const still = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    expect(Math.abs(shortestTurn(skyAngle(still), skyAngle(turned)))).toBeCloseTo(a, 12)
    expect(shortestTurn(3.1, -3.1)).toBeCloseTo(2 * Math.PI - 6.2, 12)
    expect(shortestTurn(-3.1, 3.1)).toBeCloseTo(-(2 * Math.PI - 6.2), 12)
    expect(shortestTurn(1, 1)).toBeCloseTo(0, 12)
  })
})

describe('vista Terra–Lua–Sol, onde a Lua aparece', () => {
  it('a Lua fica à direita da Terra na tela, fora do canto do relógio da vista', () => {
    // a câmera olha da direção dada para a Terra; a direita dela é (para cima) × (para a câmera)
    const earth = [24.6, 0.8, -1.3]
    const { direction } = systemCamera(earth)
    const right = [direction[2], 0, -direction[0]]
    const toMoon = earth.map((v) => -v)
    expect(right[0] * toMoon[0] + right[2] * toMoon[2]).toBeGreaterThan(0)
  })
})

/* A câmera da vista Terra, Lua e Sol nasce girada conforme a data: o Sol sempre à esquerda da
   tela e um pouco para trás da Terra. Sem isso, em parte do ano o Sol nascia entre a câmera e a
   Terra, cortado pela borda da cena (visto no navegador em 15/11/2026). */
describe('a câmera da vista do sistema nasce com o Sol à esquerda (sunSideStart)', () => {
  const BASE = [0.4, 2.4, 6.4]
  const SOIS = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0.6, 0.02, -0.8], [-0.7, -0.01, 0.71]]
  // a direita da tela, para uma câmera que olha para o centro da cena
  const direita = ([x, , z]) => {
    const r = Math.hypot(x, z)
    return [z / r, 0, -x / r]
  }

  it('mantém a altura e a distância da câmera: só gira em volta do eixo de cima', () => {
    for (const sol of SOIS) {
      const camera = sunSideStart(BASE, sol)
      expect(camera[1]).toBe(BASE[1])
      expect(Math.hypot(camera[0], camera[2])).toBeCloseTo(Math.hypot(BASE[0], BASE[2]), 12)
    }
  })

  it('o Sol fica à esquerda da tela e atrás da Terra, em qualquer época do ano', () => {
    for (const sol of SOIS) {
      const camera = sunSideStart(BASE, sol)
      const lado = direita(camera)
      expect(lado[0] * sol[0] + lado[2] * sol[2]).toBeLessThan(-0.9)
      // atrás: do lado oposto ao da câmera, mas pouco, para a Terra aparecer quase meio iluminada
      const frente = (camera[0] * sol[0] + camera[2] * sol[2]) / Math.hypot(camera[0], camera[2])
      expect(frente).toBeLessThan(0)
      expect(frente).toBeGreaterThan(-0.4)
    }
  })

  it('com o Sol no +x, a câmera vai para o lado do −z', () => {
    const [x, y, z] = sunSideStart([0, 2.4, 6.4], [1, 0, 0])
    // o Sol a 100° à esquerda de quem olha: a câmera fica a 190° do +z
    expect(x).toBeCloseTo(6.4 * Math.sin(190 * DEG), 12)
    expect(y).toBe(2.4)
    expect(z).toBeCloseTo(6.4 * Math.cos(190 * DEG), 12)
  })
})

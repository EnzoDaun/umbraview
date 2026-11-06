/* O clique na Lua e o marcador do ponto escolhido (card C3). As contas ficam fora do componente
 * para serem testadas sem WebGL; que o clique chega e o marcador aparece se confere no navegador,
 * no "Pronto quando" do card. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MOON_RADIUS_M } from '../engine/geometry.js'
import { latLonToScene } from './coordinates.js'
import { CLICK_MAX_DRAG_PX, isOnNearSide, markerPosition, readMoonClick, reliefHeightAtM } from './picking.js'

const pasta = join(process.cwd(), 'public', 'data', 'relief')
const manifest = JSON.parse(readFileSync(join(pasta, 'manifest.json'), 'utf8'))

/* Um clique sem arrasto, no ponto da Lua de latitude e longitude dadas, um pouco acima do raio 1,
   como quando ele cai numa montanha. */
function cliqueEm(latDeg, lonDeg, delta = 0) {
  return { point: latLonToScene(latDeg, lonDeg).map((v) => v * 1.002), delta }
}

/* 5 × 5 pixels de 1 km, com o polo no centro do pixel do meio, e todas as alturas iguais (a mesma
   grade de reliefMesh.test.js). */
function relevoPequeno(altura) {
  return {
    manifest: { heightScale: 0.5, far: { resolutionM: 1000, x0: -2500, y0: 2500, columns: 5, rows: 5 } },
    heights: new Int16Array(25).fill(altura),
  }
}

describe('readMoonClick', () => {
  it('dentro da área, escolhe o ponto clicado', () => {
    const { site } = readMoonClick(cliqueEm(-89.475, -137.44), manifest)
    expect(site.lat).toBeCloseTo(-89.475, 9)
    expect(site.lon).toBeCloseTo(-137.44, 9)
  })

  it('o limite da área (84°S, do manifesto) ainda escolhe', () => {
    expect(manifest.areaMaxLatDeg).toBe(-84)
    expect(readMoonClick(cliqueEm(-84, 10), manifest).site).toBeDefined()
  })

  it('fora da área, não escolhe e pede o aviso', () => {
    expect(readMoonClick(cliqueEm(-83.9, 10), manifest)).toEqual({ outside: true })
    expect(readMoonClick(cliqueEm(30, 10), manifest)).toEqual({ outside: true })
  })

  it('o fim de um arrasto para girar a Lua não escolhe nada', () => {
    // o three chama o clique também quando o mouse é solto depois de girar a Lua
    expect(readMoonClick(cliqueEm(-89, 0, CLICK_MAX_DRAG_PX), manifest).site).toBeDefined()
    expect(readMoonClick(cliqueEm(-89, 0, CLICK_MAX_DRAG_PX + 1), manifest)).toBeNull()
    expect(readMoonClick(cliqueEm(30, 0, CLICK_MAX_DRAG_PX + 1), manifest)).toBeNull()
  })

  it('enquanto o manifesto não chegou, a área é desconhecida, e o clique não faz nada', () => {
    expect(readMoonClick(cliqueEm(-89, 0), null)).toBeNull()
  })
})

describe('reliefHeightAtM', () => {
  it('lê a altura do pixel onde o ponto cai', () => {
    // 2000 unidades de meio metro: 1 km
    expect(reliefHeightAtM(relevoPequeno(2000), -90, 0)).toBe(1000)
  })

  it('fora da grade, ou sem relevo, a altura é zero, a da esfera lisa', () => {
    expect(reliefHeightAtM(relevoPequeno(2000), -89, 0)).toBe(0)
    expect(reliefHeightAtM(null, -90, 0)).toBe(0)
  })

  it('com o far.bin do site, fica entre a altura mais baixa e a mais alta do polo', () => {
    const arquivo = readFileSync(join(pasta, manifest.far.file))
    const heights = new Int16Array(arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength))
    const altura = reliefHeightAtM({ manifest, heights }, -89.475, -137.44)
    // a altura guardada vai de −7,7 km a +7,0 km (reliefMesh.test.js)
    expect(altura).toBeGreaterThan(-7709)
    expect(altura).toBeLessThan(6976)
    expect(altura).not.toBe(0)
  })
})

describe('markerPosition', () => {
  it('fica na direção do ponto, na altura do relevo', () => {
    const posicao = markerPosition({ lat: -90, lon: 0 }, relevoPequeno(2000))
    expect(posicao[0]).toBeCloseTo(0, 12)
    expect(posicao[1]).toBeCloseTo(-(1 + 1000 / MOON_RADIUS_M), 12)
    expect(posicao[2]).toBeCloseTo(0, 12)
  })

  it('sem relevo, fica na esfera de raio 1', () => {
    expect(Math.hypot(...markerPosition({ lat: -85, lon: 20 }, null))).toBeCloseTo(1, 12)
  })
})

describe('isOnNearSide', () => {
  it('o ponto do lado da câmera aparece; o do outro lado da Lua, não', () => {
    const camera = [0, -3, 0.01]
    expect(isOnNearSide(latLonToScene(-89, 0), camera)).toBe(true)
    expect(isOnNearSide(latLonToScene(89, 0), camera)).toBe(false)
  })
})

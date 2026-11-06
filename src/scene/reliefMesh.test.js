/* A malha do relevo do polo (card C2). Primeiro com uma grade pequena, inventada, onde dá para
 * conferir cada vértice de cabeça; depois com o far.bin do site, que é o que a cena desenha. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MOON_RADIUS_M } from '../engine/geometry.js'
import { buildReliefCap, polarDistanceToAngle, smoothSphereThetaLength } from './reliefMesh.js'

/* 5 × 5 pixels de 1 km, com o polo no centro do pixel do meio, e todas as alturas iguais. */
function gradePequena({ altura = 0, reachM = 10000 } = {}) {
  return {
    heights: new Int16Array(25).fill(altura),
    heightScale: 0.5,
    resolutionM: 1000,
    reachM,
    x0: -2500,
    y0: 2500,
    columns: 5,
    rows: 5,
  }
}

const SEM_BORDA = { step: 1, overlapM: 0, fadeM: 1e-9 }

/* As posições saem em Float32Array, o que a placa de vídeo usa: perto do raio 1, ele guarda uns
   7 algarismos, ou seja, uns 10 cm na Lua. Comparar com mais casas que isso reprovaria o
   arredondamento, e não a conta. */
const CASAS_FLOAT32 = 7

function vertices(positions) {
  const lista = []
  for (let i = 0; i < positions.length; i += 3) lista.push([positions[i], positions[i + 1], positions[i + 2]])
  return lista
}

/* Quantos triângulos têm a frente virada para dentro da Lua: o produto vetorial dos lados aponta
   para o lado da frente, e para fora é o mesmo lado do vetor do centro até o triângulo. */
function triangulosVirados(positions, indices) {
  const v = vertices(positions)
  let virados = 0
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [v[indices[i]], v[indices[i + 1]], v[indices[i + 2]]]
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]
    if (n[0] * a[0] + n[1] * a[1] + n[2] * a[2] <= 0) virados++
  }
  return virados
}

describe('buildReliefCap, com uma grade pequena', () => {
  it('o pixel do meio vira o polo sul, na altura dele', () => {
    // 2000 unidades de meio metro: 1 km acima do raio de referência
    const { positions } = buildReliefCap(gradePequena({ altura: 2000 }), SEM_BORDA)
    const polo = vertices(positions)[12]
    expect(polo[0]).toBeCloseTo(0, 9)
    expect(polo[1]).toBeCloseTo(-(1 + 1000 / MOON_RADIUS_M), CASAS_FLOAT32)
    expect(polo[2]).toBeCloseTo(0, 9)
  })

  it('a altura zero fica exatamente na esfera de raio 1', () => {
    const { positions } = buildReliefCap(gradePequena(), SEM_BORDA)
    for (const p of vertices(positions)) expect(Math.hypot(...p)).toBeCloseTo(1, CASAS_FLOAT32)
  })

  it('pixel fora do alcance do manifesto não vira vértice', () => {
    // distâncias dos centros ao polo: 0, 1000 (4), 1414 (4), 2000 (4), 2236 (8) e 2828 (4) m
    const { positions } = buildReliefCap(gradePequena({ reachM: 2100 }), SEM_BORDA)
    expect(positions.length / 3).toBe(13)
  })

  it('com a grade inteira dentro do alcance, são 16 quadrados, 32 triângulos', () => {
    const { indices } = buildReliefCap(gradePequena(), SEM_BORDA)
    expect(indices.length / 3).toBe(32)
  })

  it('pulando pixels, pega um a cada step', () => {
    const { positions, indices } = buildReliefCap(gradePequena(), { ...SEM_BORDA, step: 2 })
    expect(positions.length / 3).toBe(9)
    expect(indices.length / 3).toBe(8)
  })

  it('todo triângulo tem a frente virada para fora da Lua', () => {
    const { positions, indices } = buildReliefCap(gradePequena({ altura: 3000 }), SEM_BORDA)
    expect(triangulosVirados(positions, indices)).toBe(0)
  })

  it('na borda, a altura vai a zero para encostar na esfera lisa', () => {
    // alcance de 2500 m, folga de 400 m e transição de 1000 m: o pixel a 2236 m fica na folga
    const { positions } = buildReliefCap(gradePequena({ altura: 2000, reachM: 2500 }), {
      step: 1,
      overlapM: 400,
      fadeM: 1000,
    })
    const v = vertices(positions)
    const polo = v.find((p) => Math.abs(p[0]) < 1e-9 && Math.abs(p[2]) < 1e-9)
    expect(Math.hypot(...polo)).toBeCloseTo(1 + 1000 / MOON_RADIUS_M, CASAS_FLOAT32)
    const maisLonge = v.reduce((longe, p) => (Math.hypot(p[0], p[2]) > Math.hypot(longe[0], longe[2]) ? p : longe))
    expect(Math.hypot(...maisLonge)).toBeCloseTo(1, CASAS_FLOAT32)
  })
})

describe('a esfera lisa em volta da malha', () => {
  it('a 0 m do polo o ângulo é zero; a um quarto da volta, 90°', () => {
    expect(polarDistanceToAngle(0)).toBe(0)
    // na estereográfica, o equador fica a 2R do polo
    expect(polarDistanceToAngle(2 * MOON_RADIUS_M)).toBeCloseTo(Math.PI / 2, 12)
  })

  it('para um pouco depois de onde a malha começa, para não abrir fresta', () => {
    const semFolga = smoothSphereThetaLength(383485, 0)
    expect(smoothSphereThetaLength(383485)).toBeGreaterThan(semFolga)
    expect(semFolga).toBeCloseTo(Math.PI - polarDistanceToAngle(383485), 12)
  })
})

describe('buildReliefCap, com o far.bin do site', () => {
  const pasta = join(process.cwd(), 'public', 'data', 'relief')
  const manifest = JSON.parse(readFileSync(join(pasta, 'manifest.json'), 'utf8'))
  const arquivo = readFileSync(join(pasta, manifest.far.file))
  const heights = new Int16Array(arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength))
  const { positions, indices } = buildReliefCap({ ...manifest.far, heights, heightScale: manifest.heightScale })

  it('nenhum vértice sai sem número', () => {
    expect(positions.every(Number.isFinite)).toBe(true)
  })

  it('todo vértice fica perto da superfície: as montanhas do polo têm poucos quilômetros', () => {
    // a altura guardada vai de −15418 a 13952 meios metros, ou seja, de −7,7 km a +7,0 km
    for (const p of vertices(positions)) {
      const raio = Math.hypot(...p)
      expect(raio).toBeGreaterThan(1 - 8000 / MOON_RADIUS_M)
      expect(raio).toBeLessThan(1 + 8000 / MOON_RADIUS_M)
    }
  })

  it('todo vértice fica no hemisfério sul da cena, dentro do círculo do relevo', () => {
    const anguloMaximo = polarDistanceToAngle(manifest.far.reachM)
    for (const p of vertices(positions)) {
      const doPolo = Math.acos(-p[1] / Math.hypot(...p))
      expect(doPolo).toBeLessThanOrEqual(anguloMaximo + 1e-6)
    }
  })

  it('todo triângulo tem a frente virada para fora da Lua', () => {
    expect(indices.length).toBeGreaterThan(0)
    expect(triangulosVirados(positions, indices)).toBe(0)
  })
})

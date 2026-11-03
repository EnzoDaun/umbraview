import { readFile as readFromDisk } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HORIZON, NEAR_LAYER_UP_TO_M } from './config.js'
import { MOON_RADIUS_M as R, latLonToUnit, localFrame, polarXYToUnit } from './geometry.js'
import { isInsideReliefArea, loadReliefLayers, tilesAround } from './reliefFiles.js'

/* Estes testes usam os arquivos de verdade de public/data/relief/, os mesmos que o site baixa.
   As alturas de conferência (fixtures/reliefSamples.json) foram lidas dos arquivos da NASA pelo
   rasterio, sem passar pelos ladrilhos: se o script de preparação ou este carregador deslocarem
   um pixel, a altura muda mais de 5 m nesses pontos, que foram escolhidos em encosta. Alguns
   ficam a 1 cm da emenda entre dois ladrilhos, onde a conta usa a borda copiada do vizinho. */

const DIR = join(process.cwd(), 'public', 'data', 'relief')
const MANIFEST = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'))
const SAMPLES = JSON.parse(readFileSync(join(process.cwd(), 'src', 'engine', 'fixtures', 'reliefSamples.json'), 'utf8'))

/* Meio metro é como o script grava a altura: arredondar custa até 0,25 m. */
const ROUNDING_M = 0.25

/* A função de leitura que o site passa (lá, com fetch), aqui lendo do disco e contando as leituras. */
function diskReader() {
  const reads = []
  const readFile = async (path) => {
    reads.push(path)
    const bytes = await readFromDisk(join(DIR, path))
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  }
  return { readFile, reads }
}

const sampleAt = (relief, p) => relief.sample(p[0], p[1], p[2])

/* O ponto a d metros de p pelo chão, na direção do azimute (graus, a partir do norte). */
function walk(p, azimuthDeg, d) {
  const { north, east } = localFrame(p)
  const a = (azimuthDeg * Math.PI) / 180
  const t = [0, 1, 2].map((i) => Math.cos(a) * north[i] + Math.sin(a) * east[i])
  return [0, 1, 2].map((i) => p[i] * Math.cos(d / R) + t[i] * Math.sin(d / R))
}

describe('arquivos de relevo do site (public/data/relief)', () => {
  it('o recorte cobre o alcance que o motor usa (config.js)', () => {
    expect(MANIFEST.near.upToM).toBeGreaterThanOrEqual(NEAR_LAYER_UP_TO_M)
    expect(MANIFEST.far.upToM).toBeGreaterThanOrEqual(HORIZON.maxDistanceM)
  })

  it('o relevo fino lido pelo site bate com o arquivo da NASA, no meio e na emenda dos ladrilhos', async () => {
    const { readFile } = diskReader()
    const cache = new Map()
    expect(SAMPLES.near.length).toBeGreaterThanOrEqual(50)
    for (const { x, y, heightM } of SAMPLES.near) {
      const p = polarXYToUnit(x, y)
      const [near] = await loadReliefLayers(MANIFEST, p, readFile, cache)
      expect(Math.abs(sampleAt(near.relief, p) - heightM), `${x}, ${y}`).toBeLessThanOrEqual(ROUNDING_M + 1e-6)
    }
  })

  it('o relevo grosso lido pelo site bate com a média do GDAL sobre o arquivo da NASA', async () => {
    const { readFile } = diskReader()
    const [, far] = await loadReliefLayers(MANIFEST, latLonToUnit(-89, 0), readFile)
    expect(SAMPLES.far.length).toBeGreaterThanOrEqual(20)
    for (const { x, y, heightM } of SAMPLES.far) {
      const altura = sampleAt(far.relief, polarXYToUnit(x, y))
      expect(Math.abs(altura - heightM), `${x}, ${y}`).toBeLessThanOrEqual(ROUNDING_M + 1e-3)
    }
  })

  it('na borda da área, as duas camadas têm relevo até onde o horizonte olha', async () => {
    const { readFile } = diskReader()
    const cache = new Map()
    const semRelevo = []
    for (let lon = -180; lon < 180; lon += 15) {
      const p = latLonToUnit(MANIFEST.areaMaxLatDeg, lon)
      const [near, far] = await loadReliefLayers(MANIFEST, p, readFile, cache)
      for (let az = 0; az < 360; az += 10) {
        for (let d = 0; d <= NEAR_LAYER_UP_TO_M; d += 500) {
          if (Number.isNaN(sampleAt(near.relief, walk(p, az, d)))) semRelevo.push(`fino ${lon}° ${az}° ${d} m`)
        }
        for (let d = 0; d <= HORIZON.maxDistanceM; d += 10000) {
          if (Number.isNaN(sampleAt(far.relief, walk(p, az, d)))) semRelevo.push(`grosso ${lon}° ${az}° ${d} m`)
        }
      }
    }
    expect(semRelevo).toEqual([])
  })

  it('a área vai até a latitude do manifesto, e ponto fora dela é recusado sem baixar nada', async () => {
    expect(isInsideReliefArea(MANIFEST, MANIFEST.areaMaxLatDeg)).toBe(true)
    expect(isInsideReliefArea(MANIFEST, -89.9)).toBe(true)
    expect(isInsideReliefArea(MANIFEST, MANIFEST.areaMaxLatDeg + 0.01)).toBe(false)
    const { readFile, reads } = diskReader()
    await expect(loadReliefLayers(MANIFEST, latLonToUnit(MANIFEST.areaMaxLatDeg + 0.01, 0), readFile)).rejects.toThrow(
      'o ponto está fora da área com relevo',
    )
    expect(reads).toEqual([])
  })

  it('baixa só o relevo grosso e os ladrilhos em volta do ponto, e não baixa de novo o que já tem', async () => {
    const { readFile, reads } = diskReader()
    const cache = new Map()
    const p = latLonToUnit(-89, 45)
    const tiles = tilesAround(MANIFEST, p)
    expect(tiles.length).toBeGreaterThanOrEqual(1)
    expect(tiles.length).toBeLessThanOrEqual(4)
    await loadReliefLayers(MANIFEST, p, readFile, cache)
    expect([...reads].sort()).toEqual([MANIFEST.far.file, ...tiles.map((t) => `near/${t}.bin`)].sort())
    await loadReliefLayers(MANIFEST, p, readFile, cache)
    expect(reads).toHaveLength(tiles.length + 1)
  })

  it('um Buffer do Node no lugar de ArrayBuffer vira erro, e não altura errada', async () => {
    // o Buffer tem o mesmo número de bytes, mas o Int16Array copiaria byte por byte como altura
    const nodeBuffer = (path) => readFromDisk(join(DIR, path))
    await expect(loadReliefLayers(MANIFEST, latLonToUnit(-89, 45), nodeBuffer)).rejects.toThrow('ArrayBuffer')
  })

  it('leitura que falhou sai do cache, e a próxima tentativa lê de novo', async () => {
    const { readFile, reads } = diskReader()
    let failures = 1
    const flaky = (path) => (path === MANIFEST.far.file && failures-- > 0 ? Promise.reject(new Error('rede caiu')) : readFile(path))
    const cache = new Map()
    const p = latLonToUnit(-89, 45)
    await expect(loadReliefLayers(MANIFEST, p, flaky, cache)).rejects.toThrow('rede caiu')
    const [near] = await loadReliefLayers(MANIFEST, p, flaky, cache)
    expect(sampleAt(near.relief, p)).not.toBeNaN()
    expect(reads.filter((path) => path === MANIFEST.far.file)).toHaveLength(1)
  })

  it('arquivo com tamanho errado vira erro com o nome dele, e não relevo inventado', async () => {
    // no site, um download cortado ou uma página de erro no lugar do arquivo chegam assim
    const truncated = async () => new ArrayBuffer(10)
    await expect(loadReliefLayers(MANIFEST, latLonToUnit(-89, 45), truncated)).rejects.toThrow(
      /(far\.bin|near\/r\d\dc\d\d\.bin) veio com 10 bytes/,
    )
  })
})

import { readFile as readFromDisk } from 'node:fs/promises'
import { join } from 'node:path'

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSiteSky } from '../engine/siteSky.js'
import { createReliefReader, useSiteSky } from './useSiteSky.js'

/* A ponte entre o motor e a tela. Os quatro status rodam com o motor de verdade e os arquivos de
   verdade de public/data/relief/, lidos do disco no lugar do fetch do site. Só a troca de ponto no
   meio da conta usa uma conta de mentira: é o único jeito de soltar os resultados na ordem errada
   de propósito. */

const DIR = join(process.cwd(), 'public', 'data', 'relief')
const NOV_14 = new Date(Date.UTC(2026, 10, 14))
const NOV_21 = new Date(Date.UTC(2026, 10, 21))
const TOP_1 = { lat: -89.475, lon: -137.44, name: 'ponto 1 da comparação com a NASA' }
/* A primeira conta lê o relevo do disco e leva bem menos de 1 s; a folga é para o CI. */
const WAIT = { timeout: 10000 }
const SLOW_TEST_MS = 15000

async function readRelief(path) {
  const bytes = await readFromDisk(join(DIR, path))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function diskReader() {
  const reads = []
  const readFile = (path) => {
    reads.push(path)
    return readRelief(path)
  }
  return { readFile, reads }
}

/* O hook montado como a tela monta, guardando o que ele devolveu em cada render: o que a tela viu
   no meio do caminho importa, e não só o fim. */
function renderSiteSky(initialProps, compute) {
  const seen = []
  const hook = renderHook(
    ({ site, date }) => {
      const value = useSiteSky(site, date, compute)
      seen.push(value)
      return value
    },
    { initialProps },
  )
  return { ...hook, seen }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.head.querySelector('base')?.remove()
})

describe('useSiteSky: o céu do ponto escolhido, para a tela', () => {
  it('sem ponto escolhido, fica em idle e não lê nenhum arquivo', () => {
    const { readFile, reads } = diskReader()
    const { result } = renderSiteSky({ site: null, date: NOV_14 }, createSiteSky(readFile))
    expect(result.current).toEqual({ status: 'idle', sky: null })
    expect(reads).toEqual([])
  })

  it(
    'com um ponto, já fica em loading no mesmo render, e depois em ready com o céu do motor',
    async () => {
      const { result, seen } = renderSiteSky({ site: TOP_1, date: NOV_14 }, createSiteSky(diskReader().readFile))
      expect(seen[0]).toEqual({ status: 'loading', sky: null })
      await waitFor(() => expect(result.current.status).toBe('ready'), WAIT)
      const direct = await createSiteSky(diskReader().readFile)(TOP_1, NOV_14.getTime())
      expect(result.current.sky).toEqual(direct)
    },
    SLOW_TEST_MS,
  )

  /* A tela recebe só o status; o motivo vai para o console, para quem depura saber se foi ponto
     fora da área, arquivo que não chegou ou outra coisa. */
  it(
    'ponto fora da área com relevo fica em error, sem céu, e o motivo aparece no console',
    async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { result } = renderSiteSky({ site: { lat: -80, lon: 0 }, date: NOV_14 }, createSiteSky(diskReader().readFile))
      await waitFor(() => expect(result.current).toEqual({ status: 'error', sky: null }), WAIT)
      expect(consoleError).toHaveBeenCalledWith(
        'useSiteSky: a conta do céu falhou',
        expect.objectContaining({ message: 'o ponto está fora da área com relevo' }),
      )
    },
    SLOW_TEST_MS,
  )

  it(
    'trocar a data volta a loading no mesmo render, sem os números da data anterior, e mostra o céu da data nova',
    async () => {
      const { result, seen, rerender } = renderSiteSky({ site: TOP_1, date: NOV_14 }, createSiteSky(diskReader().readFile))
      await waitFor(() => expect(result.current.status).toBe('ready'), WAIT)
      const before = result.current.sky
      const rendersBefore = seen.length
      rerender({ site: TOP_1, date: NOV_21 })
      expect(seen[rendersBefore]).toEqual({ status: 'loading', sky: null })
      await waitFor(() => expect(result.current.status).toBe('ready'), WAIT)
      expect(result.current.sky).toEqual(await createSiteSky(diskReader().readFile)(TOP_1, NOV_21.getTime()))
      expect(result.current.sky).not.toEqual(before)
    },
    SLOW_TEST_MS,
  )

  it('trocar de ponto no meio da conta nunca mostra o resultado do ponto anterior', async () => {
    const pending = []
    const compute = (site) => new Promise((resolve) => pending.push({ site, resolve }))
    const { result, seen, rerender } = renderSiteSky({ site: { lat: -89, lon: 0 }, date: NOV_14 }, compute)
    rerender({ site: { lat: -88, lon: 90 }, date: NOV_14 })
    expect(pending.map((p) => p.site)).toEqual([
      { lat: -89, lon: 0 },
      { lat: -88, lon: 90 },
    ])
    // a conta do ponto anterior termina depois da troca: a tela continua esperando a do novo
    await act(async () => pending[0].resolve('céu do ponto anterior'))
    expect(result.current).toEqual({ status: 'loading', sky: null })
    await act(async () => pending[1].resolve('céu do ponto novo'))
    expect(result.current).toEqual({ status: 'ready', sky: 'céu do ponto novo' })
    expect(seen.some((value) => value.sky === 'céu do ponto anterior')).toBe(false)
  })

  it('o mesmo ponto e a mesma data em objetos novos não pedem a conta de novo', () => {
    const calls = []
    const compute = (site, startMs) => {
      calls.push([site, startMs])
      return new Promise(() => {})
    }
    const { rerender } = renderSiteSky({ site: TOP_1, date: NOV_14 }, compute)
    rerender({ site: { ...TOP_1 }, date: new Date(NOV_14.getTime()) })
    expect(calls).toEqual([[{ lat: TOP_1.lat, lon: TOP_1.lon }, NOV_14.getTime()]])
  })

  it(
    'no site, busca os arquivos em data/relief/ a partir do endereço da página, também no GitHub Pages',
    async () => {
      // no GitHub Pages a página fica em /umbraview/; um '/data/relief/' fixo buscaria na raiz do domínio
      const base = document.createElement('base')
      base.href = 'https://enzodaun.github.io/umbraview/'
      document.head.append(base)
      const folder = 'https://enzodaun.github.io/umbraview/data/relief/'
      const asked = []
      vi.stubGlobal('fetch', async (url) => {
        asked.push(url)
        const buffer = await readRelief(url.slice(folder.length))
        return { ok: true, status: 200, arrayBuffer: async () => buffer }
      })
      const { result } = renderHook(() => useSiteSky(TOP_1, NOV_14))
      await waitFor(() => expect(result.current.status).toBe('ready'), WAIT)
      expect(asked[0]).toBe(`${folder}manifest.json`)
      expect(asked.filter((url) => !url.startsWith(folder))).toEqual([])
    },
    SLOW_TEST_MS,
  )
})

describe('leitura dos arquivos de relevo pelo site (createReliefReader)', () => {
  it('busca o caminho dentro da pasta do relevo e devolve o ArrayBuffer da resposta', async () => {
    const asked = []
    const buffer = new ArrayBuffer(8)
    const read = createReliefReader('https://enzodaun.github.io/umbraview/data/relief/', async (url) => {
      asked.push(url)
      return { ok: true, status: 200, arrayBuffer: async () => buffer }
    })
    expect(await read('near/r00c06.bin')).toBe(buffer)
    expect(asked).toEqual(['https://enzodaun.github.io/umbraview/data/relief/near/r00c06.bin'])
  })

  it('resposta de erro do servidor vira erro com o caminho do arquivo, e não relevo', async () => {
    // sem conferir o response.ok, a página de erro do servidor chegaria como se fosse o arquivo
    const read = createReliefReader('https://enzodaun.github.io/umbraview/data/relief/', async () => ({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(8),
    }))
    await expect(read('far.bin')).rejects.toThrow(/far\.bin.*404/)
  })
})

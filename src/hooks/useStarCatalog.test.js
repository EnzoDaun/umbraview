/* A leitura das estrelas para a cena: o arquivo vira direção, magnitude e cor, e a falha não
 * derruba a cena. O hook segue o mesmo desenho do useFarRelief, com os mesmos casos. */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadStarCatalog, useStarCatalog } from './useStarCatalog.js'

// duas estrelas: Sirius, com o B−V dela, e uma sem B−V no catálogo
const FILE = new Float32Array([1, 0, 0, -1.44, 0.009, 0, 0, 1, 4.2, NaN]).buffer

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadStarCatalog', () => {
  it('lê o stars.bin da pasta e devolve direção, magnitude e a cor já calculada', async () => {
    const readFile = vi.fn().mockResolvedValue(FILE)
    const catalog = await loadStarCatalog(readFile)
    expect(readFile).toHaveBeenCalledWith('stars.bin')
    expect(catalog.count).toBe(2)
    expect(Array.from(catalog.directions)).toEqual([1, 0, 0, 0, 0, 1])
    expect(catalog.magnitudes[0]).toBeCloseTo(-1.44, 5)
    // três números de cor por estrela; a sem B−V fica branca
    expect(catalog.colors).toHaveLength(6)
    expect(Array.from(catalog.colors.slice(3))).toEqual([1, 1, 1])
  })
})

describe('useStarCatalog', () => {
  it('começa sem catálogo e entrega quando a leitura termina', async () => {
    const catalog = { count: 2 }
    const load = vi.fn().mockResolvedValue(catalog)
    const { result } = renderHook(() => useStarCatalog(load))
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toBe(catalog))
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('se a leitura falha, o céu fica sem estrelas e o motivo vai para o console', async () => {
    const failure = new Error('o arquivo não chegou: HTTP 404')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const load = vi.fn().mockRejectedValue(failure)
    const { result } = renderHook(() => useStarCatalog(load))
    await waitFor(() => expect(log).toHaveBeenCalled())
    expect(result.current).toBeNull()
    expect(log.mock.calls[0]).toContain(failure)
  })

  it('a leitura que termina depois de a cena sair não mexe em nada', async () => {
    let finish
    const load = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const { result, unmount } = renderHook(() => useStarCatalog(load))
    unmount()
    finish({ count: 2 })
    await Promise.resolve()
    expect(result.current).toBeNull()
  })
})

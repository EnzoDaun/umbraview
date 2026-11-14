/* Os ladrilhos do relevo fino para a cena (card C6): a leitura de cada um e o que a cena recebe
 * enquanto eles chegam. Os ladrilhos aqui são inventados, de 2 × 2 alturas. */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createNearTileCache, loadNearTile, useNearTiles } from './useNearTiles.js'

const MANIFEST = { heightScale: 0.5, near: { tilePx: 2 } }

function reader(files) {
  const reads = []
  const readFile = async (path) => {
    reads.push(path)
    if (!(path in files)) throw new Error(`não existe: ${path}`)
    return files[path]
  }
  return { readFile, reads }
}

describe('loadNearTile', () => {
  it('lê as alturas do ladrilho na pasta near', async () => {
    const { readFile, reads } = reader({ 'near/r10c10.bin': new Int16Array([1, -2, 3, -4]).buffer })
    const heights = await loadNearTile(readFile, MANIFEST, 'r10c10')
    expect(reads).toEqual(['near/r10c10.bin'])
    expect(Array.from(heights)).toEqual([1, -2, 3, -4])
  })

  it('recusa um ladrilho com o tamanho errado, como uma página de erro no lugar dele', async () => {
    const wrong = new TextEncoder().encode('<html>404</html>').buffer
    const { readFile } = reader({ 'near/r10c10.bin': wrong })
    await expect(loadNearTile(readFile, MANIFEST, 'r10c10')).rejects.toThrow(/16 bytes, e não 8/)
  })
})

describe('createNearTileCache', () => {
  // uma leitura que só termina quando o teste manda, para ver o que acontece no meio
  function deferredLoad() {
    const pending = new Map()
    const load = vi.fn(
      (name) =>
        new Promise((resolve, reject) => {
          pending.set(name, { resolve, reject })
        }),
    )
    return { load, pending }
  }

  it('dois pedidos do mesmo ladrilho ao mesmo tempo esperam pela mesma leitura', () => {
    const { load } = deferredLoad()
    const get = createNearTileCache(load, 4)
    const first = get('r10c10', MANIFEST)
    expect(get('r10c10', MANIFEST)).toBe(first)
    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith('r10c10', MANIFEST)
  })

  it('passando do limite, sai o usado há mais tempo, e não o pedido primeiro', () => {
    const load = vi.fn(async () => new Int16Array(4))
    const get = createNearTileCache(load, 2)
    get('a', MANIFEST)
    get('b', MANIFEST)
    get('a', MANIFEST) // o a foi usado agora: o mais antigo passa a ser o b
    get('c', MANIFEST)
    expect(load.mock.calls.map(([name]) => name)).toEqual(['a', 'b', 'c'])
    get('a', MANIFEST)
    expect(load).toHaveBeenCalledTimes(3)
    get('b', MANIFEST)
    expect(load.mock.calls.map(([name]) => name)).toEqual(['a', 'b', 'c', 'b'])
  })

  it('a leitura que falhou é esquecida, e o próximo pedido tenta de novo', async () => {
    const { load, pending } = deferredLoad()
    const get = createNearTileCache(load, 4)
    const failed = get('r10c10', MANIFEST)
    pending.get('r10c10').reject(new Error('HTTP 503'))
    await expect(failed).rejects.toThrow('HTTP 503')
    expect(get('r10c10', MANIFEST)).not.toBe(failed)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('uma falha atrasada, de uma leitura que já saiu do cache, não apaga a leitura nova', async () => {
    const { load, pending } = deferredLoad()
    const get = createNearTileCache(load, 1)
    const old = get('a', MANIFEST)
    const oldRead = pending.get('a')
    get('b', MANIFEST) // limite de 1: o a sai
    const fresh = get('a', MANIFEST) // e volta, com uma leitura nova
    oldRead.reject(new Error('HTTP 503'))
    await expect(old).rejects.toThrow('HTTP 503')
    expect(get('a', MANIFEST)).toBe(fresh)
    expect(load).toHaveBeenCalledTimes(3)
  })
})

describe('useNearTiles', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('devolve os ladrilhos pedidos à medida que chegam, um de cada vez', async () => {
    // a cena monta cada ladrilho assim que ele chega (nearTilesStep), sem esperar os outros
    const tiles = { r10c10: new Int16Array(4), r10c11: new Int16Array(4) }
    let releaseSecond
    const load = vi.fn((name) =>
      name === 'r10c11' ? new Promise((resolve) => (releaseSecond = () => resolve(tiles.r10c11))) : Promise.resolve(tiles[name]),
    )
    const { result } = renderHook(() => useNearTiles(MANIFEST, ['r10c10', 'r10c11'], load))
    expect(result.current.size).toBe(0)
    await waitFor(() => expect(result.current.size).toBe(1))
    expect(result.current.get('r10c10')).toBe(tiles.r10c10)
    await act(async () => releaseSecond())
    expect(result.current.size).toBe(2)
    expect(result.current.get('r10c11')).toBe(tiles.r10c11)
  })

  it('sem ladrilho pedido, ou sem o manifesto ainda, devolve um mapa vazio e não lê nada', () => {
    const load = vi.fn()
    const { result: none } = renderHook(() => useNearTiles(MANIFEST, [], load))
    const { result: noManifest } = renderHook(() => useNearTiles(null, ['r10c10'], load))
    expect(none.current.size).toBe(0)
    expect(noManifest.current.size).toBe(0)
    expect(load).not.toHaveBeenCalled()
  })

  it('o ladrilho que falha vem como null, com o motivo no console, e os outros chegam', async () => {
    // a cena espera o bloco inteiro antes de trocar (nearTilesStep); sem o null, ela esperaria
    // para sempre por um ladrilho que não vem
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const tile = new Int16Array(4)
    const load = vi.fn(async (name) => {
      if (name === 'r10c11') throw new Error('HTTP 404')
      return tile
    })
    const { result } = renderHook(() => useNearTiles(MANIFEST, ['r10c10', 'r10c11'], load))
    await waitFor(() => expect(result.current.size).toBe(2))
    expect(result.current.get('r10c10')).toBe(tile)
    expect(result.current.has('r10c11')).toBe(true)
    expect(result.current.get('r10c11')).toBeNull()
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('a falha de um ladrilho de um bloco que já saiu, chegando atrasada, não muda nada', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    let failOld
    const load = vi.fn((name) =>
      name === 'r10c10'
        ? new Promise((_, reject) => (failOld = () => reject(new Error('HTTP 503'))))
        : Promise.resolve(new Int16Array(4)),
    )
    const { result, rerender } = renderHook(({ names }) => useNearTiles(MANIFEST, names, load), {
      initialProps: { names: ['r10c10'] },
    })
    rerender({ names: ['r10c12'] })
    await waitFor(() => expect(result.current.size).toBe(1))
    const before = result.current
    await act(async () => failOld())
    expect(result.current).toBe(before)
    expect(result.current.has('r10c10')).toBe(false)
    // o bloco já saiu: ninguém precisa saber que ele falhou
    expect(error).not.toHaveBeenCalled()
  })

  /* Uma leitura que falha na primeira vez e, na segunda, só termina quando o teste manda: a falha
     passageira de um arquivo (um 503, a rede caindo por um instante). */
  function failsOnceThenWaits(tiles, flaky) {
    let reads = 0
    let releaseRetry
    const load = vi.fn((name) => {
      if (name !== flaky) return Promise.resolve(tiles[name])
      reads++
      if (reads === 1) return Promise.reject(new Error('HTTP 503'))
      return new Promise((resolve) => (releaseRetry = () => resolve(tiles[name])))
    })
    return { load, releaseRetry: () => releaseRetry() }
  }

  it('voltando ao mesmo bloco, a falha de antes não conta enquanto a nova leitura está a caminho', async () => {
    /* Com o null velho, a cena achava que o bloco inteiro já tinha chegado: trocava sem esperar a
       nova tentativa, e trocava de novo quando ela chegava (nearTilesStep). */
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const tiles = { r10c10: new Int16Array(4), r10c11: new Int16Array(4) }
    const { load, releaseRetry } = failsOnceThenWaits(tiles, 'r10c11')
    const { result, rerender } = renderHook(({ names }) => useNearTiles(MANIFEST, names, load), {
      initialProps: { names: ['r10c10', 'r10c11'] },
    })
    await waitFor(() => expect(result.current.get('r10c11')).toBeNull())
    rerender({ names: [] }) // a câmera subiu acima dos 80 km
    rerender({ names: ['r10c10', 'r10c11'] }) // e desceu de novo no mesmo lugar
    expect(load).toHaveBeenCalledTimes(4)
    expect(result.current.has('r10c11')).toBe(false)
    await act(async () => releaseRetry())
    expect(result.current.get('r10c11')).toBe(tiles.r10c11)
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('falhando de novo na tentativa nova, o ladrilho volta a vir como null', async () => {
    // sem isto, a cena ficaria esperando para sempre um ladrilho que falhou duas vezes
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const tile = new Int16Array(4)
    const load = vi.fn(async (name) => {
      if (name === 'r10c11') throw new Error('HTTP 404')
      return tile
    })
    const { result, rerender } = renderHook(({ names }) => useNearTiles(MANIFEST, names, load), {
      initialProps: { names: ['r10c10', 'r10c11'] },
    })
    await waitFor(() => expect(result.current.get('r10c11')).toBeNull())
    rerender({ names: [] })
    rerender({ names: ['r10c10', 'r10c11'] })
    await waitFor(() => expect(error).toHaveBeenCalledTimes(2))
    expect(result.current.has('r10c11')).toBe(true)
    expect(result.current.get('r10c11')).toBeNull()
  })

  it('no bloco vizinho que divide o ladrilho que falhou, a nova leitura dele também é esperada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const tiles = { r10c10: new Int16Array(4), r10c11: new Int16Array(4), r10c12: new Int16Array(4) }
    const { load, releaseRetry } = failsOnceThenWaits(tiles, 'r10c11')
    const { result, rerender } = renderHook(({ names }) => useNearTiles(MANIFEST, names, load), {
      initialProps: { names: ['r10c10', 'r10c11'] },
    })
    await waitFor(() => expect(result.current.get('r10c11')).toBeNull())
    rerender({ names: ['r10c11', 'r10c12'] })
    await waitFor(() => expect(result.current.has('r10c12')).toBe(true))
    expect(result.current.has('r10c11')).toBe(false)
    await act(async () => releaseRetry())
    expect(result.current.get('r10c11')).toBe(tiles.r10c11)
  })

  it('a releitura de um ladrilho em comum, que vem igual da memória da página, não troca o mapa', async () => {
    /* A memória da página devolve as mesmas alturas (o mesmo Int16Array) a cada bloco que pede o
       ladrilho. Um mapa novo com o mesmo conteúdo seria um quadro desenhado à toa: a cena pede um
       quadro a cada mapa novo (NearRelief). */
    const tiles = { r10c10: new Int16Array(4), r10c11: new Int16Array(4), r10c12: new Int16Array(4) }
    let sharedReads = 0
    let releaseShared
    const load = vi.fn((name) => {
      if (name === 'r10c11' && ++sharedReads > 1) return new Promise((resolve) => (releaseShared = () => resolve(tiles.r10c11)))
      return Promise.resolve(tiles[name])
    })
    const { result, rerender } = renderHook(({ names }) => useNearTiles(MANIFEST, names, load), {
      initialProps: { names: ['r10c10', 'r10c11'] },
    })
    await waitFor(() => expect(result.current.size).toBe(2))
    rerender({ names: ['r10c11', 'r10c12'] })
    await waitFor(() => expect(result.current.has('r10c12')).toBe(true))
    const before = result.current
    await act(async () => releaseShared())
    expect(result.current).toBe(before)
  })

  it('trocar o bloco por outro com ladrilhos em comum não perde os que já tinham chegado', async () => {
    const load = vi.fn(async () => new Int16Array(4))
    const { result, rerender } = renderHook(({ names }) => useNearTiles(MANIFEST, names, load), {
      initialProps: { names: ['r10c10', 'r10c11'] },
    })
    await waitFor(() => expect(result.current.size).toBe(2))
    rerender({ names: ['r10c11', 'r10c12'] })
    // o r10c11 continua no mapa na hora, e o r10c10, que saiu do bloco, sai do mapa
    expect(result.current.has('r10c11')).toBe(true)
    expect(result.current.has('r10c10')).toBe(false)
    await waitFor(() => expect(result.current.size).toBe(2))
  })

  it('não guarda o ladrilho que saiu do bloco: voltando, ele vem de novo da memória da página', async () => {
    /* Quem guarda os ladrilhos por onde a câmera passou é a memória da página, com limite
       (createNearTileCache). Se o hook guardasse também, guardaria todos, sem limite. */
    const tile = new Int16Array(4)
    let releaseAgain
    const load = vi
      .fn(async () => tile)
      .mockImplementationOnce(async () => tile)
      .mockImplementationOnce(async () => tile)
      .mockImplementationOnce(() => new Promise((resolve) => (releaseAgain = () => resolve(tile))))
    const { result, rerender } = renderHook(({ names }) => useNearTiles(MANIFEST, names, load), {
      initialProps: { names: ['r10c10'] },
    })
    await waitFor(() => expect(result.current.has('r10c10')).toBe(true))
    rerender({ names: ['r10c12'] })
    await waitFor(() => expect(result.current.has('r10c12')).toBe(true))
    rerender({ names: ['r10c10'] })
    // a leitura de novo ainda não terminou: o r10c10 de antes não ficou guardado no hook
    expect(result.current.has('r10c10')).toBe(false)
    await act(async () => releaseAgain())
    expect(result.current.get('r10c10')).toBe(tile)
  })

  it('o ladrilho de um bloco que já saiu, chegando atrasado, não muda nada', async () => {
    /* A leitura do bloco de antes é ignorada. Aceita, ela trocaria o mapa (e a cena desenharia um
       quadro à toa, NearRelief) e deixaria o ladrilho velho guardado sem ninguém pedir. */
    let releaseOld
    const old = new Int16Array(4)
    const load = vi.fn((name) =>
      name === 'r10c10' ? new Promise((resolve) => (releaseOld = () => resolve(old))) : Promise.resolve(new Int16Array(4)),
    )
    const { result, rerender } = renderHook(({ names }) => useNearTiles(MANIFEST, names, load), {
      initialProps: { names: ['r10c10'] },
    })
    rerender({ names: ['r10c12'] })
    await waitFor(() => expect(result.current.size).toBe(1))
    const before = result.current
    await act(async () => releaseOld())
    expect(result.current).toBe(before)
    expect(result.current.has('r10c10')).toBe(false)
  })
})

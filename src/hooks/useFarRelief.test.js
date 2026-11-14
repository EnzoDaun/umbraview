/* O relevo da cena (card C2): a leitura dos dois arquivos e o que a cena recebe enquanto eles
 * chegam, quando chegam e quando falham. Os arquivos aqui são inventados, de 2 × 2 alturas. */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadFarRelief, useFarRelief } from './useFarRelief.js'

const MANIFESTO = { heightScale: 0.5, far: { file: 'far.bin', columns: 2, rows: 2 } }

function leitor(arquivos) {
  return async (caminho) => {
    if (!(caminho in arquivos)) throw new Error(`não existe: ${caminho}`)
    return arquivos[caminho]
  }
}

function manifestoEmBytes(manifesto = MANIFESTO) {
  return new TextEncoder().encode(JSON.stringify(manifesto)).buffer
}

describe('loadFarRelief', () => {
  it('lê o manifesto e as alturas do arquivo que ele aponta', async () => {
    const alturas = new Int16Array([1, -2, 3, -4])
    const relevo = await loadFarRelief(leitor({ 'manifest.json': manifestoEmBytes(), 'far.bin': alturas.buffer }))
    expect(relevo.manifest).toEqual(MANIFESTO)
    expect(Array.from(relevo.heights)).toEqual([1, -2, 3, -4])
  })

  it('recusa um arquivo de alturas com o tamanho errado, como uma página de erro no lugar dele', async () => {
    const errado = new TextEncoder().encode('<html>404</html>').buffer
    await expect(loadFarRelief(leitor({ 'manifest.json': manifestoEmBytes(), 'far.bin': errado }))).rejects.toThrow(
      /16 bytes, e não 8/,
    )
  })
})

describe('useFarRelief', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('devolve null enquanto o relevo não chegou, e o relevo quando chega', async () => {
    const relevo = { manifest: MANIFESTO, heights: new Int16Array(4) }
    let entregar
    const load = () => new Promise((resolve) => (entregar = resolve))
    const { result } = renderHook(() => useFarRelief(load))
    expect(result.current).toBeNull()
    entregar(relevo)
    await waitFor(() => expect(result.current).toBe(relevo))
  })

  it('se a leitura falha, continua null e conta o motivo no console', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const falha = new Error('HTTP 404')
    const load = () => Promise.reject(falha)
    const { result } = renderHook(() => useFarRelief(load))
    await waitFor(() => expect(consoleError).toHaveBeenCalled())
    expect(consoleError.mock.calls[0]).toContain(falha)
    expect(result.current).toBeNull()
  })
})

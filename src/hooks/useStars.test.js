import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { loadStars, useStars } from './useStars.js'

const arquivo = () => new Float32Array([1, 0, 0, 0.5, 0.2, 0, 1, 0, 3, 1.1]).buffer

describe('leitura das estrelas', () => {
  it('lê o stars.bin da pasta das estrelas', async () => {
    const readFile = vi.fn(async () => arquivo())
    const estrelas = await loadStars(readFile)
    expect(readFile).toHaveBeenCalledWith('stars.bin')
    expect(estrelas.count).toBe(2)
  })

  it('o hook devolve null até chegarem, e depois as estrelas', async () => {
    const load = async () => loadStars(async () => arquivo())
    const { result } = renderHook(() => useStars(load))
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current?.count).toBe(2))
  })

  it('se a leitura falha, o céu fica sem estrelas e o motivo vai para o console', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const load = async () => {
      throw new Error('sem rede')
    }
    const { result } = renderHook(() => useStars(load))
    await waitFor(() => expect(erro).toHaveBeenCalled())
    expect(result.current).toBeNull()
    erro.mockRestore()
  })
})

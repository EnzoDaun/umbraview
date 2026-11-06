/* O aviso curto que some sozinho (card C3): o de clique fora da área com relevo. */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTimedNotice } from './useTimedNotice.js'

const DURACAO = 4000

describe('useTimedNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('começa sem aviso', () => {
    const { result } = renderHook(() => useTimedNotice(DURACAO))
    expect(result.current[0]).toBeNull()
  })

  it('mostra o aviso e tira sozinho depois do tempo', () => {
    const { result } = renderHook(() => useTimedNotice(DURACAO))
    act(() => result.current[1]('fora da área'))
    expect(result.current[0]).toBe('fora da área')

    act(() => vi.advanceTimersByTime(DURACAO - 1))
    expect(result.current[0]).toBe('fora da área')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current[0]).toBeNull()
  })

  it('um aviso novo no meio do tempo começa a contagem de novo', () => {
    // sem isto, o segundo clique fora da área mostraria o aviso por bem menos tempo
    const { result } = renderHook(() => useTimedNotice(DURACAO))
    act(() => result.current[1]('primeiro'))
    act(() => vi.advanceTimersByTime(DURACAO - 1000))
    act(() => result.current[1]('segundo'))
    act(() => vi.advanceTimersByTime(DURACAO - 1))
    expect(result.current[0]).toBe('segundo')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current[0]).toBeNull()
  })

  it('a função de mostrar é sempre a mesma, para poder ir nas dependências de um efeito', () => {
    const { result, rerender } = renderHook(() => useTimedNotice(DURACAO))
    const mostrar = result.current[1]
    rerender()
    expect(result.current[1]).toBe(mostrar)
  })

  it('ao sair da tela, o relógio pendente é cancelado', () => {
    const { result, unmount } = renderHook(() => useTimedNotice(DURACAO))
    act(() => result.current[1]('fora da área'))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

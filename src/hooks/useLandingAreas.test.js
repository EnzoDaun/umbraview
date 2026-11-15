import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useLandingAreas } from './useLandingAreas.js'

const DATA = new Date('2026-11-14T00:00:00Z')
const OUTRA_DATA = new Date('2026-11-20T00:00:00Z')

/* Um Worker de mentira: guarda os pedidos, e o teste responde quando quiser. */
function fabrica() {
  const worker = {
    pedidos: [],
    ouvintes: new Set(),
    terminate: vi.fn(),
    postMessage(pedido) { this.pedidos.push(pedido) },
    addEventListener(_, ouvinte) { this.ouvintes.add(ouvinte) },
    removeEventListener(_, ouvinte) { this.ouvintes.delete(ouvinte) },
    responde(data) { for (const ouvinte of [...this.ouvintes]) ouvinte({ data }) },
  }
  const criar = vi.fn(() => worker)
  return { worker, criar }
}

const resposta = (id) => ({ id, flags: Uint8Array.from([1, 0]), layout: { columns: 2, rows: 1 }, elapsedMs: 12 })

describe('useLandingAreas', () => {
  it('desligado, não cria o Worker nem pede nada', () => {
    const { criar } = fabrica()
    const { result } = renderHook(() => useLandingAreas(DATA, false, criar))
    expect(result.current).toEqual({ status: 'idle', areas: null })
    expect(criar).not.toHaveBeenCalled()
  })

  it('ligado, pede a conta da data e entrega o resultado', async () => {
    const { worker, criar } = fabrica()
    const { result } = renderHook(() => useLandingAreas(DATA, true, criar))
    await waitFor(() => expect(result.current.status).toBe('loading'))
    expect(worker.pedidos).toHaveLength(1)
    expect(worker.pedidos[0].dateMs).toBe(DATA.getTime())
    expect(worker.pedidos[0].baseUrl).toMatch(/data\/landing-grid\/$/)
    act(() => worker.responde(resposta(worker.pedidos[0].id)))
    expect(result.current.status).toBe('ready')
    expect(Array.from(result.current.areas.flags)).toEqual([1, 0])
    expect(result.current.areas.elapsedMs).toBe(12)
  })

  it('a resposta de uma data velha, chegando depois da troca, não entra na tela', async () => {
    const { worker, criar } = fabrica()
    const { result, rerender } = renderHook(({ data }) => useLandingAreas(data, true, criar), { initialProps: { data: DATA } })
    await waitFor(() => expect(worker.pedidos).toHaveLength(1))
    rerender({ data: OUTRA_DATA })
    await waitFor(() => expect(worker.pedidos).toHaveLength(2))
    act(() => worker.responde(resposta(worker.pedidos[0].id)))
    expect(result.current.status).toBe('loading')
    act(() => worker.responde(resposta(worker.pedidos[1].id)))
    expect(result.current.status).toBe('ready')
    // um Worker só para as duas datas: ele guarda a grade
    expect(criar).toHaveBeenCalledTimes(1)
  })

  it('se a conta falha, diz erro e o motivo vai para o console', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { worker, criar } = fabrica()
    const { result } = renderHook(() => useLandingAreas(DATA, true, criar))
    await waitFor(() => expect(worker.pedidos).toHaveLength(1))
    act(() => worker.responde({ id: worker.pedidos[0].id, error: 'sem rede' }))
    expect(result.current).toEqual({ status: 'error', areas: null })
    expect(erro).toHaveBeenCalled()
    erro.mockRestore()
  })

  it('desligar o mapa volta ao estado de desligado, e sair da tela encerra o Worker', async () => {
    const { worker, criar } = fabrica()
    const { result, rerender, unmount } = renderHook(({ ligado }) => useLandingAreas(DATA, ligado, criar), { initialProps: { ligado: true } })
    await waitFor(() => expect(worker.pedidos).toHaveLength(1))
    rerender({ ligado: false })
    expect(result.current).toEqual({ status: 'idle', areas: null })
    unmount()
    expect(worker.terminate).toHaveBeenCalled()
  })
})

/* O pedido de menos movimento do sistema (card C1). Quem pediu menos animação no sistema
 * (enjoo com movimento, por exemplo) não pode ver a Lua girando sozinha. */
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePrefersReducedMotion } from './usePrefersReducedMotion.js'

const matchMediaOriginal = window.matchMedia

/* Um matchMedia de mentira que deixa o teste trocar o pedido depois de a tela abrir. */
function sistemaComPedido(inicial) {
  const ouvintes = new Set()
  const consulta = {
    matches: inicial,
    addEventListener: vi.fn((_, ouvinte) => ouvintes.add(ouvinte)),
    removeEventListener: vi.fn((_, ouvinte) => ouvintes.delete(ouvinte)),
  }
  window.matchMedia = vi.fn().mockReturnValue(consulta)
  return {
    consulta,
    ouvintes,
    trocarPara(valor) {
      consulta.matches = valor
      ouvintes.forEach((ouvinte) => ouvinte({ matches: valor }))
    },
  }
}

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    window.matchMedia = matchMediaOriginal
  })

  it('pergunta ao sistema pela media query de menos movimento', () => {
    sistemaComPedido(false)
    renderHook(() => usePrefersReducedMotion())
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('devolve true quando o sistema pede menos movimento, e false quando não pede', () => {
    sistemaComPedido(true)
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(true)
    sistemaComPedido(false)
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(false)
  })

  it('acompanha quando a pessoa muda o pedido com a página aberta', () => {
    const sistema = sistemaComPedido(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    act(() => sistema.trocarPara(true))
    expect(result.current).toBe(true)
  })

  it('para de ouvir o sistema quando a tela sai', () => {
    const sistema = sistemaComPedido(false)
    const { unmount } = renderHook(() => usePrefersReducedMotion())
    unmount()
    expect(sistema.ouvintes.size).toBe(0)
  })

  /* O jsdom e navegador muito antigo não têm matchMedia: sem ele, a página não pode quebrar. */
  it('sem matchMedia, devolve false', () => {
    window.matchMedia = undefined
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(false)
  })
})

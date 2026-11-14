/* true quando a pessoa pediu ao sistema menos animação (card C1). Quem sente enjoo com movimento
 * liga isso no sistema, e a Lua girando sozinha passa a ser um problema, não um enfeite.
 *
 * useSyncExternalStore, e não useState com useEffect: o valor certo já sai no primeiro render, sem
 * um quadro girando antes de o efeito rodar, e a tela acompanha quando a pessoa muda o pedido com a
 * página aberta. */
import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/* Sem matchMedia (o jsdom dos testes, navegador muito antigo), a resposta é "não pediu": quebrar a
   página por causa disso seria pior do que girar. */
function mediaQuery() {
  return typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null
}

function subscribe(onChange) {
  const query = mediaQuery()
  if (!query) return () => {}
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot() {
  return mediaQuery()?.matches ?? false
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

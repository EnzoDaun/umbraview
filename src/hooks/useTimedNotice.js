/* Um aviso curto que some sozinho (card C3): o do clique fora da área com relevo. Ele não pede
 * resposta da pessoa, então não fica na tela cobrindo a Lua; e o leitor de tela já leu quando ele
 * apareceu (role="status", em LunarScene.jsx). */
import { useCallback, useEffect, useRef, useState } from 'react'

/* Devolve [aviso, mostrar]: o texto do aviso, ou null, e a função que mostra um texto por
   durationMs. Um aviso novo troca o anterior e começa a contagem de novo. */
export function useTimedNotice(durationMs) {
  const [notice, setNotice] = useState(null)
  const timer = useRef(null)

  const show = useCallback(
    (text) => {
      clearTimeout(timer.current)
      setNotice(text)
      timer.current = setTimeout(() => setNotice(null), durationMs)
    },
    [durationMs],
  )

  // sem isto, o relógio de uma cena que saiu da tela ainda chamaria o setNotice dela
  useEffect(() => () => clearTimeout(timer.current), [])

  return [notice, show]
}

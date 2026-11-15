/* O mapa das áreas com janela de pouso na data escolhida, para a cena pintar.
 *
 * A conta roda num Worker (src/workers/landingAreas.worker.js), e só quando o mapa está ligado:
 * com ele desligado, nada é baixado nem calculado. A cada data nova, o pedido anterior é esquecido:
 * a resposta dele, se chegar depois, não entra na tela.
 */
import { useEffect, useRef, useState } from 'react'

function workerOfPage() {
  return new Worker(new URL('../workers/landingAreas.worker.js', import.meta.url), { type: 'module' })
}

const IDLE = { status: 'idle', areas: null }

/* dateUtc: a data (um Date). enabled: se o mapa está ligado. createWorker: quem cria o Worker; só os
   testes trocam, e precisa ser sempre a mesma função, porque está nas dependências do efeito.
   Devolve { status, areas }: status é 'idle' (desligado), 'loading', 'ready' ou 'error'; areas, no
   'ready', é { flags, layout, elapsedMs }: um byte por ponto da grade (1 com janela de pouso), o
   desenho da grade e quanto a conta levou. */
export function useLandingAreas(dateUtc, enabled, createWorker = workerOfPage) {
  const [result, setResult] = useState(IDLE)
  const worker = useRef(null)
  const request = useRef(0)

  // o Worker vive enquanto o componente estiver na tela, e guarda a grade entre uma data e outra
  useEffect(
    () => () => {
      worker.current?.terminate()
      worker.current = null
    },
    [],
  )

  const dateMs = dateUtc.getTime()
  useEffect(() => {
    if (!enabled) return
    let current = true
    const id = ++request.current
    try {
      worker.current ??= createWorker()
    } catch (error) {
      console.error('useLandingAreas: o mapa das áreas de pouso não pôde começar', error)
      queueMicrotask(() => current && setResult({ status: 'error', areas: null }))
      return
    }
    const active = worker.current
    const onMessage = ({ data }) => {
      if (!current || data.id !== id) return
      if (data.error) {
        console.error('useLandingAreas: a conta do mapa das áreas de pouso falhou', data.error)
        setResult({ status: 'error', areas: null })
      } else {
        setResult({ status: 'ready', areas: { flags: data.flags, layout: data.layout, elapsedMs: data.elapsedMs } })
      }
    }
    active.addEventListener('message', onMessage)
    queueMicrotask(() => current && setResult((previous) => ({ status: 'loading', areas: previous.areas })))
    active.postMessage({ id, dateMs, baseUrl: new URL('data/landing-grid/', document.baseURI).href })
    return () => {
      current = false
      active.removeEventListener('message', onMessage)
    }
  }, [dateMs, enabled, createWorker])

  return enabled ? result : IDLE
}

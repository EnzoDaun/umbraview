/* A ponte entre o motor e a tela: o céu do ponto escolhido, no formato de "O que a ponte entrega
 * para a tela" (docs/backlog.md). Quem faz a conta é o motor (src/engine/siteSky.js); este hook só
 * pede a conta quando o ponto ou a data mudam e diz à tela em que pé ela está.
 *
 * O status 'loading' não é guardado: ele sai da comparação entre o pedido de agora (ponto e data)
 * e o pedido que gerou o último resultado. Assim, no mesmo render em que o ponto muda, a tela já
 * recebe 'loading', sem os números do ponto anterior, e o resultado atrasado de um pedido velho
 * nunca aparece. Guardar o 'loading' com setState dentro do useEffect deixaria um render com os
 * números velhos na tela, e o lint do projeto recusa (react-hooks/set-state-in-effect).
 */
import { useEffect, useState } from 'react'

import { createSiteSky } from '../engine/siteSky.js'

const IDLE = Object.freeze({ status: 'idle', sky: null })
const LOADING = Object.freeze({ status: 'loading', sky: null })

/* A leitura dos arquivos de relevo pelo site, no formato que o motor pede (reliefFiles.js): o
   caminho é relativo à pasta folderUrl, e a resposta tem que ter dado certo. Sem conferir o
   response.ok, a página de erro do servidor chegaria ao motor como se fosse o arquivo. */
export function createReliefReader(folderUrl, fetchFile = (url) => fetch(url)) {
  return async (path) => {
    const response = await fetchFile(new URL(path, folderUrl).href)
    if (!response.ok) throw new Error(`o arquivo de relevo ${path} não chegou: HTTP ${response.status}`)
    return response.arrayBuffer()
  }
}

/* A conta do site, uma só por página, para o manifest.json e o relevo já baixados servirem a todos
   os pontos. A pasta é relativa ao endereço da página: no GitHub Pages o site fica em /umbraview/,
   e um '/data/relief/' fixo buscaria na raiz do domínio. Ela nasce no primeiro pedido, e não ao
   importar o arquivo, para importar o hook não exigir uma página. */
let pageSiteSky = null
function siteSkyOfPage(site, startMs) {
  pageSiteSky ??= createSiteSky(createReliefReader(new URL('data/relief/', document.baseURI).href))
  return pageSiteSky(site, startMs)
}

/* site: { lat, lon } em graus (e name, quando vem da lista de locais), ou null enquanto nada foi
   escolhido. dateUtc: o começo do período (PERIOD_DAYS, src/engine/config.js). compute: a conta;
   só os testes trocam. Devolve { status, sky }. */
export function useSiteSky(site, dateUtc, compute = siteSkyOfPage) {
  const lat = site?.lat
  const lon = site?.lon
  const startMs = dateUtc.getTime()
  // o pedido é feito de números: um objeto novo com o mesmo ponto e a mesma data não refaz a conta
  const request = site ? `${lat} ${lon} ${startMs}` : null
  const [done, setDone] = useState({ request: null, result: IDLE })

  useEffect(() => {
    if (request === null) return
    let current = true
    compute({ lat, lon }, startMs).then(
      (sky) => {
        if (current) setDone({ request, result: { status: 'ready', sky } })
      },
      () => {
        if (current) setDone({ request, result: { status: 'error', sky: null } })
      },
    )
    return () => {
      current = false
    }
  }, [request, lat, lon, startMs, compute])

  if (request === null) return IDLE
  return done.request === request ? done.result : LOADING
}

/* As estrelas reais para o céu da cena (contrato C5 da v2): o stars.bin de public/data/stars/,
 * lido pelo motor (src/engine/starCatalog.js).
 *
 * A cena não espera por ele: sem as estrelas, o céu fica escuro, e o motivo da falha vai para o
 * console (o mesmo trato do useFarRelief).
 */
import { useEffect, useState } from 'react'

import { decodeStars, starColors } from '../engine/starCatalog.js'
import { createReliefReader } from './useSiteSky.js'

/* readFile(caminho) devolve a Promise de um ArrayBuffer, com o caminho relativo a
   public/data/stars/. Devolve { count, directions, magnitudes, colors }: a direção no referencial
   equatorial J2000, e a cor já calculada pelo índice B−V. */
export async function loadStarCatalog(readFile) {
  const { count, directions, magnitudes, colorIndex } = decodeStars(await readFile('stars.bin'))
  return { count, directions, magnitudes, colors: starColors(colorIndex) }
}

/* Uma leitura por página, com a pasta relativa ao endereço dela (o site fica em /umbraview/ no
   GitHub Pages). Uma leitura que falhou é esquecida, para a próxima montagem tentar de novo. */
let pageCatalog = null
function starCatalogOfPage() {
  if (!pageCatalog) {
    pageCatalog = loadStarCatalog(createReliefReader(new URL('data/stars/', document.baseURI).href))
    pageCatalog.catch(() => {
      pageCatalog = null
    })
  }
  return pageCatalog
}

/* Devolve o catálogo, ou null enquanto não chegou. load: a leitura; só os testes trocam, e ela
   precisa ser sempre a mesma função (está nas dependências do efeito). */
export function useStarCatalog(load = starCatalogOfPage) {
  const [catalog, setCatalog] = useState(null)

  useEffect(() => {
    let current = true
    load().then(
      (result) => {
        if (current) setCatalog(result)
      },
      (error) => {
        if (current) console.error('useStarCatalog: as estrelas não chegaram; o céu fica sem elas', error)
      },
    )
    return () => {
      current = false
    }
  }, [load])

  return catalog
}

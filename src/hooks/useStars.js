/* As estrelas do céu da cena (public/data/stars/stars.bin), lidas uma vez por página.
 *
 * A cena não espera por elas: enquanto o arquivo baixa, ou se não chegar, o céu fica sem estrelas,
 * e o motivo da falha vai para o console (o mesmo trato do relevo, em useFarRelief.js).
 */
import { useEffect, useState } from 'react'

import { parseStars } from '../scene/starField.js'
import { createReliefReader } from './useSiteSky.js'

/* readFile(caminho) devolve a Promise de um ArrayBuffer, com o caminho relativo a
   public/data/stars/. Devolve o resultado de parseStars. */
export async function loadStars(readFile) {
  return parseStars(await readFile('stars.bin'))
}

/* Uma leitura por página, na pasta relativa ao endereço dela (o site fica em /umbraview/ no GitHub
   Pages). Uma leitura que falhou é esquecida, para a próxima montagem da cena tentar de novo. */
let pageStars = null
function starsOfPage() {
  if (!pageStars) {
    pageStars = loadStars(createReliefReader(new URL('data/stars/', document.baseURI).href))
    pageStars.catch(() => {
      pageStars = null
    })
  }
  return pageStars
}

/* Devolve as estrelas, ou null enquanto não chegaram (ou se não deu para ler). load: a leitura; só
   os testes trocam, e ela precisa ser sempre a mesma função, porque está nas dependências do
   efeito. */
export function useStars(load = starsOfPage) {
  const [stars, setStars] = useState(null)
  useEffect(() => {
    let current = true
    load().then(
      (result) => {
        if (current) setStars(result)
      },
      (error) => {
        if (current) console.error('useStars: as estrelas não chegaram; o céu fica sem elas', error)
      },
    )
    return () => {
      current = false
    }
  }, [load])
  return stars
}

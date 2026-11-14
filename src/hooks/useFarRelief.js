/* O relevo grosso do polo (far.bin, card E2) para a malha da cena (card C2).
 *
 * É o mesmo arquivo que o motor usa para o horizonte, lido do mesmo jeito (createReliefReader):
 * o manifest.json diz onde a grade fica e qual o tamanho dela. A cena não espera por ele: enquanto
 * ele baixa, ou se não chegar, a Lua aparece lisa, como no C1, e o motivo da falha vai para o
 * console. Uma Lua lisa ainda serve para girar e ver de onde vem a luz; uma região vazia, não.
 */
import { useEffect, useState } from 'react'

import { createReliefReader } from './useSiteSky.js'

/* readFile(caminho) devolve a Promise de um ArrayBuffer, com o caminho relativo a
   public/data/relief/ (como em reliefFiles.js). Devolve { manifest, heights }. O tamanho é
   conferido porque uma página de erro servida no lugar do arquivo chegaria como alturas. */
export async function loadFarRelief(readFile) {
  const manifest = JSON.parse(new TextDecoder().decode(await readFile('manifest.json')))
  const { file, columns, rows } = manifest.far
  const buffer = await readFile(file)
  if (buffer.byteLength !== columns * rows * 2) {
    throw new Error(`o arquivo de relevo ${file} veio com ${buffer.byteLength} bytes, e não ${columns * rows * 2}`)
  }
  return { manifest, heights: new Int16Array(buffer) }
}

/* Uma leitura por página: girar a Lua, trocar a data ou montar a cena de novo não baixa o arquivo
   outra vez. A pasta é relativa ao endereço da página, pelo mesmo motivo do useSiteSky (o site
   fica em /umbraview/ no GitHub Pages). Uma leitura que falhou é esquecida, para a próxima
   montagem da cena tentar de novo. */
let pageFarRelief = null
function farReliefOfPage() {
  if (!pageFarRelief) {
    pageFarRelief = loadFarRelief(createReliefReader(new URL('data/relief/', document.baseURI).href))
    pageFarRelief.catch(() => {
      pageFarRelief = null
    })
  }
  return pageFarRelief
}

/* Devolve { manifest, heights }, ou null enquanto não chegou (ou se não deu para ler). load: a
   leitura; só os testes trocam, e ela precisa ser sempre a mesma função, porque está nas
   dependências do efeito (o mesmo cuidado do compute do useSiteSky). */
export function useFarRelief(load = farReliefOfPage) {
  const [relief, setRelief] = useState(null)

  useEffect(() => {
    let current = true
    load().then(
      (result) => {
        if (current) setRelief(result)
      },
      (error) => {
        if (current) console.error('useFarRelief: o relevo da cena não chegou; a Lua fica lisa', error)
      },
    )
    return () => {
      current = false
    }
  }, [load])

  return relief
}

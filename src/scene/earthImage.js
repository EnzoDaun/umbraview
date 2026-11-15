/* A imagem da Terra (public/data/earth/color.jpg, gerada por scripts/prepare-data/prepare_earth.py
 * a partir do Blue Marble da NASA: CREDITS.md), lida uma vez por página, como as da Lua
 * (moonImages.js): abrir a vista do sistema de novo não baixa nada outra vez.
 */
import { ImageLoader } from 'three'

let pageImage = null

/* Devolve a Promise da imagem já carregada. A pasta é relativa ao endereço da página (o site fica
   em /umbraview/ no GitHub Pages). Uma leitura que falhou é esquecida, para a próxima montagem
   tentar de novo. */
export function earthImageOfPage() {
  if (!pageImage) {
    pageImage = new ImageLoader().loadAsync(new URL('data/earth/color.jpg', document.baseURI).href)
    pageImage.catch(() => {
      pageImage = null
    })
  }
  return pageImage
}

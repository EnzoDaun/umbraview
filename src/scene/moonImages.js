/* As imagens da Lua (public/data/moon/, geradas por scripts/prepare-data/prepare_moon_global.py),
 * lidas uma vez por página: a esfera da cena e a Lua da vista do sistema usam as mesmas, e montar
 * uma delas de novo não baixa nada outra vez.
 */
import { ImageLoader } from 'three'

const FILES = { color: 'color.jpg', normal: 'normal.jpg', south: 'color-south.jpg' }

let pageImages = null

/* Devolve a Promise de { color, normal, south }, as três imagens já carregadas. A pasta é relativa
   ao endereço da página (o site fica em /umbraview/ no GitHub Pages). Uma leitura que falhou é
   esquecida, para a próxima montagem tentar de novo. */
export function moonImagesOfPage() {
  if (!pageImages) {
    const base = new URL('data/moon/', document.baseURI).href
    const loader = new ImageLoader()
    pageImages = Promise.all(Object.values(FILES).map((file) => loader.loadAsync(base + file))).then((images) =>
      Object.fromEntries(Object.keys(FILES).map((key, i) => [key, images[i]])),
    )
    pageImages.catch(() => {
      pageImages = null
    })
  }
  return pageImages
}

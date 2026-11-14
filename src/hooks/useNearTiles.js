/* Os ladrilhos do relevo fino para a cena (card C6).
 *
 * São os mesmos arquivos que o motor usa para o horizonte (public/data/relief/near/, card E2),
 * lidos pelo mesmo leitor do site (createReliefReader). A página não trava esperando por eles:
 * enquanto os ladrilhos de um bloco novo não chegam, o bloco de antes continua na tela
 * (nearTilesStep); o ladrilho que não chegar fica no relevo grosso, e o motivo da falha vai para o
 * console.
 */
import { useEffect, useMemo, useState } from 'react'

import { createReliefReader } from './useSiteSky.js'

/* As alturas de um ladrilho (tilePx × tilePx, em int16). O tamanho é conferido porque uma página
   de erro servida no lugar do arquivo chegaria como alturas (o mesmo cuidado do useFarRelief). */
export async function loadNearTile(readFile, manifest, name) {
  const path = `near/${name}.bin`
  const buffer = await readFile(path)
  const expected = manifest.near.tilePx * manifest.near.tilePx * 2
  if (buffer.byteLength !== expected) {
    throw new Error(`o arquivo de relevo ${path} veio com ${buffer.byteLength} bytes, e não ${expected}`)
  }
  return new Int16Array(buffer)
}

/* Quantos ladrilhos a página guarda: os 36 do anel que a cena mostra (os 4 do centro estão entre
   eles) e os do caminho de um arrasto, para ir e voltar sem baixar de novo. Simulado no Node numa
   revisão do desenho, em 12/11/2026: num arrasto de 10 pixels e a volta, com 72 a página baixava
   28 ladrilhos de novo; com 100, nenhum. Cada um tem 127 kB: são 12,7 MB. Sem limite, quem
   passeasse pela área inteira guardaria os 332, ou 42 MB. */
const PAGE_CACHE_TILES = 100

/* A leitura de cada ladrilho, uma só enquanto ele estiver guardado. load(name, manifest) faz a
   leitura e devolve uma Promise; limit é quantos ficam guardados. Devolve get(name, manifest).
   Guarda a Promise, e não o resultado, para dois pedidos ao mesmo tempo esperarem pela mesma
   leitura; uma leitura que falhou é esquecida, para a próxima tentar de novo. Passando do limite,
   sai o usado há mais tempo. */
export function createNearTileCache(load, limit) {
  const tiles = new Map()
  return function get(name, manifest) {
    if (tiles.has(name)) {
      const promise = tiles.get(name)
      // usado agora: vai para o fim da fila, longe da saída (o Map guarda a ordem de entrada)
      tiles.delete(name)
      tiles.set(name, promise)
      return promise
    }
    const promise = load(name, manifest)
    tiles.set(name, promise)
    promise.catch(() => {
      // só se ainda for esta leitura: depois de sair do cache, o ladrilho pode ter outra, nova
      if (tiles.get(name) === promise) tiles.delete(name)
    })
    while (tiles.size > limit) tiles.delete(tiles.keys().next().value)
    return promise
  }
}

// o leitor só é criado no primeiro ladrilho: o document.baseURI é da página, e não do teste
let pageReader = null
const nearTileOfPage = createNearTileCache((name, manifest) => {
  pageReader ??= createReliefReader(new URL('data/relief/', document.baseURI).href)
  return loadNearTile(pageReader, manifest, name)
}, PAGE_CACHE_TILES)

/* manifest: o manifest.json do relevo, ou null enquanto não chegou. names: os ladrilhos que a cena
   quer agora (nearTileBlock). Devolve um Map do nome para as alturas, só com os que já chegaram e
   continuam pedidos; o que falhou vem com null, para a cena não esperar mais por ele
   (nearTilesStep). load: a leitura; só os testes trocam, e ela precisa ser sempre a mesma função,
   porque está nas dependências do efeito (o mesmo cuidado do useFarRelief). */
export function useNearTiles(manifest, names, load = nearTileOfPage) {
  const key = names.join(',')
  /* Cada pedido de um bloco é uma tentativa: um objeto novo quando o bloco, o manifesto ou a
     leitura mudam, também quando o bloco sai e volta igual (a câmera sobe e desce). A falha
     guardada só vale para a tentativa em que aconteceu. Na seguinte, a memória da página lê o
     ladrilho de novo, e até essa leitura terminar ele conta como "ainda não chegou": com o null da
     tentativa de antes, a cena trocaria o bloco sem esperar a leitura nova, e trocaria de novo
     quando ela chegasse. */
  const attempt = useMemo(() => ({ manifest, key, load }), [manifest, key, load])
  // o que chegou, pelo nome: { value: as alturas, ou null se falhou, attempt: a tentativa }
  const [loaded, setLoaded] = useState(() => new Map())

  useEffect(() => {
    if (!attempt.manifest || !attempt.key) return undefined
    const wanted = attempt.key.split(',')
    let current = true
    // guarda só os do bloco de agora: os que saíram dele ficam na memória da página, não aqui
    function keep(name, value) {
      setLoaded((previous) => {
        const entry = previous.get(name)
        // as mesmas alturas, de qualquer tentativa, não mudam nada: um mapa novo com o mesmo
        // conteúdo faria a cena desenhar um quadro à toa. A falha só é a mesma na mesma tentativa.
        if (entry && entry.value === value && (value !== null || entry.attempt === attempt)) return previous
        const next = new Map()
        for (const kept of wanted) if (previous.has(kept)) next.set(kept, previous.get(kept))
        return next.set(name, { value, attempt })
      })
    }
    for (const name of wanted) {
      attempt.load(name, attempt.manifest).then(
        (heights) => {
          if (current) keep(name, heights)
        },
        (error) => {
          if (!current) return
          console.error(`useNearTiles: o ladrilho ${name} do relevo fino não chegou; ali fica o relevo grosso`, error)
          keep(name, null)
        },
      )
    }
    return () => {
      current = false
    }
  }, [attempt])

  return useMemo(() => {
    const wanted = new Map()
    if (!attempt.manifest || !attempt.key) return wanted
    for (const name of attempt.key.split(',')) {
      const entry = loaded.get(name)
      // a falha de outra tentativa fica de fora: a leitura nova está a caminho
      if (entry && (entry.value !== null || entry.attempt === attempt)) wanted.set(name, entry.value)
    }
    return wanted
  }, [attempt, loaded])
}

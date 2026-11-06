#!/usr/bin/env node
/* Confere que nenhum rascunho vaza para o build que vai ao ar.
 *
 * Roda no `verify`, depois do build. Lê o conteúdo de cada .js e .html de dist/ e reprova o
 * marcador TODO_PREENCHER, que é como a equipe marca um texto, coordenada ou número que ainda
 * precisa de fonte (README, "Nenhum dado inventado"). Os juízes leem o site como resultado:
 * um valor de rascunho publicado vira afirmação falsa com o nome da equipe.
 *
 * Imprime o que conferiu mesmo quando passa: saída vazia não é aprovação.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const MARCADOR = /TODO_PREENCHER/

function arquivos(dir) {
  const saida = []
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho))
    else saida.push(caminho)
  }
  return saida
}

export function checkBuild(dist) {
  if (!existsSync(dist)) {
    return { lidos: 0, problemas: [`build não encontrado em ${dist}: rode o build antes desta conferência`] }
  }
  const lidos = arquivos(dist).filter((f) => /\.(js|html)$/.test(f))
  const problemas = lidos
    .filter((f) => MARCADOR.test(readFileSync(f, 'utf8')))
    .map((f) => `marcador TODO_PREENCHER no build: dist/${relative(dist, f).split('\\').join('/')}`)
  if (lidos.length === 0) problemas.push(`nenhum .js ou .html em ${dist}: a conferência não provou nada`)
  return { lidos: lidos.length, problemas }
}

/* Rodando pelo npm (npm run conferir), e não importado pelo teste. A raiz vem do diretório de
   trabalho: no Windows, caminho montado a partir do import.meta.url ganha uma barra antes da
   letra do drive (/C:/...) e não existe (medido no projeto UNAERP x EPTV em 21/09/2026). */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raiz = process.cwd()
  if (!existsSync(join(raiz, 'package.json'))) {
    console.error(`conferencia do build: REPROVADO, rodei em ${raiz}, que nao tem package.json. Rode: npm run conferir`)
    process.exit(1)
  }
  const { lidos, problemas } = checkBuild(join(raiz, 'dist'))
  console.log('conferencia do build')
  console.log(`  arquivos .js e .html lidos em dist/  ${lidos}`)
  if (problemas.length > 0) {
    console.log('REPROVADO:')
    for (const p of problemas) console.log(`  - ${p}`)
    console.log('Troque o TODO_PREENCHER pelo valor com fonte, ou tire o trecho do build.')
    process.exit(1)
  }
  console.log('  OK: nenhum TODO_PREENCHER no build.')
}

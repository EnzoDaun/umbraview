// @vitest-environment node
/* O motor é JavaScript puro: não importa React nem a cena 3D, e não mexe na página.
 *
 * É isso que deixa o mesmo código rodar no teste, no navegador e, se o card E3 precisar, num Web
 * Worker, que não tem página. Um import de React ou um document esquecido aqui só quebraria no
 * dia em que a conta fosse para o Worker. A conferência lê o código como texto; comentário não
 * conta.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ENGINE = join(process.cwd(), 'src', 'engine')

const IMPORTA_TELA = /from\s+['"](react|react-dom|three|@react-three\/[^'"]+)['"]/
const MEXE_NA_PAGINA = /\b(window|document|localStorage|sessionStorage|navigator)\b/

function semComentarios(codigo) {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

function problemas(codigo) {
  return semComentarios(codigo)
    .split('\n')
    .map((linha, i) => ({ linha: linha.trim(), numero: i + 1 }))
    .filter(({ linha }) => IMPORTA_TELA.test(linha) || MEXE_NA_PAGINA.test(linha))
}

describe('o motor não depende da tela', () => {
  it('a conferência pega import de React e uso da página, e ignora comentário', () => {
    const exemplo = [
      "import { useState } from 'react'",
      'const largura = window.innerWidth',
      '// o document não entra aqui',
      "import { latLonToUnit } from './geometry.js'",
    ].join('\n')
    expect(problemas(exemplo).map((p) => p.linha)).toEqual([
      "import { useState } from 'react'",
      'const largura = window.innerWidth',
    ])
  })

  it('nenhum arquivo de src/engine/ importa a tela ou mexe na página', () => {
    const achados = readdirSync(ENGINE)
      .filter((nome) => nome.endsWith('.js') && !nome.endsWith('.test.js'))
      .flatMap((nome) => problemas(readFileSync(join(ENGINE, nome), 'utf8')).map((p) => `${nome}:${p.numero}  ${p.linha}`))
    expect(achados).toEqual([])
  })
})

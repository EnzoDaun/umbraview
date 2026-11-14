/* Texto de tela mora em src/data/, nunca escrito dentro do componente (README, "Três regras
 * que valem para qualquer tela"). Texto solto no JSX escapa da revisão de texto, que vai
 * ser em inglês para os juízes, e se repete em outro painel escrito diferente.
 *
 * A conferência é por padrão, e não um parser: pega texto sozinho numa linha do JSX
 * ("Scene") e texto entre duas tags na mesma linha (<span>Sun</span>). Comentário não conta.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

function arquivosJsx(pasta) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = join(pasta, item.name)
    if (item.isDirectory()) return arquivosJsx(caminho)
    return item.name.endsWith('.jsx') && !item.name.includes('.test.') ? [caminho] : []
  })
}

function semComentarios(codigo) {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))
}

const LINHA_SO_DE_TEXTO = /^\s*[A-ZÀ-Ú][A-Za-zÀ-ú ,.:%()–—-]*$/
const TEXTO_ENTRE_TAGS = />\s*[A-Za-zÀ-ú][^<>{}]*</

function textosSoltos(codigo) {
  return semComentarios(codigo)
    .split('\n')
    .map((linha, indice) => ({ linha: linha.trim(), numero: indice + 1 }))
    .filter(({ linha }) => LINHA_SO_DE_TEXTO.test(linha) || TEXTO_ENTRE_TAGS.test(linha))
}

describe('texto de tela fica em src/data/, e não dentro do componente', () => {
  it('a conferência pega os dois jeitos de escrever texto solto, e ignora comentário', () => {
    const exemplo = [
      '<button>',
      '  Scene',
      '</button>',
      '<span>Sun</span>',
      '{/* Comentário com Texto Maiúsculo */}',
      '<span>{text.sun}</span>',
    ].join('\n')

    expect(textosSoltos(exemplo).map((t) => t.linha)).toEqual(['Scene', '<span>Sun</span>'])
  })

  it('nenhum componente de src/ tem texto escrito dentro dele', () => {
    const achados = arquivosJsx(SRC).flatMap((arquivo) =>
      textosSoltos(readFileSync(arquivo, 'utf8')).map(
        ({ linha, numero }) => `${relative(SRC, arquivo)}:${numero}  ${linha}`,
      ),
    )

    expect(achados).toEqual([])
  })
})

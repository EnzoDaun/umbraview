/* O bloco "## Structure" do README tem que bater com o que existe em src/.
 *
 * O README é por onde quem chega começa. Arquivo que existe e não está lá não é encontrado;
 * arquivo que está lá e não existe mais manda procurar o que sumiu. Os testes (*.test.*)
 * ficam fora da exigência, para o bloco continuar legível.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const RAIZ = process.cwd()

function blocoEstrutura() {
  const readme = readFileSync(join(RAIZ, 'README.md'), 'utf8')
  const secao = readme.split(/^## Structure\s*$/m)[1]
  if (!secao) throw new Error('o README não tem a seção "## Structure"')
  /* \r?\n: com core.autocrlf=true, o Git do Windows entrega o README com CRLF. */
  const bloco = secao.match(/```\r?\n([\s\S]*?)```/)
  if (!bloco) throw new Error('a seção "## Structure" não tem um bloco de código')
  return bloco[1]
}

/* Os nomes do bloco, sem os traços da árvore e sem o comentário depois do nome. */
function nomesDoBloco() {
  return new Set(
    blocoEstrutura()
      .split('\n')
      .map((linha) => linha.replace(/^[\s│├└─]+/, '').split(/\s{2,}/)[0].trim().replace(/\/$/, ''))
      .filter(Boolean),
  )
}

function arquivos(pasta, ignorar = []) {
  const saida = []
  for (const nome of readdirSync(pasta)) {
    if (ignorar.includes(nome)) continue
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho, ignorar))
    else saida.push(caminho)
  }
  return saida
}

const EH_TESTE = /\.test\.(js|jsx)$/

describe('README, bloco "## Structure"', () => {
  it('todo arquivo de src/ (menos os testes) aparece no bloco', () => {
    const nomes = nomesDoBloco()
    const faltando = arquivos(join(RAIZ, 'src'))
      .filter((caminho) => !EH_TESTE.test(caminho))
      .map((caminho) => relative(RAIZ, caminho))
      .filter((caminho) => !nomes.has(caminho.split(/[\\/]/).pop()))

    expect(faltando, 'arquivos que existem e não estão no README').toEqual([])
  })

  /* As pastas entram junto com os arquivos: ".claude" e ".github" têm cara de extensão e seriam
     cobradas como arquivo que não existe. */
  it('todo arquivo citado no bloco existe no repositório', () => {
    const existentes = new Set(
      arquivos(RAIZ, ['node_modules', 'dist', '.git']).flatMap((caminho) =>
        relative(RAIZ, caminho).split(/[\\/]/),
      ),
    )
    const citadosQueNaoExistem = [...nomesDoBloco()]
      .filter((nome) => /\.[a-z]+$/i.test(nome))
      .filter((nome) => !existentes.has(nome))

    expect(citadosQueNaoExistem, 'arquivos no README que não existem').toEqual([])
  })

  it('a leitura do bloco funciona: acha pelo menos o App.jsx', () => {
    expect(nomesDoBloco().has('App.jsx')).toBe(true)
    expect(existsSync(join(RAIZ, 'src', 'App.jsx'))).toBe(true)
  })
})

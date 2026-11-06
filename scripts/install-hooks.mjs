#!/usr/bin/env node
/* Liga os ganchos de .githooks/ neste clone. Roda sozinho no `npm install` (script "prepare").
 *
 * O git não instala ganchos ao clonar: cada clone precisa apontar o core.hooksPath para a
 * pasta versionada. Sem isso, o .githooks/commit-msg existe no repositório e não roda em
 * lugar nenhum, e ninguém percebe.
 *
 * Fora de um repositório git (um zip baixado, por exemplo) ele só avisa: quebrar o
 * npm install por causa disso impediria a pessoa de rodar o projeto.
 *
 * Imprime o que fez mesmo quando dá certo: saída vazia não é aprovação.
 */
import { spawnSync } from 'node:child_process'

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' })

const dentro = git('rev-parse', '--is-inside-work-tree')
if (dentro.status !== 0 || dentro.stdout.trim() !== 'true') {
  console.log('ganchos: esta pasta não é um repositório git; os ganchos ficam desligados.')
  console.log('ganchos: depois do git init ou do git clone, rode de novo: npm install')
  process.exit(0)
}

const ligado = git('config', 'core.hooksPath', '.githooks')
if (ligado.status !== 0) {
  console.log(`ganchos: não consegui ligar (${ligado.stderr.trim()}).`)
  console.log('ganchos: rode na raiz do repositório: git config core.hooksPath .githooks')
  process.exit(0)
}

const conferido = git('config', '--get', 'core.hooksPath').stdout.trim()
console.log(`ganchos: core.hooksPath = ${conferido} (o commit-msg recusa coautoria do Claude)`)

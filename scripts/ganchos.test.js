/* As duas travas que impedem o Claude de aparecer como coautor ou de mexer no git sozinho
 * (CONTRIBUTING.md, seção 4):
 *
 *   - .githooks/commit-msg recusa a mensagem com a linha de coautoria do Claude, venha ela
 *     de quem vier;
 *   - .claude/hooks/block-git-write.sh recusa, dentro do Claude Code, comando de git ou gh
 *     que escreve (commit, push, merge, PR...).
 *
 * Os dois são scripts de shell. No Windows eles rodam pelo sh do Git Bash; se o sh não
 * estiver no PATH do terminal que rodou o teste, os casos são pulados e o motivo aparece na
 * saída. No CI (Linux) eles sempre rodam.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

const RAIZ = process.cwd()
const COMMIT_MSG = join(RAIZ, '.githooks', 'commit-msg')
const BLOQUEIO = join(RAIZ, '.claude', 'hooks', 'block-git-write.sh')
const TEM_SH = spawnSync('sh', ['-c', 'exit 0']).status === 0
if (!TEM_SH) console.warn('ganchos.test.js: sh fora do PATH; os casos dos ganchos foram pulados')

const temporaria = mkdtempSync(join(tmpdir(), 'umbraview-ganchos-'))
afterAll(() => rmSync(temporaria, { recursive: true, force: true }))

/* Roda o commit-msg como o git roda: com o caminho de um arquivo que tem a mensagem.
   Recusa só conta com o motivo escrito na saída: o sh devolve 2 quando nem acha o script,
   e um teste que olhasse só o código de saída passaria sem gancho nenhum. */
function commitMsg(mensagem) {
  const arquivo = join(temporaria, 'COMMIT_EDITMSG')
  writeFileSync(arquivo, mensagem)
  const r = spawnSync('sh', [COMMIT_MSG, arquivo], { encoding: 'utf8' })
  if (r.status === 0) return 'aceita'
  return r.status === 1 && /atribuicao ao Claude/.test(r.stderr) ? 'recusa' : `erro ${r.status}: ${r.stderr}`
}

/* Roda o bloqueio como o Claude Code roda: o JSON da chamada chega pela entrada padrão.
   O Claude Code bloqueia com o código 2, e o motivo vai para a saída de erro. */
function bloqueio(comando) {
  const entrada = JSON.stringify({ tool_name: 'Bash', tool_input: { command: comando } })
  const r = spawnSync('sh', [BLOQUEIO], { input: entrada, encoding: 'utf8' })
  if (r.status === 0) return 'passa'
  return r.status === 2 && /Bloqueado pela politica/.test(r.stderr) ? 'bloqueia' : `erro ${r.status}: ${r.stderr}`
}

describe.skipIf(!TEM_SH)('gancho commit-msg', () => {
  it('aceita mensagem normal, inclusive com a palavra claude no assunto', () => {
    expect(commitMsg('adiciona painel do ponto\n')).toBe('aceita')
    expect(commitMsg('documenta como usar o claude no projeto\n')).toBe('aceita')
  })

  it('recusa a coautoria do Claude, em qualquer caixa', () => {
    expect(commitMsg('adiciona painel\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n')).toBe('recusa')
    expect(commitMsg('adiciona painel\n\nco-authored-by: claude <x@y.z>\n')).toBe('recusa')
  })

  it('recusa o link de sessão e o rodapé "Generated with Claude Code"', () => {
    expect(commitMsg('adiciona painel\n\nClaude-Session: https://claude.ai/code/session_x\n')).toBe('recusa')
    expect(commitMsg('adiciona painel\n\nGenerated with [Claude Code](https://claude.com/claude-code)\n')).toBe('recusa')
  })
})

describe.skipIf(!TEM_SH)('bloqueio de git no Claude Code', () => {
  it.each([
    'git commit -m "x"',
    'git push origin develop',
    'git merge develop',
    'git reset --hard',
    'git rebase -i HEAD~2',
    'git -C . commit -m x',
    '/usr/bin/git commit -m x',
    "sh -c 'git push'",
    'cd src && git commit -am x',
    'gh pr create --fill',
    'gh pr merge 3',
    'git branch -d feat/painel',
    'git branch -D feat/painel',
    'git branch --delete feat/painel',
  ])('bloqueia: %s', (comando) => {
    expect(bloqueio(comando)).toBe('bloqueia')
  })

  it.each([
    'git status',
    'git diff',
    'git log --oneline -5',
    'git log --grep=commit',
    'npm run verify',
    'gh pr view 3',
    'git branch',
    'git branch -a',
    'git checkout -b feat/painel-do-ponto',
  ])('deixa passar: %s', (comando) => {
    expect(bloqueio(comando)).toBe('passa')
  })
})

/* O settings.json da equipe é lido inteiro ou descartado inteiro: com um erro de JSON, o
   Claude Code ignora o arquivo e as travas somem sem aviso nenhum. Por isso o teste confere
   o arquivo, e não só os scripts. */
describe('configuração do Claude Code da equipe (.claude/settings.json)', () => {
  const settings = JSON.parse(readFileSync(join(RAIZ, '.claude', 'settings.json'), 'utf8'))

  it('não assina commit nem PR, e não põe link de sessão', () => {
    expect(settings.attribution).toEqual({ commit: '', pr: '', sessionUrl: false })
  })

  it('nega os comandos de git que são da pessoa, inclusive apagar branch', () => {
    for (const regra of [
      'Bash(git commit *)',
      'Bash(git push *)',
      'Bash(git merge *)',
      'Bash(git reset *)',
      'Bash(git branch -d *)',
      'Bash(git branch -D *)',
      'PowerShell(git commit *)',
      'PowerShell(git push *)',
      'PowerShell(git branch -d *)',
    ]) {
      expect(settings.permissions.deny).toContain(regra)
    }
  })

  /* Chamado pelo sh, o script não depende do bit de execução, que o Windows não guarda. */
  it('registra o bloqueio antes de todo comando de terminal, chamado pelo sh', () => {
    const [registro] = settings.hooks.PreToolUse
    expect(registro.matcher).toBe('Bash|PowerShell')
    expect(registro.hooks[0].command).toBe('sh "$CLAUDE_PROJECT_DIR/.claude/hooks/block-git-write.sh"')
  })
})

describe.skipIf(!TEM_SH)('instalação dos ganchos pelo npm install', () => {
  it('aponta o core.hooksPath para .githooks num repositório git', () => {
    const repo = join(temporaria, 'repo')
    execFileSync('git', ['init', '-q', repo])
    execFileSync('node', [join(RAIZ, 'scripts', 'instalar-ganchos.mjs')], { cwd: repo })
    const caminho = execFileSync('git', ['config', '--get', 'core.hooksPath'], { cwd: repo, encoding: 'utf8' })
    expect(caminho.trim()).toBe('.githooks')
  })

  it('fora de um repositório git, avisa e não quebra o npm install', () => {
    const solta = mkdtempSync(join(tmpdir(), 'umbraview-sem-git-'))
    const saida = spawnSync('node', [join(RAIZ, 'scripts', 'instalar-ganchos.mjs')], { cwd: solta, encoding: 'utf8' })
    rmSync(solta, { recursive: true, force: true })
    expect(saida.status).toBe(0)
    expect(saida.stdout + saida.stderr).toMatch(/não é um repositório git/)
  })

  it('o arquivo do gancho existe e começa com #!/bin/sh', () => {
    expect(readFileSync(COMMIT_MSG, 'utf8').split('\n')[0]).toBe('#!/bin/sh')
  })
})

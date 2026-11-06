/* A conferência do build (scripts/check-build.mjs) barra o marcador de rascunho
 * TODO_PREENCHER antes de o site ir ao ar. Aqui ela roda contra pastas montadas na hora,
 * para provar que acha o marcador e que não reprova build limpo. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { checkBuild } from './check-build.mjs'

const base = mkdtempSync(join(tmpdir(), 'umbraview-conferir-'))
afterAll(() => rmSync(base, { recursive: true, force: true }))

function dist(nome, arquivos) {
  const pasta = join(base, nome)
  mkdirSync(join(pasta, 'assets'), { recursive: true })
  for (const [caminho, conteudo] of Object.entries(arquivos)) writeFileSync(join(pasta, caminho), conteudo)
  return pasta
}

describe('conferência do build', () => {
  it('aprova build sem marcador e diz quantos arquivos leu', () => {
    const r = checkBuild(dist('limpo', { 'index.html': '<div id="root"></div>', 'assets/app.js': 'console.log(1)' }))
    expect(r.problemas).toEqual([])
    expect(r.lidos).toBe(2)
  })

  it('reprova o marcador TODO_PREENCHER e aponta o arquivo', () => {
    const r = checkBuild(dist('sujo', { 'index.html': '<p></p>', 'assets/app.js': 'const site = "TODO_PREENCHER"' }))
    expect(r.problemas).toHaveLength(1)
    expect(r.problemas[0]).toMatch(/assets\/app\.js/)
  })

  it('reprova quando não há build: pasta vazia não é aprovação', () => {
    const r = checkBuild(join(base, 'nao-existe'))
    expect(r.lidos).toBe(0)
    expect(r.problemas[0]).toMatch(/build não encontrado/)
  })
})

// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { AdditiveBlending, ShaderMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import { ADDITIVE_LIGHT } from './additiveLight.js'

describe('mistura das luzes aditivas', () => {
  it('soma a cor ao que está atrás e não grava profundidade', () => {
    const material = new ShaderMaterial({ ...ADDITIVE_LIGHT })
    expect(material.blending).toBe(AdditiveBlending)
    expect(material.transparent).toBe(true)
    // gravando profundidade, uma estrela esconderia a de trás e o que viesse depois dela
    expect(material.depthWrite).toBe(false)
  })

  it('as duas cenas pintam o fundo dentro do WebGL, sem o que as estrelas somem', () => {
    /* A mistura aditiva só aparece sobre um fundo opaco. Se alguém tirar o fundo de uma das cenas
       ("a página já tem a cor"), as estrelas dela somem sem erro nenhum: foi o defeito da v2. */
    for (const file of ['LunarScene.jsx', 'SystemView.jsx']) {
      const source = readFileSync(join(process.cwd(), 'src', 'scene', file), 'utf8')
      expect(source, file).toContain('<color attach="background"')
    }
  })
})

/* Os locais de pouso da lista (card I2). Conferem o que uma linha da planilha do P1 pode trazer de
 * errado: fonte que não é https, coordenada fora da faixa, id repetido e local fora da área com
 * relevo. Cada conferência lista o nome do local culpado, e não só "falhou". */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { isInsideReliefArea } from '../engine/reliefFiles.js'
import { sites } from './sites.js'

const MANIFEST = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'data', 'relief', 'manifest.json'), 'utf8'),
)

describe('sites.js', () => {
  it('todo local tem a fonte num link https://', () => {
    const bad = sites.filter((site) => !site.sourceUrl?.startsWith('https://'))
    expect(bad.map((site) => site.name)).toEqual([])
  })

  it('latitude entre −90 e 90 e longitude entre −180 e 180', () => {
    const bad = sites.filter(
      (site) => !(site.lat >= -90 && site.lat <= 90 && site.lon >= -180 && site.lon <= 180),
    )
    expect(bad.map((site) => site.name)).toEqual([])
  })

  it('nenhum id se repete', () => {
    const ids = sites.map((site) => site.id)
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([])
  })

  /* A mesma regra com que o motor recusa o ponto e o clique da cena barra: o areaMaxLatDeg do
     manifest (-84.0: negativo é sul). Um local ao norte dele daria erro no painel até o card E8. */
  it('todo local fica dentro da área com relevo, ao sul de 84°S', () => {
    const outside = sites.filter((site) => !isInsideReliefArea(MANIFEST, site.lat))
    expect(outside.map((site) => site.name)).toEqual([])
  })
})

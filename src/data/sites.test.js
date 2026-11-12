/* Os locais de pouso da lista (cards I2 e E16). Conferem o que uma linha da planilha do P1 pode
 * trazer de errado: fonte que não é https, coordenada fora da faixa, id repetido e local fora da
 * área com relevo. Cada conferência lista o nome do local culpado, e não só "falhou". */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { measurePolarPolygon } from '../engine/geometry.js'
import { isInsideReliefArea } from '../engine/reliefFiles.js'
import { sites } from './sites.js'

const MANIFEST = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'data', 'relief', 'manifest.json'), 'utf8'),
)

/* Os contornos das 9 regiões candidatas do Artemis III, copiados do USGS (CREDITS.md). Cada uma
   vira { id, center }: o id é o da linha da lista, artemis- mais o código da região no USGS
   (Haworth, HW, é artemis-hw). */
const ARTEMIS_REGIONS = JSON.parse(
  readFileSync(join(process.cwd(), 'scripts', 'references', 'artemis-regions.geojson'), 'utf8'),
).features.map((feature) => ({
  id: `artemis-${feature.properties.RegionCode.toLowerCase()}`,
  center: measurePolarPolygon(feature.geometry.coordinates[0]),
}))

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

/* A NASA não dá um ponto de cada região candidata: a coordenada da lista é o centro do contorno
   que o USGS desenhou, calculado pelo measurePolarPolygon (src/engine/geometry.js). Estes testes
   amarram cada linha ao contorno dela, para que ninguém troque a coordenada à mão nem esqueça uma
   região que o relevo já cobre. */
describe('regiões do Artemis III na lista (card E16)', () => {
  const listed = sites.filter((site) => site.id.startsWith('artemis-'))

  it('a lista traz toda região com o centro dentro da área com relevo, e só elas', () => {
    const expected = ARTEMIS_REGIONS.filter((region) =>
      isInsideReliefArea(MANIFEST, region.center.lat),
    ).map((region) => region.id)
    expect(listed.map((site) => site.id).sort()).toEqual(expected.sort())
  })

  // A lista guarda 4 casas decimais, uns 3 m na Lua: a diferença para a conta passa de 0,00005°
  // só se a coordenada foi trocada.
  it('a coordenada de cada região é o centro do contorno do USGS', () => {
    const wrong = listed.filter((site) => {
      const region = ARTEMIS_REGIONS.find((candidate) => candidate.id === site.id)
      return (
        !region ||
        Math.abs(site.lat - region.center.lat) > 0.00005 ||
        Math.abs(site.lon - region.center.lon) > 0.00005
      )
    })
    expect(wrong.map((site) => site.name)).toEqual([])
  })
})

/* Os locais de pouso da lista (cards I2 e E16). Conferem o que uma linha da planilha do P1 pode
 * trazer de errado: fonte que não é https, coordenada fora da faixa e id repetido. Cada conferência
 * lista o nome do local culpado, e não só "falhou".
 *
 * Na v2 (contrato C4) o motor calcula a Lua inteira: o local ao norte de 84°S deixou de ser
 * recusado e usa o relevo global, de 1,9 km por pixel. O teste que barrava esses locais saiu, e
 * o das regiões do Artemis III passou a cobrar as nove. */
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
   vira { id, name, center }: o id é o da linha da lista, artemis- mais o código da região no USGS
   (Haworth, HW, é artemis-hw), e o name é o nome que o USGS dá a ela. */
const ARTEMIS_REGIONS = JSON.parse(
  readFileSync(join(process.cwd(), 'scripts', 'references', 'artemis-regions.geojson'), 'utf8'),
).features.map((feature) => ({
  id: `artemis-${feature.properties.RegionCode.toLowerCase()}`,
  name: feature.properties.Region,
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

  /* Com a Lua inteira no cálculo, os locais de fora do polo entram na lista. Os de hoje são só as
     duas regiões do Artemis III com o centro ao norte de 84°S: se outro aparecer aqui, é para
     aparecer de propósito, sabendo que o painel dele usa o relevo mais grosso. */
  it('os locais fora da área polar são as duas regiões do Artemis III com o centro ao norte de 84°S', () => {
    const outside = sites.filter((site) => !isInsideReliefArea(MANIFEST, site.lat))
    expect(outside.map((site) => site.id).sort()).toEqual(['artemis-cb', 'artemis-n2'])
  })
})

/* A NASA não dá um ponto de cada região candidata: a coordenada da lista é o centro do contorno
   que o USGS desenhou, calculado pelo measurePolarPolygon (src/engine/geometry.js). Estes testes
   amarram cada linha ao contorno dela, para que ninguém troque a coordenada ou o nome à mão nem
   esqueça uma região que o relevo já cobre. */
describe('regiões do Artemis III na lista (card E16)', () => {
  const listed = sites.filter((site) => site.id.startsWith('artemis-'))

  it('a lista traz as nove regiões candidatas, e só elas', () => {
    expect(ARTEMIS_REGIONS).toHaveLength(9)
    const expected = ARTEMIS_REGIONS.map((region) => region.id)
    expect(listed.map((site) => site.id).sort()).toEqual(expected.sort())
  })

  /* A lista guarda 4 casas decimais, uns 3 m na Lua: a diferença para a conta passa de 0,00005°
     só se a coordenada foi trocada. Sem conferir o nome, a coordenada de uma região com o nome de
     outra passaria, e o painel mostraria o céu errado com o nome certo. O nome é comparado sem
     maiúscula e minúscula porque o USGS escreve "Peak Near Cabeus B", e a NASA, "Peak near
     Cabeus B". */
  it('a coordenada e o nome de cada região são os do contorno do USGS', () => {
    const wrong = listed.filter((site) => {
      const region = ARTEMIS_REGIONS.find((candidate) => candidate.id === site.id)
      return (
        !region ||
        Math.abs(site.lat - region.center.lat) > 0.00005 ||
        Math.abs(site.lon - region.center.lon) > 0.00005 ||
        site.name.toLowerCase() !== `${region.name} (center)`.toLowerCase()
      )
    })
    expect(wrong.map((site) => site.name)).toEqual([])
  })
})

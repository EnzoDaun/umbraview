/* A lista de locais de pouso (card I2). Os locais abaixo são de mentira, com nomes que não existem
 * na Lua, para ninguém copiar um deles para o src/data/sites.js como se fosse dado de verdade. Os
 * textos vêm de src/data/panel.js, para o teste não repetir o inglês. */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { panel } from '../data/panel.js'
import { SiteList } from './SiteList.jsx'

/* O L2 vem depois da região candidata C1, e o L1 e a C1 são da mesma agência: agrupar por agência
   e agrupar por tipo dão listas diferentes, e o teste vê qual das duas o componente fez. */
const sites = [
  {
    id: 'l1',
    name: 'Site L1',
    agency: 'Agency A',
    landedAtUtc: new Date('2020-01-01T00:00:00Z'),
    lat: -89.5,
    lon: 10,
  },
  { id: 'c1', name: 'Site C1', agency: 'Agency A', landedAtUtc: null, lat: -88, lon: -45 },
  {
    id: 'l2',
    name: 'Site L2',
    agency: 'Agency B',
    landedAtUtc: new Date('2021-01-01T00:00:00Z'),
    lat: -87.2,
    lon: 120,
  },
]

describe('SiteList', () => {
  it('começa no aviso, e não num local: escolher o primeiro local também tem que chamar o onSelect', () => {
    render(<SiteList sites={sites} onSelect={() => {}} />)
    expect(screen.getByLabelText(panel.siteListLabel)).toHaveDisplayValue(panel.siteListPlaceholder)
  })

  it('agrupa por tipo: os que pousaram e as regiões candidatas, que não têm data de pouso', () => {
    render(<SiteList sites={sites} onSelect={() => {}} />)
    const groups = screen.getAllByRole('group')
    expect(groups.map((group) => group.label)).toEqual([
      panel.siteGroupLanded,
      panel.siteGroupCandidates,
    ])
    const landed = within(groups[0]).getAllByRole('option').map((option) => option.textContent)
    expect(landed).toEqual(['Site L1', 'Site L2'])
  })

  it('escolher um local chama o onSelect uma vez, com o objeto inteiro do local', async () => {
    const onSelect = vi.fn()
    render(<SiteList sites={sites} onSelect={onSelect} />)
    await userEvent.selectOptions(screen.getByLabelText(panel.siteListLabel), 'Site L2')
    // o objeto inteiro, e não só o id: o useSiteSky precisa do lat, do lon e do name
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(sites[2])
  })
})

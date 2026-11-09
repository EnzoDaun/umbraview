/* A lista de locais de pouso (card I2). Os locais abaixo são de mentira, com nomes que não existem
 * na Lua, para ninguém copiar um deles para o src/data/sites.js como se fosse dado de verdade. Os
 * textos vêm de src/data/panel.js, para o teste não repetir o inglês. */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { panel } from '../data/panel.js'
import { SiteList } from './SiteList.jsx'

// o A2 vem depois de um local da Agency B: o agrupamento tem que juntar o A2 ao A1 mesmo assim
const sites = [
  { id: 'a1', name: 'Site A1', agency: 'Agency A', lat: -89.5, lon: 10 },
  { id: 'b1', name: 'Site B1', agency: 'Agency B', lat: -88, lon: -45 },
  { id: 'a2', name: 'Site A2', agency: 'Agency A', lat: -87.2, lon: 120 },
]

describe('SiteList', () => {
  it('começa no aviso, e não num local: escolher o primeiro local também tem que chamar o onSelect', () => {
    render(<SiteList sites={sites} onSelect={() => {}} />)
    expect(screen.getByLabelText(panel.siteListLabel)).toHaveDisplayValue(panel.siteListPlaceholder)
  })

  it('agrupa os locais por agência, na ordem em que cada agência aparece', () => {
    render(<SiteList sites={sites} onSelect={() => {}} />)
    const groups = screen.getAllByRole('group')
    expect(groups.map((group) => group.label)).toEqual(['Agency A', 'Agency B'])
    const namesInA = within(groups[0]).getAllByRole('option').map((option) => option.textContent)
    expect(namesInA).toEqual(['Site A1', 'Site A2'])
  })

  it('escolher um local chama o onSelect uma vez, com o objeto inteiro do local', async () => {
    const onSelect = vi.fn()
    render(<SiteList sites={sites} onSelect={onSelect} />)
    await userEvent.selectOptions(screen.getByLabelText(panel.siteListLabel), 'Site A2')
    // o objeto inteiro, e não só o id: o useSiteSky precisa do lat, do lon e do name
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(sites[2])
  })
})

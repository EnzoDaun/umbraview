/* O controle de data e hora (card I4). A suíte roda em Tóquio (vite.config.js), nove horas à frente
 * do UTC: se o componente ler ou mostrar a data no fuso do computador, a hora sai nove horas errada
 * e estes testes pegam. Os textos vêm de src/data/panel.js, para o teste não repetir o inglês.
 *
 * O campo muda com o fireEvent.change, de uma vez, e não letra por letra com o userEvent.type: o
 * user-event só sabe digitar em campo de data do tipo date e time, e não no datetime-local. */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { panel } from '../data/panel.js'
import { DateTimeControl } from './DateTimeControl.jsx'

const dateUtc = new Date('2026-11-01T12:00:00Z')

afterEach(() => {
  // desfaz o vi.setSystemTime do teste do "Now"
  vi.useRealTimers()
})

describe('DateTimeControl', () => {
  it('mostra no campo a data recebida em UTC, e não no fuso de quem usa', () => {
    render(<DateTimeControl dateUtc={dateUtc} onChange={() => {}} />)
    // em Tóquio seriam 21:00
    expect(screen.getByLabelText(panel.dateTimeLabel)).toHaveValue('2026-11-01T12:00')
  })

  it('lê o que a pessoa escreve como UTC, e não no fuso do computador', () => {
    const onChange = vi.fn()
    render(<DateTimeControl dateUtc={dateUtc} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(panel.dateTimeLabel), {
      target: { value: '2026-11-14T03:00' },
    })
    // lido no fuso de Tóquio, viraria 18:00 UTC do dia 13
    expect(onChange).toHaveBeenCalledExactlyOnceWith(new Date('2026-11-14T03:00:00Z'))
  })

  it('o "Now" escolhe a hora atual', async () => {
    vi.setSystemTime(new Date('2026-11-14T03:00:00Z'))
    const onChange = vi.fn()
    render(<DateTimeControl dateUtc={dateUtc} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: panel.dateTimeNow }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(new Date('2026-11-14T03:00:00Z'))
  })

  it('campo vazio não chama o onChange: a data inválida derrubaria a tela', () => {
    const onChange = vi.fn()
    render(<DateTimeControl dateUtc={dateUtc} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(panel.dateTimeLabel), { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})

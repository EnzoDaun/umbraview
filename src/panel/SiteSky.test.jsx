/* O céu do ponto em desenho: a vista do chão e a linha do tempo, ligadas pela hora marcada. O teste
 * confere o que a pessoa lê e faz (os estados, o resumo para o leitor de tela, o cursor e o botão
 * que leva a hora para a data); a posição de cada traço tem teste próprio, em skyChart.test.js. */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { panel } from '../data/panel.js'
import { siteSky } from '../data/siteSky.js'
import { formatPercent, formatUtc } from './format.js'
import { SiteSky } from './SiteSky.jsx'

const INICIO = new Date('2026-11-14T00:00:00Z')
const HORAS = 48

/* Um céu de 48 horas: o Sol à vista só nas primeiras 24, a Terra o tempo todo. */
function ceu(inicio = INICIO) {
  const hora = (i, visible) => ({ azimuthDeg: 10 + i, elevationDeg: 2 - i * 0.1, visible })
  return {
    sunFraction: 0.5,
    earthFraction: 1,
    period: { startUtc: inicio, endUtc: new Date(inicio.getTime() + (HORAS - 1) * 3600e3) },
    landingWindows: [{ startUtc: inicio, endUtc: new Date(inicio.getTime() + 24 * 3600e3) }],
    groundView: {
      horizonDeg: Array.from({ length: 360 }, () => 1),
      sun: Array.from({ length: HORAS }, (_, i) => hora(i, i < 24)),
      earth: Array.from({ length: HORAS }, (_, i) => hora(i, true)),
    },
  }
}

const cursor = () => screen.getByRole('slider', { name: siteSky.timelineLabel })

describe('SiteSky', () => {
  it('sem ponto escolhido, diz para que o gráfico serve', () => {
    render(<SiteSky status="idle" sky={null} onDateChange={() => {}} />)
    expect(screen.getByText(siteSky.empty)).toBeInTheDocument()
  })

  it('calculando e com erro, mostra a frase de cada caso, e não um gráfico velho', () => {
    const { rerender } = render(<SiteSky status="loading" sky={null} onDateChange={() => {}} />)
    expect(screen.getByText(siteSky.loading)).toBeInTheDocument()
    rerender(<SiteSky status="error" sky={null} onDateChange={() => {}} />)
    expect(screen.getByText(panel.error)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('com o resultado, o gráfico tem um resumo em texto com os números do ponto', () => {
    render(<SiteSky status="ready" sky={ceu()} onDateChange={() => {}} />)
    const nome = screen.getByRole('img').getAttribute('aria-label')
    expect(nome).toContain(formatPercent(0.5))
    expect(nome).toContain(formatPercent(1))
  })

  it('o cursor começa na data escolhida e anda pelas horas do período', () => {
    render(<SiteSky status="ready" sky={ceu()} onDateChange={() => {}} />)
    expect(cursor()).toHaveValue('0')
    expect(cursor()).toHaveAttribute('max', String(HORAS - 1))
    expect(cursor()).toHaveAttribute('aria-valuetext', formatUtc(INICIO))
    fireEvent.change(cursor(), { target: { value: '30' } })
    expect(cursor()).toHaveAttribute('aria-valuetext', formatUtc(new Date('2026-11-15T06:00:00Z')))
    // na hora 30 o Sol já está escondido, e a Terra continua à vista
    expect(screen.getByText(siteSky.hidden, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(siteSky.inView, { exact: false })).toBeInTheDocument()
  })

  it('o botão leva a hora marcada para a data do cálculo, e na hora 0 não tem o que fazer', () => {
    const onDateChange = vi.fn()
    render(<SiteSky status="ready" sky={ceu()} onDateChange={onDateChange} />)
    const botao = screen.getByRole('button', { name: siteSky.useThisTime })
    expect(botao).toBeDisabled()
    fireEvent.change(cursor(), { target: { value: '30' } })
    fireEvent.click(botao)
    expect(onDateChange).toHaveBeenCalledWith(new Date('2026-11-15T06:00:00Z'))
  })

  it('quando o período muda, o cursor volta ao começo; trocando só o ponto, fica onde estava', () => {
    const { rerender } = render(<SiteSky status="ready" sky={ceu()} onDateChange={() => {}} />)
    fireEvent.change(cursor(), { target: { value: '30' } })
    // outro ponto, o mesmo período
    rerender(<SiteSky status="ready" sky={ceu()} onDateChange={() => {}} />)
    expect(cursor()).toHaveValue('30')
    rerender(<SiteSky status="ready" sky={ceu(new Date('2026-12-01T00:00:00Z'))} onDateChange={() => {}} />)
    expect(cursor()).toHaveValue('0')
  })

  it('a explicação geral fica fechada até a pessoa abrir, e cita a altura do observador do motor', () => {
    render(<SiteSky status="ready" sky={ceu()} onDateChange={() => {}} />)
    const explicacao = screen.getByText(siteSky.explainTitle).closest('details')
    expect(explicacao).not.toHaveAttribute('open')
    expect(explicacao).toHaveTextContent('2 m above the ground')
  })
})

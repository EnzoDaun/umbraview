/* A vista do sistema: o relógio próprio, os números do instante e o botão que leva o instante para
 * a data. O desenho 3D é do WebGL, que o jsdom não tem: o Canvas vira um substituto vazio, e as
 * posições têm teste próprio, em src/engine/system.test.js. */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { systemView } from '../data/systemView.js'
import { systemStateAt } from '../engine/system.js'
import { formatUtc } from '../panel/format.js'
import { SystemView } from './SystemView.jsx'

vi.mock('@react-three/fiber', () => ({ Canvas: () => <div data-testid="canvas" />, useFrame: () => {} }))
vi.mock('@react-three/drei', () => ({ Html: () => null, Line: () => null, OrbitControls: () => null }))

const DATA = new Date('2026-11-14T00:00:00Z')
const relogio = () => screen.getByRole('slider', { name: systemView.timeLabel })

describe('SystemView', () => {
  it('tem nome acessível e diz que não está em escala', () => {
    render(<SystemView dateUtc={DATA} onDateChange={() => {}} />)
    expect(screen.getByRole('img', { name: systemView.label })).toBeInTheDocument()
    expect(screen.getByText(/not to scale/, { selector: 'p' })).toBeInTheDocument()
  })

  it('mostra a distância, a parte iluminada e a libração do instante, com os números do motor', () => {
    render(<SystemView dateUtc={DATA} onDateChange={() => {}} />)
    const estado = systemStateAt(DATA.getTime())
    expect(screen.getByText(systemView.distanceValue(estado.distanceKm))).toBeInTheDocument()
    expect(screen.getByText(systemView.librationValue(estado.subEarth))).toBeInTheDocument()
  })

  it('o relógio da vista anda pelo período sem chamar a troca de data; os números acompanham', () => {
    const onDateChange = vi.fn()
    render(<SystemView dateUtc={DATA} onDateChange={onDateChange} />)
    fireEvent.change(relogio(), { target: { value: '240' } })
    const dezDiasDepois = new Date('2026-11-24T00:00:00Z')
    expect(screen.getByText(formatUtc(dezDiasDepois))).toBeInTheDocument()
    expect(screen.getByText(systemView.distanceValue(systemStateAt(dezDiasDepois.getTime()).distanceKm))).toBeInTheDocument()
    expect(onDateChange).not.toHaveBeenCalled()
  })

  it('o botão leva o instante da vista para a data do cálculo, e no instante da data não tem o que fazer', () => {
    const onDateChange = vi.fn()
    render(<SystemView dateUtc={DATA} onDateChange={onDateChange} />)
    const botao = screen.getByRole('button', { name: systemView.useThisTime })
    expect(botao).toBeDisabled()
    fireEvent.change(relogio(), { target: { value: '240' } })
    fireEvent.click(botao)
    expect(onDateChange).toHaveBeenCalledWith(new Date('2026-11-24T00:00:00Z'))
  })

  it('o botão de tocar diz se está tocando, e mexer no cursor para', () => {
    render(<SystemView dateUtc={DATA} onDateChange={() => {}} />)
    const tocar = screen.getByRole('button', { name: systemView.play })
    expect(tocar).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(tocar)
    expect(screen.getByRole('button', { name: systemView.pause })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(relogio(), { target: { value: '10' } })
    expect(screen.getByRole('button', { name: systemView.play })).toHaveAttribute('aria-pressed', 'false')
  })

  /* O Sol fica parado no centro e a Terra anda em volta dele; a câmera começa presa ao Sol, que é
     de onde se vê a Terra andar. O botão a prende na Terra, para acompanhar a Lua de perto. */
  it('a câmera começa no Sol, e o botão de seguir a Terra liga e desliga', () => {
    render(<SystemView dateUtc={DATA} onDateChange={() => {}} />)
    const seguir = screen.getByRole('button', { name: systemView.followEarth })
    expect(seguir).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(seguir)
    expect(seguir).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(seguir)
    expect(seguir).toHaveAttribute('aria-pressed', 'false')
  })

  it('explica que é a Terra que anda em volta do Sol, com o ano sideral do motor', () => {
    render(<SystemView dateUtc={DATA} onDateChange={() => {}} />)
    expect(screen.getByText(/Earth travels along the blue line/, { selector: 'p' })).toHaveTextContent('365.256 days')
  })
})

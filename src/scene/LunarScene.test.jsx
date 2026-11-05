/* A cena da Lua (card C1): o nome para o leitor de tela e o pedido de menos movimento.
 *
 * O jsdom não tem WebGL nem matchMedia. Por isso o Canvas e os controles viram substitutos: o
 * teste confere o que a cena entrega a eles, e não o desenho. Que a Lua aparece e gira se confere
 * no navegador, no "Pronto quando" do card. */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { scene } from '../data/scene.js'
import { LunarScene } from './LunarScene.jsx'

const controles = vi.fn()
vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => <div data-testid="canvas">{children}</div> }))
vi.mock('@react-three/drei', () => ({ OrbitControls: (props) => { controles(props); return null } }))

function sistemaPede(menosMovimento) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: menosMovimento, addEventListener: vi.fn(), removeEventListener: vi.fn() })
}

/* As props que os controles receberam na última vez que a cena desenhou. */
function ultimosControles() {
  return controles.mock.calls.at(-1)[0]
}

describe('LunarScene', () => {
  beforeEach(() => {
    controles.mockClear()
  })

  it('tem o nome acessível que vem de src/data/scene.js', () => {
    sistemaPede(false)
    render(<LunarScene />)
    expect(screen.getByRole('img', { name: scene.label })).toBeInTheDocument()
  })

  it('desenha dentro do Canvas', () => {
    sistemaPede(false)
    render(<LunarScene />)
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })

  it('com o pedido de menos movimento, não gira sozinha nem desliza depois de soltar o mouse', () => {
    sistemaPede(true)
    render(<LunarScene />)
    expect(ultimosControles()).toMatchObject({ autoRotate: false, enableDamping: false })
  })

  it('sem o pedido, gira devagar sozinha', () => {
    sistemaPede(false)
    render(<LunarScene />)
    expect(ultimosControles()).toMatchObject({ autoRotate: true })
  })

  it('arrastar não tira a Lua do centro, e o zoom tem limite', () => {
    sistemaPede(false)
    render(<LunarScene />)
    const props = ultimosControles()
    expect(props.enablePan).toBe(false)
    expect(props.minDistance).toBeGreaterThan(1)
    expect(props.maxDistance).toBeGreaterThan(props.minDistance)
  })
})

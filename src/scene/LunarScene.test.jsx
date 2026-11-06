/* A cena da Lua: o nome para o leitor de tela e o pedido de menos movimento (card C1), e a sombra
 * e a câmera que chega perto do relevo (card C2).
 *
 * O jsdom não tem WebGL nem matchMedia. Por isso o Canvas e os controles viram substitutos: o
 * teste confere o que a cena entrega a eles, e não o desenho. Que a Lua aparece e gira se confere
 * no navegador, no "Pronto quando" do card. */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { scene } from '../data/scene.js'
import { MOON_RADIUS_M } from '../engine/geometry.js'
import { LunarScene } from './LunarScene.jsx'

const controles = vi.fn()
const canvas = vi.fn()
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }) => {
    canvas(props)
    return <div data-testid="canvas">{children}</div>
  },
}))
vi.mock('@react-three/drei', () => ({ OrbitControls: (props) => { controles(props); return null } }))
// o relevo é baixado da página, e o jsdom não serve arquivo; a leitura tem teste próprio
vi.mock('../hooks/useFarRelief.js', () => ({ useFarRelief: () => null }))

const DATA = new Date('2026-11-14T00:00:00Z')

// o pico mais alto do far.bin: 13952 meios metros (reliefMesh.test.js)
const PICO_MAIS_ALTO = 1 + 6976 / MOON_RADIUS_M

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
    canvas.mockClear()
  })

  it('tem o nome acessível que vem de src/data/scene.js', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    expect(screen.getByRole('img', { name: scene.label })).toBeInTheDocument()
  })

  it('desenha dentro do Canvas', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })

  it('com o pedido de menos movimento, não gira sozinha nem desliza depois de soltar o mouse', () => {
    sistemaPede(true)
    render(<LunarScene dateUtc={DATA} />)
    expect(ultimosControles()).toMatchObject({ autoRotate: false, enableDamping: false })
  })

  it('sem o pedido, gira devagar sozinha', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    expect(ultimosControles()).toMatchObject({ autoRotate: true })
  })

  it('arrastar não tira a Lua do centro, e o zoom tem limite', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    const props = ultimosControles()
    expect(props.enablePan).toBe(false)
    expect(props.minDistance).toBeGreaterThan(1)
    expect(props.maxDistance).toBeGreaterThan(props.minDistance)
  })

  it('liga a sombra, que é o assunto do C2', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    expect(canvas.mock.calls.at(-1)[0].shadows).toBeTruthy()
  })

  it('a câmera chega perto do polo para o relevo aparecer, sem entrar na montanha mais alta', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    const { minDistance } = ultimosControles()
    expect(minDistance).toBeGreaterThan(PICO_MAIS_ALTO)
    // perto o bastante para ver as montanhas: 50 km acima do raio de referência, no máximo
    expect(minDistance).toBeLessThan(1 + 50000 / MOON_RADIUS_M)
  })

  it('a câmera não corta a superfície quando chega o mais perto que pode', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    const { near } = canvas.mock.calls.at(-1)[0].camera
    expect(near).toBeLessThan(ultimosControles().minDistance - PICO_MAIS_ALTO)
  })
})

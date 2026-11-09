/* A cena da Lua: o nome para o leitor de tela e o pedido de menos movimento (card C1), a sombra
 * e a câmera que chega perto do relevo (card C2), o marcador e o aviso do clique (card C3), e o
 * giro sozinho que para na primeira vez que a pessoa mexe na Lua (card C5).
 *
 * O jsdom não tem WebGL nem matchMedia. Por isso o Canvas e os controles viram substitutos: o
 * teste confere o que a cena entrega a eles, e não o desenho. Que a Lua aparece e gira se confere
 * no navegador, no "Pronto quando" do card. */
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  useFrame: () => {},
}))
vi.mock('@react-three/drei', () => ({
  OrbitControls: (props) => { controles(props); return null },
  Html: ({ children }) => <div data-testid="marcador">{children}</div>,
}))
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

  // um teste que falha no meio não deixa o relógio falso para os outros
  afterEach(() => {
    vi.useRealTimers()
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

  it('para de girar sozinha na primeira vez que a pessoa mexe, e não volta a girar', () => {
    // a WCAG 2.2.2 pede um jeito de parar o que se move sozinho, e o ponto escolhido não pode sair
    // andando da frente da pessoa (card C5)
    vi.useFakeTimers()
    sistemaPede(false)
    const { rerender } = render(<LunarScene dateUtc={DATA} />)
    expect(ultimosControles()).toMatchObject({ autoRotate: true })

    // os controles chamam o onStart quando a pessoa aperta o botão esquerdo ou o do meio, usa a
    // roda ou toca na tela
    const { onStart } = ultimosControles()
    expect(onStart).toBeTypeOf('function')
    act(() => onStart())
    expect(ultimosControles()).toMatchObject({ autoRotate: false })

    // soltar o mouse (o onEnd, que também vem logo depois de cada passo da roda) e o tempo passando
    // não religam o giro: pausar só enquanto a pessoa segura o mouse não pararia nada com a roda
    act(() => ultimosControles().onEnd?.())
    act(() => vi.runAllTimers())
    expect(ultimosControles()).toMatchObject({ autoRotate: false })

    // a cena desenha de novo, com um ponto escolhido, e o giro continua desligado
    rerender(<LunarScene dateUtc={DATA} site={{ lat: -89.475, lon: -137.44 }} />)
    expect(ultimosControles()).toMatchObject({ autoRotate: false })
  })

  it('com o pedido de menos movimento, mexer na Lua não muda nada: ela já estava parada', () => {
    sistemaPede(true)
    render(<LunarScene dateUtc={DATA} />)
    const { onStart } = ultimosControles()
    expect(onStart).toBeTypeOf('function')
    act(() => onStart())
    expect(ultimosControles()).toMatchObject({ autoRotate: false, enableDamping: false })
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

  it('sem ponto escolhido, não há marcador', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    expect(screen.queryByTestId('marcador')).not.toBeInTheDocument()
  })

  it('com um ponto escolhido, na cena ou na lista, mostra o marcador', () => {
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} site={{ lat: -89.475, lon: -137.44 }} />)
    expect(screen.getByTestId('marcador')).toBeInTheDocument()
  })

  it('o aviso do clique fora da área fica fora da imagem, onde o leitor de tela lê, e começa vazio', () => {
    // dentro do role="img", o leitor de tela trata tudo como parte da imagem e não lê o aviso
    sistemaPede(false)
    render(<LunarScene dateUtc={DATA} />)
    const aviso = screen.getByRole('status')
    expect(aviso).toBeEmptyDOMElement()
    expect(screen.getByRole('img', { name: scene.label })).not.toContainElement(aviso)
  })
})

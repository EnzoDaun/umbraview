/* O esqueleto da tela: as regiões em que cada frente vai trabalhar existem, têm nome para o
 * leitor de tela e mostram o texto que vem de src/data/app.js. Quando a cena 3D (card C1) e o
 * painel do ponto (card I1) entrarem, eles substituem o conteúdo das regiões, não as regiões.
 *
 * O jsdom não tem WebGL: as bibliotecas 3D viram substitutos, como em LunarScene.test.jsx. */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import App from './App.jsx'
import { app } from './data/app.js'
import { scene } from './data/scene.js'

vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => <div data-testid="canvas">{children}</div> }))
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null }))

describe('App, esqueleto da tela', () => {
  it('tem cabeçalho com o nome do projeto como título principal', () => {
    render(<App />)
    const cabecalho = screen.getByRole('banner')
    expect(within(cabecalho).getByRole('heading', { level: 1, name: app.name })).toBeInTheDocument()
  })

  it('tem a região da cena e a do painel, cada uma com nome acessível', () => {
    render(<App />)
    const principal = screen.getByRole('main')
    expect(within(principal).getByRole('region', { name: app.scene.title })).toBeInTheDocument()
    expect(within(principal).getByRole('region', { name: app.panel.title })).toBeInTheDocument()
  })

  it('a região da cena mostra a Lua em 3D', () => {
    render(<App />)
    const regiao = screen.getByRole('region', { name: app.scene.title })
    expect(within(regiao).getByRole('img', { name: scene.label })).toBeInTheDocument()
  })

  it('tem rodapé com a equipe', () => {
    render(<App />)
    expect(within(screen.getByRole('contentinfo')).getByText(app.footer)).toBeInTheDocument()
  })
})

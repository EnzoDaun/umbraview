/* O esqueleto da tela: as regiões em que cada frente vai trabalhar existem, têm nome para o
 * leitor de tela e mostram o texto que vem de src/data/app.js. Quando a cena 3D (card C1) e o
 * painel do ponto (card I1) entrarem, eles substituem o conteúdo das regiões, não as regiões. */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App.jsx'
import { app } from './data/app.js'

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

  it('tem rodapé com a equipe', () => {
    render(<App />)
    expect(within(screen.getByRole('contentinfo')).getByText(app.footer)).toBeInTheDocument()
  })
})

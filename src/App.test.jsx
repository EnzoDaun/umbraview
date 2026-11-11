/* O esqueleto da tela: as regiões em que cada frente trabalha existem e têm nome para o leitor de
 * tela, com o título que vem de src/data/app.js. A cena 3D (card C1) e o painel (card I1) ocupam
 * cada um a sua região, e o ponto escolhido na cena chega ao painel pelo useSiteSky (card E11).
 *
 * O jsdom não tem WebGL: as bibliotecas 3D viram substitutos, como em LunarScene.test.jsx. */
import { readFile as readFromDisk } from 'node:fs/promises'
import { join } from 'node:path'

import { act, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App.jsx'
import { app } from './data/app.js'
import { panel } from './data/panel.js'
import { scene } from './data/scene.js'
import { createSiteSky } from './engine/siteSky.js'
import { SitePanel } from './panel/SitePanel.jsx'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas">{children}</div>,
  useFrame: () => {},
}))
// o Html é o marcador do ponto escolhido (card C3), que aparece quando o teste escolhe um ponto
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null, Html: ({ children }) => <div>{children}</div> }))
vi.mock('./hooks/useFarRelief.js', () => ({ useFarRelief: () => null }))

/* A cena de verdade, com o onSelect que o App entrega a ela guardado aqui: o teste escolhe o ponto
   por ele, como faz o clique na Lua (card C3). O clique em si não dá para simular sem WebGL, porque
   o ponto atingido vem do raio que o three lança na malha. */
const sceneProps = vi.hoisted(() => ({ onSelect: null }))
vi.mock('./scene/LunarScene.jsx', async (importOriginal) => {
  const { LunarScene } = await importOriginal()
  return {
    LunarScene: (props) => {
      sceneProps.onSelect = props.onSelect
      return <LunarScene {...props} />
    },
  }
})

const RELIEF_DIR = join(process.cwd(), 'public', 'data', 'relief')
// o ponto 1 da comparação com a NASA (card E1), dentro da área com relevo
const TOP_1 = { lat: -89.475, lon: -137.44 }
// a hora em que a página abre: o App usa ela para a luz da cena e para o céu do ponto
const PAGE_OPENED_AT = new Date('2026-11-14T00:00:00Z')
/* A primeira conta lê o relevo do disco e leva bem menos de 1 s; a folga é para o CI (a mesma do
   useSiteSky.test.js). */
const WAIT = { timeout: 10000 }
const SLOW_TEST_MS = 15000

async function readRelief(path) {
  const bytes = await readFromDisk(join(RELIEF_DIR, path))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

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

describe('App, o ponto escolhido na cena vai para o painel (card E11)', () => {
  it(
    'o painel passa a calcular e mostra o céu que o motor dá para o ponto na hora em que a página abriu',
    async () => {
      // só o relógio é falso: os temporizadores continuam de verdade, para o waitFor esperar a conta
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(PAGE_OPENED_AT)
      // o relevo vem do disco no lugar do servidor, como no useSiteSky.test.js
      vi.stubGlobal('fetch', async (url) => {
        const buffer = await readRelief(new URL(url).pathname.split('/data/relief/')[1])
        return { ok: true, status: 200, arrayBuffer: async () => buffer }
      })

      render(<App />)
      const panelRegion = screen.getByRole('region', { name: app.panel.title })
      expect(within(panelRegion).getByText(panel.empty)).toBeInTheDocument()

      act(() => sceneProps.onSelect(TOP_1))
      // no mesmo render da escolha, e não depois: sem isso, a pessoa clica e nada muda até a conta acabar
      expect(within(panelRegion).getByText(panel.loading)).toBeInTheDocument()

      /* O painel inteiro, número por número, tem que ser o do céu que o motor dá para o ponto na hora
         em que a página abriu. Conferir um número só não bastava: neste ponto o Sol fica à vista o
         período inteiro, e a porcentagem dá 100% também com a data errada; com o céu calculado 6 h
         depois, a altura da Terra muda de -5.0° para -4.8° (revisão do PR #19). */
      const expected = await createSiteSky(readRelief)(TOP_1, PAGE_OPENED_AT.getTime())
      const { container: expectedPanel } = render(<SitePanel status="ready" sky={expected} />)
      await waitFor(() => expect(within(panelRegion).getByRole('status').textContent).toBe(expectedPanel.textContent), WAIT)
    },
    SLOW_TEST_MS,
  )
})

/* O esqueleto da tela: as regiões em que cada frente trabalha existem e têm nome para o leitor de
 * tela, com o título que vem de src/data/app.js. A cena 3D (card C1) e o painel (card I1) ocupam
 * cada um a sua região, e o ponto escolhido na cena chega ao painel pelo useSiteSky (card E11).
 *
 * O jsdom não tem WebGL: as bibliotecas 3D viram substitutos, como em LunarScene.test.jsx. */
import { readFile as readFromDisk } from 'node:fs/promises'
import { join } from 'node:path'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App.jsx'
import { app } from './data/app.js'
import { panel } from './data/panel.js'
import { scene } from './data/scene.js'
import { sites } from './data/sites.js'
import { createSiteSky } from './engine/siteSky.js'
import { SitePanel } from './panel/SitePanel.jsx'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="canvas">{children}</div>,
  useFrame: () => {},
}))
// o Html é o marcador do ponto escolhido (card C3), que aparece quando o teste escolhe um ponto
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null, Html: ({ children }) => <div>{children}</div> }))
vi.mock('./hooks/useFarRelief.js', () => ({ useFarRelief: () => null }))
// o céu de estrelas desenha com WebGL, que o jsdom não tem; as contas dele têm teste próprio
vi.mock('./scene/StarField.jsx', () => ({ StarField: () => null }))

/* A cena de verdade, com o onSelect e a data que o App entrega a ela guardados aqui: o teste
   escolhe o ponto pelo onSelect, como faz o clique na Lua (card C3), e confere a data da luz. O
   clique em si não dá para simular sem WebGL, porque o ponto atingido vem do raio que o three
   lança na malha. */
const sceneProps = vi.hoisted(() => ({ onSelect: null, dateUtc: null }))
vi.mock('./scene/LunarScene.jsx', async (importOriginal) => {
  const { LunarScene } = await importOriginal()
  return {
    LunarScene: (props) => {
      sceneProps.onSelect = props.onSelect
      sceneProps.dateUtc = props.dateUtc
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

async function readRelief(path) {
  const bytes = await readFromDisk(join(RELIEF_DIR, path))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

/* O relógio na hora em que a página abre, e o relevo vindo do disco no lugar do servidor, como no
   useSiteSky.test.js. Só o relógio é falso: os temporizadores continuam de verdade, para o waitFor
   esperar a conta. */
function openPageWithReliefFromDisk() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(PAGE_OPENED_AT)
  vi.stubGlobal('fetch', async (url) => {
    const buffer = await readRelief(new URL(url).pathname.split('/data/relief/')[1])
    return { ok: true, status: 200, arrayBuffer: async () => buffer }
  })
}

// o texto que o painel mostra com o céu que o motor dá para o ponto na data
async function expectedPanelText(site, dateUtc) {
  const expected = await createSiteSky(readRelief)(site, dateUtc.getTime())
  const { container } = render(<SitePanel status="ready" sky={expected} />)
  return container.textContent
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

  it('o rodapé marca o logo feito com IA e linka o código (card E19)', () => {
    render(<App />)
    const rodape = within(screen.getByRole('contentinfo'))
    expect(rodape.getByText(app.credits.ai, { exact: false })).toBeInTheDocument()
    expect(rodape.getByText(app.credits.data, { exact: false })).toBeInTheDocument()
    expect(rodape.getByRole('link', { name: app.credits.source })).toHaveAttribute(
      'href',
      app.credits.sourceUrl,
    )
  })
})

describe('App, o ponto escolhido na cena vai para o painel (card E11)', () => {
  it(
    'o painel passa a calcular e mostra o céu que o motor dá para o ponto na hora em que a página abriu',
    async () => {
      openPageWithReliefFromDisk()
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
      const expected = await expectedPanelText(TOP_1, PAGE_OPENED_AT)
      await waitFor(() => expect(within(panelRegion).getByRole('status').textContent).toBe(expected), WAIT)
    },
  )
})

describe('App, a lista de locais e a data ligadas ao painel e à cena (card E14)', () => {
  const ATHENA = sites.find((site) => site.id === 'im-2')
  // seis dias depois: a luz e o céu do ponto mudam o bastante para o painel mostrar outros números
  const LATER = new Date('2026-11-20T06:00:00Z')

  it(
    'escolher um local na lista mostra no painel o céu dele, e a lista mostra o local escolhido',
    async () => {
      openPageWithReliefFromDisk()
      render(<App />)
      const panelRegion = screen.getByRole('region', { name: app.panel.title })
      const list = within(panelRegion).getByLabelText(panel.siteListLabel)

      // o "loading" no mesmo render da escolha é do useSiteSky e já está provado no teste do E11;
      // aqui a conta pode acabar antes de o userEvent devolver o controle
      await userEvent.selectOptions(list, ATHENA.name)
      expect(list).toHaveDisplayValue(ATHENA.name)

      const expected = await expectedPanelText(ATHENA, PAGE_OPENED_AT)
      await waitFor(() => expect(within(panelRegion).getByRole('status').textContent).toBe(expected), WAIT)
    },
  )

  it(
    'trocar a data refaz a conta do painel e muda a data da luz da cena',
    async () => {
      openPageWithReliefFromDisk()
      render(<App />)
      const panelRegion = screen.getByRole('region', { name: app.panel.title })
      act(() => sceneProps.onSelect(TOP_1))
      const before = await expectedPanelText(TOP_1, PAGE_OPENED_AT)
      await waitFor(() => expect(within(panelRegion).getByRole('status').textContent).toBe(before), WAIT)

      fireEvent.change(within(panelRegion).getByLabelText(panel.dateTimeLabel), {
        target: { value: '2026-11-20T06:00' },
      })
      // no mesmo render da troca: sem isso, o painel mostraria os números da data anterior
      expect(within(panelRegion).getByText(panel.loading)).toBeInTheDocument()
      // a cena e o painel falam do mesmo instante
      expect(sceneProps.dateUtc).toEqual(LATER)

      const after = await expectedPanelText(TOP_1, LATER)
      expect(after).not.toBe(before)
      await waitFor(() => expect(within(panelRegion).getByRole('status').textContent).toBe(after), WAIT)
    },
  )

  it('o clique na Lua depois de escolher na lista volta a lista ao aviso', async () => {
    render(<App />)
    const list = screen.getByLabelText(panel.siteListLabel)
    await userEvent.selectOptions(list, ATHENA.name)
    expect(list).toHaveDisplayValue(ATHENA.name)

    // o ponto clicado não é um local da lista: ela mostraria "Athena" com o painel em outro ponto
    act(() => sceneProps.onSelect(TOP_1))
    expect(list).toHaveDisplayValue(panel.siteListPlaceholder)
  })
})

/* O painel do ponto (card I1): um texto diferente para cada status do useSiteSky. Os números do sky
 * abaixo são inventados para o teste, e não resultado do motor. Os textos vêm de src/data/panel.js,
 * para o teste não repetir o inglês. A suíte roda em Tóquio (vite.config.js): a hora tem que sair
 * em UTC. */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { explain } from '../data/explain.js'
import { panel } from '../data/panel.js'
import { TERRAIN_GRAZE_DEG } from '../engine/config.js'
import { SitePanel } from './SitePanel.jsx'

const sky = {
  // a armadilha do card: abaixo do plano do horizonte e, mesmo assim, à vista
  sunNow: { elevationDeg: -0.84, visible: true },
  earthNow: { elevationDeg: 3.21, visible: false },
  nextSunsetUtc: new Date('2026-11-14T03:00:00Z'),
  // com o Sol à vista agora, o motor não dá a volta dele (summary.js)
  nextSunriseUtc: null,
  sunFraction: 0.855,
  // a Terra escondida agora, que volta e depois se põe
  nextEarthriseUtc: new Date('2026-11-14T07:00:00Z'),
  nextEarthsetUtc: new Date('2026-11-15T10:00:00Z'),
  earthFraction: 0.625,
  longestDarkHours: 36,
  landingWindows: [],
  // o fim é o começo mais 719 h, o último instante que o motor calcula (summary.js)
  period: { startUtc: new Date('2026-11-14T00:00:00Z'), endUtc: new Date('2026-12-13T23:00:00Z') },
  // a vista do horizonte e as notas (C2): um relevo plano de 1° e três horas de Sol e de Terra
  groundView: {
    horizonDeg: Array.from({ length: 360 }, () => 1),
    sun: [
      { azimuthDeg: 10, elevationDeg: 2, visible: true },
      { azimuthDeg: 11, elevationDeg: 1.5, visible: true },
      { azimuthDeg: 12, elevationDeg: 0.5, visible: false },
    ],
    earth: [
      { azimuthDeg: 200, elevationDeg: 0.5, visible: false },
      { azimuthDeg: 200, elevationDeg: 0.6, visible: false },
      { azimuthDeg: 200, elevationDeg: 1.2, visible: true },
    ],
  },
  notes: { earthHiddenByTerrainHours: 161, sunNearTerrainHours: 118, earthNeverAboveHorizon: false },
}

// o Sol escondido agora, que volta antes do pôr do sky acima (card I8)
const darkSky = {
  ...sky,
  sunNow: { elevationDeg: -2.4, visible: false },
  nextSunriseUtc: new Date('2026-11-14T01:00:00Z'),
}

// a Terra à vista agora: o motor não dá a volta dela (summary.js)
const earthUpSky = {
  ...sky,
  earthNow: { elevationDeg: 3.21, visible: true },
  nextEarthriseUtc: null,
}

// o valor que a tela mostra ao lado de um rótulo: o <dd> logo depois do <dt>
const valueOf = (label) => screen.getByText(label).nextElementSibling

describe('SitePanel', () => {
  it('idle: pede para escolher um local', () => {
    render(<SitePanel status="idle" sky={null} />)
    expect(screen.getByRole('status')).toHaveTextContent(panel.empty)
  })

  it('loading: avisa que está calculando, sem os números do ponto anterior', () => {
    render(<SitePanel status="loading" sky={sky} />)
    expect(screen.getByRole('status')).toHaveTextContent(panel.loading)
    expect(screen.queryByText('85.5%')).not.toBeInTheDocument()
  })

  it('error: diz que não deu para calcular o ponto', () => {
    render(<SitePanel status="error" sky={null} />)
    expect(screen.getByRole('status')).toHaveTextContent(panel.error)
  })

  it('ready: mostra o Sol e a Terra agora, com a altura como ela chega', () => {
    render(<SitePanel status="ready" sky={sky} />)
    expect(valueOf(panel.sunNow).textContent).toBe(`${panel.visible} · -0.8°`)
    expect(valueOf(panel.earthNow).textContent).toBe(`${panel.hidden} · 3.2°`)
  })

  it('ready: mostra o começo e o fim do período em UTC', () => {
    render(<SitePanel status="ready" sky={sky} />)
    // em Tóquio seriam 14 Nov, 09:00 e 14 Dec, 08:00
    expect(valueOf(panel.period).textContent).toBe('14 Nov 2026, 00:00 UTC – 13 Dec 2026, 23:00 UTC')
  })

  it('ready: mostra a luz do período e a maior escuridão', () => {
    render(<SitePanel status="ready" sky={sky} />)
    expect(valueOf(panel.sunlight)).toHaveTextContent('85.5%')
    // texto exato: o toHaveTextContent junta espaços repetidos e não pegaria um espaço a mais
    expect(valueOf(panel.longestDark).textContent).toBe(`36 ${panel.hoursUnit}`)
  })

  it('ready: mostra as linhas na ordem do card I8', () => {
    render(<SitePanel status="ready" sky={darkSky} />)
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
      panel.sunNow,
      panel.earthNow,
      panel.period,
      panel.nextSunrise,
      panel.nextSunset,
      panel.sunlight,
      panel.longestDark,
      panel.nextEarthrise,
      panel.nextEarthset,
      panel.earthInView,
      panel.landingWindows,
    ])
  })

  it('ready com o Sol à vista: não mostra o próximo nascer', () => {
    render(<SitePanel status="ready" sky={sky} />)
    expect(screen.queryByText(panel.nextSunrise)).not.toBeInTheDocument()
  })

  it('ready com o Sol escondido que volta: mostra o próximo nascer em UTC', () => {
    render(<SitePanel status="ready" sky={darkSky} />)
    // em Tóquio seriam 10:00
    expect(valueOf(panel.nextSunrise).textContent).toBe('14 Nov 2026, 01:00 UTC')
  })

  it('ready: mostra o próximo pôr do Sol em UTC, e não no fuso de quem usa', () => {
    render(<SitePanel status="ready" sky={sky} />)
    // em Tóquio seriam 12:00
    expect(valueOf(panel.nextSunset)).toHaveTextContent('14 Nov 2026, 03:00 UTC')
  })

  it('ready sem pôr do Sol no período: diz que o Sol não se põe', () => {
    render(<SitePanel status="ready" sky={{ ...sky, nextSunsetUtc: null }} />)
    expect(valueOf(panel.nextSunset)).toHaveTextContent(panel.noSunset)
  })

  it('ready com o Sol escondido o período inteiro: diz isso, e não que o Sol não se põe', () => {
    // o nextSunsetUtc também vem null quando o Sol nunca aparece (revisão do PR #11)
    render(<SitePanel status="ready" sky={{ ...darkSky, nextSunriseUtc: null, nextSunsetUtc: null, sunFraction: 0 }} />)
    expect(valueOf(panel.nextSunset)).toHaveTextContent(panel.sunAlwaysHidden)
  })

  it('ready com o Sol que só raspa o relevo: diz que ele fica escondido, apesar do sunFraction acima de 0', () => {
    // um pedaço do disco aparece em algumas horas, mas nunca a metade que o motor chama de à vista
    render(<SitePanel status="ready" sky={{ ...darkSky, nextSunriseUtc: null, nextSunsetUtc: null, sunFraction: 0.02 }} />)
    expect(valueOf(panel.nextSunset)).toHaveTextContent(panel.sunAlwaysHidden)
  })

  it('ready com o Sol escondido que volta e não se põe mais: diz que o Sol não se põe', () => {
    render(<SitePanel status="ready" sky={{ ...darkSky, nextSunsetUtc: null }} />)
    expect(valueOf(panel.nextSunset)).toHaveTextContent(panel.noSunset)
  })

  it('ready com a Terra escondida que volta: mostra a volta e o pôr dela em UTC', () => {
    render(<SitePanel status="ready" sky={sky} />)
    // em Tóquio seriam 16:00 e 19:00
    expect(valueOf(panel.nextEarthrise).textContent).toBe('14 Nov 2026, 07:00 UTC')
    expect(valueOf(panel.nextEarthset).textContent).toBe('15 Nov 2026, 10:00 UTC')
  })

  it('ready com a Terra à vista: não mostra a volta, e mostra o pôr em UTC', () => {
    render(<SitePanel status="ready" sky={earthUpSky} />)
    expect(screen.queryByText(panel.nextEarthrise)).not.toBeInTheDocument()
    expect(valueOf(panel.nextEarthset).textContent).toBe('15 Nov 2026, 10:00 UTC')
  })

  it('ready com a Terra à vista que não se põe: diz que a Terra não se põe', () => {
    render(<SitePanel status="ready" sky={{ ...earthUpSky, nextEarthsetUtc: null }} />)
    expect(valueOf(panel.nextEarthset)).toHaveTextContent(panel.noEarthset)
  })

  it('ready com a Terra que volta e não se põe mais: diz que a Terra não se põe', () => {
    render(<SitePanel status="ready" sky={{ ...sky, nextEarthsetUtc: null }} />)
    expect(valueOf(panel.nextEarthset)).toHaveTextContent(panel.noEarthset)
  })

  it('ready com a Terra escondida o período inteiro: diz isso, sem a linha da volta', () => {
    render(<SitePanel status="ready" sky={{ ...sky, nextEarthriseUtc: null, nextEarthsetUtc: null, earthFraction: 0 }} />)
    expect(screen.queryByText(panel.nextEarthrise)).not.toBeInTheDocument()
    expect(valueOf(panel.nextEarthset)).toHaveTextContent(panel.earthAlwaysHidden)
  })

  it('ready: mostra quanto do período a Terra fica à vista', () => {
    render(<SitePanel status="ready" sky={sky} />)
    expect(valueOf(panel.earthInView).textContent).toBe('62.5%')
  })

  it('ready sem janela de pouso no período: diz que não há janela', () => {
    render(<SitePanel status="ready" sky={sky} />)
    expect(valueOf(panel.landingWindows)).toHaveTextContent(panel.noWindows)
  })

  it('ready com janelas: duração, início e fim em UTC, e o marcador e o "≥" só na janela cortada pelo período', () => {
    // só uma janela pode estar aberta em cada ponta do período: a do começo e a do fim do sky acima
    const landingWindows = [
      {
        startUtc: new Date('2026-11-14T00:00:00Z'),
        endUtc: new Date('2026-11-14T18:00:00Z'),
        durationHours: 18,
        startsBeforePeriod: true,
        endsAfterPeriod: false,
      },
      {
        startUtc: new Date('2026-11-20T05:00:00Z'),
        endUtc: new Date('2026-11-26T09:00:00Z'),
        durationHours: 148,
        startsBeforePeriod: false,
        endsAfterPeriod: false,
      },
      {
        startUtc: new Date('2026-12-01T10:00:00Z'),
        endUtc: new Date('2026-12-02T16:00:00Z'),
        durationHours: 30,
        startsBeforePeriod: false,
        endsAfterPeriod: false,
      },
      {
        startUtc: new Date('2026-12-13T22:40:00Z'),
        endUtc: new Date('2026-12-13T23:00:00Z'),
        durationHours: 1 / 3,
        startsBeforePeriod: false,
        endsAfterPeriod: true,
      },
    ]
    render(<SitePanel status="ready" sky={{ ...sky, landingWindows }} />)

    const items = within(valueOf(panel.landingWindows)).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      `≥ 18 h · 14 Nov 2026, 00:00 UTC ${panel.alreadyOpen} – 14 Nov 2026, 18:00 UTC`,
      '6 d 4 h · 20 Nov 2026, 05:00 UTC – 26 Nov 2026, 09:00 UTC',
      '1 d 6 h · 1 Dec 2026, 10:00 UTC – 2 Dec 2026, 16:00 UTC',
      `≥ 20 min · 13 Dec 2026, 22:40 UTC – 13 Dec 2026, 23:00 UTC ${panel.continues}`,
    ])
  })

  it('ready: mostra a vista do horizonte como imagem, com um resumo em texto para o leitor de tela', () => {
    render(<SitePanel status="ready" sky={sky} />)
    const vista = screen.getByRole('img', { name: /Horizon view/ })
    expect(vista.getAttribute('aria-label')).toContain('the Sun is in view for 2 hours and the Earth for 1 hours')
  })

  it('ready: as notas trazem o número que o motor decidiu, e a do lado oculto troca a da montanha', () => {
    const { rerender } = render(<SitePanel status="ready" sky={sky} />)
    expect(screen.getByText(explain.notes.earthHidden(161))).toBeInTheDocument()
    expect(screen.getByText(explain.notes.sunNear(118, TERRAIN_GRAZE_DEG))).toBeInTheDocument()
    rerender(<SitePanel status="ready" sky={{ ...sky, notes: { ...sky.notes, earthNeverAboveHorizon: true } }} />)
    expect(screen.getByText(explain.notes.earthNever)).toBeInTheDocument()
    expect(screen.queryByText(explain.notes.earthHidden(161))).toBeNull()
  })
})


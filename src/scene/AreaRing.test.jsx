/* A linha dos 84°S na cena (card C8): o que o componente entrega à faixa do Drei. O jsdom não tem
 * WebGL, então a faixa vira um substituto; que a linha aparece inteira, de longe e de perto, se
 * confere no navegador (docs/backlog.md, C6, sétima rodada). */
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AreaRing } from './AreaRing.jsx'
import { AREA_RING_WIDTH_PX } from './areaRing.js'

const faixa = vi.fn()
vi.mock('@react-three/drei', () => ({
  Line: (props) => {
    faixa(props)
    return null
  },
}))
// três pontos bastam: a conta dos pontos tem teste próprio (areaRing.test.js)
vi.mock('./areaRing.js', async (importOriginal) => ({
  ...(await importOriginal()),
  buildAreaRing: () => new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
}))

describe('AreaRing', () => {
  beforeEach(() => {
    faixa.mockClear()
  })

  it('desenha a volta fechada como uma faixa de 1,5 pixel, que de longe não some aos pedaços', () => {
    /* Sem o antisserrilhado (LunarScene.jsx), a linha comum do three sumia aos pedaços de longe:
       cada um dos 720 pedaços ficava com uns 0,2 pixel, e a placa de vídeo não pinta pedaço de
       linha menor que um pixel. Com 1 pixel de largura, a faixa ainda deixava buracos (13/11). */
    render(<AreaRing relief={{}} color="#929bab" />)
    const props = faixa.mock.calls.at(-1)[0]
    expect(props.lineWidth).toBe(AREA_RING_WIDTH_PX)
    expect(AREA_RING_WIDTH_PX).toBeGreaterThanOrEqual(1.5)
    expect(props.points).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0])
    expect(props.color).toBe('#929bab')
  })

  it('não entra no clique: um clique em cima da linha escolhe o relevo embaixo dela', () => {
    // acertando a linha, o React Three Fiber não chamaria o clique da Lua (o mesmo motivo do C8)
    render(<AreaRing relief={{}} color="#929bab" />)
    const { raycast } = faixa.mock.calls.at(-1)[0]
    expect(raycast).toBeTypeOf('function')
    const hits = []
    raycast({}, hits)
    expect(hits).toEqual([])
  })
})

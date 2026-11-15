import { SphereGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { sites } from '../data/sites.js'
import { latLonToScene, sceneToLatLon } from './coordinates.js'
import { MOON_TEXTURE_SIZE, equirectPixel, sceneToEquirectUv } from './moonSurface.js'

/* As imagens do globo (C3) são equirretangulares centradas na longitude 0: a coluna 0 é −180°, a
   linha 0 é o polo norte. Se a textura entrasse girada ou espelhada, o Sol iluminaria uma cratera e
   a imagem mostraria outra. */
describe('a textura do globo cai no lugar certo da Lua (C3)', () => {
  it('o uv da SphereGeometry do three é o mesmo da conta, em cada vértice', () => {
    const sphere = new SphereGeometry(1, 32, 16)
    const position = sphere.getAttribute('position')
    const uv = sphere.getAttribute('uv')
    let checked = 0
    for (let i = 0; i < position.count; i++) {
      const p = [position.getX(i), position.getY(i), position.getZ(i)]
      const { lat } = sceneToLatLon(p)
      // no polo e na costura da longitude ±180° o u não tem um valor só
      if (Math.abs(lat) > 85) continue
      const [u, v] = sceneToEquirectUv(p)
      if (Math.abs(u - uv.getX(i)) > 0.5) continue
      expect(u).toBeCloseTo(uv.getX(i), 6)
      expect(v).toBeCloseTo(uv.getY(i), 6)
      checked++
    }
    expect(checked).toBeGreaterThan(300)
  })

  it('pontos conhecidos caem no pixel esperado da imagem de 4096 × 2048', () => {
    expect(MOON_TEXTURE_SIZE).toEqual({ width: 4096, height: 2048 })
    // longitude 0 e equador: o centro da imagem
    expect(equirectPixel(latLonToScene(0, 0))).toEqual({ column: 2048, row: 1024 })
    // 90° leste fica a três quartos da largura; 90° oeste, a um quarto
    expect(equirectPixel(latLonToScene(0, 90)).column).toBe(3072)
    expect(equirectPixel(latLonToScene(0, -90)).column).toBe(1024)
  })

  it('o pouso do IM-2 cai perto do polo sul, na coluna da longitude dele', () => {
    const im2 = sites.find((site) => site.id === 'im-2')
    const { column, row } = equirectPixel(latLonToScene(im2.lat, im2.lon))
    expect(column).toBe(Math.floor(((im2.lon + 180) / 360) * 4096))
    expect(row).toBe(Math.floor(((90 - im2.lat) / 180) * 2048))
    // abaixo de 80°S: as últimas linhas da imagem
    expect(row).toBeGreaterThan(1934)
  })
})

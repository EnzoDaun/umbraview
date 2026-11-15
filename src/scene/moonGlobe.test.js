// @vitest-environment node
import { MeshStandardMaterial, SphereGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { sites } from '../data/sites.js'
import { latLonToUnit, unitToPolarXY } from '../engine/geometry.js'
import { latLonToScene } from './coordinates.js'
import {
  applySouthColor, globeTextureUv, globeTextureWindow, landingUniforms, setLandingMask, southColorUv, southColorUniforms,
} from './moonGlobe.js'

const FAR = { x0: -384960, y0: 384960, columns: 802, rows: 802, resolutionM: 960 }

describe('a cor da Lua inteira na esfera da cena', () => {
  it('a esfera do three põe cada latitude e longitude no ponto da imagem em que a NASA pôs', () => {
    // a esfera inteira, como a cena monta: o three dá a cada vértice a posição e o ponto da imagem
    const esfera = new SphereGeometry(1, 72, 36)
    const posicao = esfera.getAttribute('position')
    const uv = esfera.getAttribute('uv')
    const im2 = sites.find((site) => site.id === 'im-2')
    for (const [lat, lon] of [[im2.lat, im2.lon], [0, 0], [26.13, 3.63], [-43.3, -11.2], [60, 175], [10, -120]]) {
      const [u, v] = globeTextureUv(lat, lon)
      const alvo = latLonToScene(lat, lon)
      // o vértice da esfera mais perto do ponto: o ponto da imagem dele é o do ponto, a menos de um passo da malha
      let melhor = 0
      let menor = Infinity
      for (let i = 0; i < posicao.count; i++) {
        const d = Math.hypot(posicao.getX(i) - alvo[0], posicao.getY(i) - alvo[1], posicao.getZ(i) - alvo[2])
        if (d < menor) [menor, melhor] = [d, i]
      }
      expect(Math.abs(uv.getX(melhor) - u)).toBeLessThan(1 / 72)
      expect(Math.abs(uv.getY(melhor) - v)).toBeLessThan(1 / 36)
    }
  })

  it('a longitude 0° fica no meio da imagem, o leste à direita e o norte em cima', () => {
    expect(globeTextureUv(0, 0)).toEqual([0.5, 0.5])
    expect(globeTextureUv(0, 90)[0]).toBeCloseTo(0.75, 12)
    expect(globeTextureUv(90, 0)[1]).toBe(1)
  })

  it('a esfera aberta no polo sul usa só o pedaço de cima da imagem', () => {
    // inteira: a imagem toda
    expect(globeTextureWindow(Math.PI)).toEqual({ repeatY: 1, offsetY: 0 })
    // parando a 12° do polo sul: a borda de baixo da esfera cai na latitude −78°, e não no fim da imagem
    const { repeatY, offsetY } = globeTextureWindow(Math.PI * (168 / 180))
    expect(offsetY).toBeCloseTo(globeTextureUv(-78, 0)[1], 12)
    expect(offsetY + repeatY).toBeCloseTo(1, 12)
  })
})

describe('a cor do polo sul nas malhas do relevo', () => {
  it('o ponto da imagem polar é o pixel da grade do relevo grosso onde o ponto cai', () => {
    const lado = FAR.columns * FAR.resolutionM
    for (const [lat, lon] of [[-90, 0], [-85, 30], [-80, -140], [-84.79, 29.2]]) {
      const [px, py] = unitToPolarXY(latLonToUnit(lat, lon))
      const [u, v] = southColorUv(latLonToScene(lat, lon), FAR)
      expect(u).toBeCloseTo((px - FAR.x0) / lado, 9)
      // o v do three cresce para cima, e a linha 0 da imagem é a de cima
      expect(v).toBeCloseTo(1 - (FAR.y0 - py) / lado, 9)
    }
    // o polo fica no meio da imagem
    const [u, v] = southColorUv(latLonToScene(-90, 0), FAR)
    expect(u).toBeCloseTo(0.5, 9)
    expect(v).toBeCloseTo(0.5, 9)
  })

  it('o material do relevo ganha a cor polar no shader, com os mesmos uniformes para todas as malhas', () => {
    const material = applySouthColor(new MeshStandardMaterial())
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}',
      fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\n}',
    }
    material.onBeforeCompile(shader)
    expect(shader.uniforms.uSouthColor).toBe(southColorUniforms.uSouthColor)
    expect(shader.uniforms.uSouthColorMix).toBe(southColorUniforms.uSouthColorMix)
    expect(shader.vertexShader).toContain('vSouthPosition =')
    expect(shader.fragmentShader).toContain('texture2D(uSouthColor')
    // sem a imagem carregada, a mistura é zero: o relevo fica com a cor lisa, e não preto
    expect(southColorUniforms.uSouthColorMix.value).toBe(0)
  })

  it('o mapa das áreas de pouso entra no mesmo shader, desligado até a máscara chegar', () => {
    const material = applySouthColor(new MeshStandardMaterial())
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}',
      fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\n}',
    }
    material.onBeforeCompile(shader)
    expect(shader.uniforms.uLandingMask).toBe(landingUniforms.uLandingMask)
    expect(shader.fragmentShader).toContain('texture2D(uLandingMask')
    expect(landingUniforms.uLandingStrength.value).toBe(0)

    const mascara = { nome: 'textura' }
    setLandingMask(mascara, { x0: -185000, y0: 185000, columns: 74, stepM: 5000 }, [0.2, 0.8, 0.5])
    expect(landingUniforms.uLandingMask.value).toBe(mascara)
    expect(landingUniforms.uLandingStrength.value).toBe(1)
    // a grade de 74 quadrados de 5 km tem 370 km de lado, em raios da Lua
    expect(landingUniforms.uLandingFrame.value[2]).toBeCloseTo(370000 / 1737400, 12)
    setLandingMask(null)
    expect(landingUniforms.uLandingStrength.value).toBe(0)
  })
})

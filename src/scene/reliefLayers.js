/* Quem aparece por cima de quem entre as malhas do relevo (card C6): o centro do relevo fino
 * (400 m), o anel do relevo fino (800 m) e o relevo grosso (1,9 km).
 *
 * As três desenham a mesma Lua, em detalhes diferentes. Onde uma fica em cima da outra, a de mais
 * detalhe tem que aparecer, mesmo que a outra esteja um pouco mais alta: numa cratera, o grosso
 * fica acima do fundo que o fino vê. Só a profundidade não resolve: na emenda, o grosso mais alto
 * furava o fino em degraus (visto pelo Marco no npm run dev, em 12/11/2026). O estêncil resolve:
 * cada malha do fino marca os pixels que desenhou, e quem vem depois não pinta pixel marcado. A
 * ordem de desenho é a do renderOrder: o centro, o anel, o grosso. O clique segue a mesma regra
 * (visibleHit).
 *
 * Isso só é certo porque a câmera olha sempre para o ponto embaixo dela, e o fino fica em volta
 * desse ponto: o terreno de fora não fica de fato na frente do de dentro. Conferido nos dados
 * numa revisão do desenho, em 12/11/2026: com bloco incompleto (na borda da grade ou com um
 * ladrilho que falhou), o grosso de fora só fica na frente do fino em 0,05% a 0,3% dos pontos,
 * nas quinas da tela. O estêncil precisa existir na tela do WebGL: o <Canvas> pede com
 * gl={{ stencil: true }} (LunarScene.jsx).
 */
import {
  AlwaysStencilFunc,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  ObjectSpaceNormalMap,
  ReplaceStencilOp,
  RGBAFormat,
} from 'three'

import { applyEquirectColor } from './moonSurface.js'

// o valor que o fino grava nos pixels dele
const FINE = 1

/* O que vai em cada malha: o renderOrder e o userData na <mesh>, e o material com o resto. Num
   material do three, stencilWrite liga o teste do estêncil, e as operações dizem o que gravar. O
   userData diz ao clique de que camada é a malha. */
export const CENTER_LAYER = {
  renderOrder: 0,
  userData: { reliefLayer: 'center' },
  material: { stencilWrite: true, stencilRef: FINE, stencilFunc: AlwaysStencilFunc, stencilZPass: ReplaceStencilOp },
}

export const RING_LAYER = {
  renderOrder: 1,
  userData: { reliefLayer: 'ring' },
  material: { stencilWrite: true, stencilRef: FINE, stencilFunc: NotEqualStencilFunc, stencilZPass: ReplaceStencilOp },
}

// o grosso só confere, sem gravar nada: ninguém vem depois dele
export const COARSE_LAYER = {
  renderOrder: 2,
  userData: { reliefLayer: 'coarse' },
  material: { stencilWrite: true, stencilRef: FINE, stencilFunc: NotEqualStencilFunc },
}

const LAYERS_IN_ORDER = [CENTER_LAYER, RING_LAYER, COARSE_LAYER].sort((a, b) => a.renderOrder - b.renderOrder)

/* O material de uma malha da camada, com a cor da Lua: todas as malhas do relevo passam por aqui,
   para nenhuma ficar sem o estêncil. normalMap: o mapa de normais do ladrilho (createNormalTexture),
   para os ladrilhos do relevo fino. As normais dele estão no espaço do objeto, que é o da cena: a
   malha do ladrilho não tem posição nem giro próprios. colorMap: a imagem de cor do globo (C3,
   moonSurface.js), para o relevo ter a mesma cor da esfera em volta dele. */
export function createLayerMaterial(layer, color, { normalMap = null, colorMap = null } = {}) {
  const material = new MeshStandardMaterial({ color, ...layer.material })
  if (colorMap) applyEquirectColor(material, colorMap)
  if (normalMap) {
    material.normalMap = normalMap
    material.normalMapType = ObjectSpaceNormalMap
  }
  return material
}

// o 1 em meio-float, o quarto canal da textura, que não é usado
const HALF_ONE = DataUtils.toHalfFloat(1)

/* A textura do mapa de normais de um ladrilho (buildNormalMap, em reliefMesh.js), em meio-float.
   Com 8 bits por canal, a normal erraria uns 0,2°, e com o Sol a 1,5° do horizonte isso dá até 15%
   de brilho a mais ou a menos no chão plano, em manchas. O meio-float erra uns 0,03° (2% de brilho
   no mesmo caso), e o WebGL 2 garante o filtro suave para ele (o float de 32 bits depende de uma
   extensão).
   A normal vai como n × 0,5 + 0,5, de 0 a 1: o shader do three lê o mapa como cor × 2 − 1. */
export function createNormalTexture({ normals, width, height }) {
  const data = new Uint16Array(width * height * 4)
  for (let i = 0, j = 0; i < normals.length; i += 3, j += 4) {
    data[j] = DataUtils.toHalfFloat(normals[i] * 0.5 + 0.5)
    data[j + 1] = DataUtils.toHalfFloat(normals[i + 1] * 0.5 + 0.5)
    data[j + 2] = DataUtils.toHalfFloat(normals[i + 2] * 0.5 + 0.5)
    data[j + 3] = HALF_ONE
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, HalfFloatType)
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

/* O acerto do clique que a pessoa vê. intersections: os acertos do raio, do mais perto para o mais
   longe (o React Three Fiber já ordena). A tela mostra o centro onde ele está no raio, senão o
   anel, senão o grosso, mesmo que outra malha esteja mais perto (o estêncil, acima): o clique fica
   com o mesmo. Escolher só o mais perto acertaria o grosso ou o anel escondidos embaixo do fino, a
   até uns 600 m de onde a pessoa clicou (medido nos dados numa revisão do desenho, em 12/11/2026).
   Sem relevo no raio (a esfera lisa), fica o mais perto. */
export function visibleHit(intersections) {
  for (const layer of LAYERS_IN_ORDER) {
    const hit = intersections.find((candidate) => candidate.object.userData.reliefLayer === layer.userData.reliefLayer)
    if (hit) return hit
  }
  return intersections[0] ?? null
}

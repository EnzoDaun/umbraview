/* A cor da Lua inteira na cena: onde cada ponto da Lua cai nas imagens de public/data/moon/
 * (geradas por scripts/prepare-data/prepare_moon_global.py), e a cor do polo sul nas malhas do
 * relevo. As contas não conhecem o React, para serem testadas no Node.
 *
 * São duas imagens da mesma cor. A esfera usa a de latitude e longitude (color.jpg). As malhas do
 * relevo do polo usam a da projeção polar (color-south.jpg), porque na de latitude e longitude o
 * polo é um ponto esticado numa linha inteira da imagem, e a cor sairia em raios em volta dele.
 */
import { MOON_RADIUS_M } from '../engine/geometry.js'

/* O ponto da imagem color.jpg (e do mapa de normais) de uma latitude e longitude, em graus: u de 0
   (180° oeste) a 1 (180° leste), v de 0 (polo sul) a 1 (polo norte). É a mesma conta que a
   sphereGeometry do three faz para os vértices dela, com os eixos da cena (coordinates.js): o teste
   confere, e por isso a esfera não precisa de geometria própria. */
export function globeTextureUv(latDeg, lonDeg) {
  return [(lonDeg + 180) / 360, (latDeg + 90) / 180]
}

/* A esfera lisa é aberta no polo sul, onde entra a malha do relevo (thetaLength, em reliefMesh.js),
   e o three espalha a imagem inteira pela parte que sobra. Estes dois números fazem a esfera usar
   só o pedaço de cima da imagem: o repeat e o offset em y da textura. */
export function globeTextureWindow(thetaLength) {
  const repeatY = thetaLength / Math.PI
  return { repeatY, offsetY: 1 - repeatY }
}

/* O ponto da imagem color-south.jpg de um ponto da cena ([x, y, z], de qualquer tamanho). far: o
   campo far do manifest.json do relevo; a imagem cobre exatamente a grade dele. É a conta que o
   shader das malhas faz (applySouthColor), escrita aqui para ter teste. */
export function southColorUv([x, y, z], far) {
  const length = Math.hypot(x, y, z)
  // cena → motor: (x, −z, y); depois a projeção polar de geometry.js, em metros
  const k = (2 * MOON_RADIUS_M) / (1 - y / length)
  const px = (k * -z) / length
  const py = (k * x) / length
  const side = far.columns * far.resolutionM
  return [(px - far.x0) / side, 1 - (far.y0 - py) / side]
}

/* Os uniformes da cor polar, os mesmos objetos para todas as malhas do relevo: quando a imagem
   chega, trocar o valor aqui muda todas de uma vez. uSouthColorMix em 0 deixa a cor lisa do
   material, que é como o relevo aparece enquanto a imagem baixa (ou se ela não chegar).
   uSouthColorFrame: a borda esquerda e a de cima da grade e o lado dela, em raios da Lua. */
export const southColorUniforms = {
  uSouthColor: { value: null },
  uSouthColorMix: { value: 0 },
  uSouthColorFrame: { value: [0, 0, 1] },
}

/* Liga a cor polar: texture é a textura do three com a color-south.jpg, far é o campo far do
   manifesto do relevo. Com null, desliga. Quem chama pede o quadro novo à cena. */
export function setSouthColor(texture, far) {
  southColorUniforms.uSouthColor.value = texture
  southColorUniforms.uSouthColorMix.value = texture ? 1 : 0
  if (far) {
    southColorUniforms.uSouthColorFrame.value = [
      far.x0 / MOON_RADIUS_M,
      far.y0 / MOON_RADIUS_M,
      (far.columns * far.resolutionM) / MOON_RADIUS_M,
    ]
  }
}

/* Faz o material de uma malha do relevo ler a cor da imagem polar, no lugar da cor lisa. A posição
   usada é a do vértice na cena, e a conta é a de southColorUv. Devolve o próprio material. */
export function applySouthColor(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, southColorUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSouthPosition;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSouthPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uSouthColor;
uniform float uSouthColorMix;
uniform vec3 uSouthColorFrame;
varying vec3 vSouthPosition;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  vec3 southUnit = normalize(vSouthPosition);
  float southK = 2.0 / (1.0 - southUnit.y);
  vec2 southPolar = vec2(southK * -southUnit.z, southK * southUnit.x);
  vec2 southUv = vec2(
    (southPolar.x - uSouthColorFrame.x) / uSouthColorFrame.z,
    1.0 - (uSouthColorFrame.y - southPolar.y) / uSouthColorFrame.z
  );
  diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uSouthColor, southUv).rgb, uSouthColorMix);
}`,
      )
  }
  return material
}

/* A cor da Lua inteira (C3): a imagem do CGI Moon Kit da NASA (SVS 4720), gerada por
 * scripts/prepare-data/prepare_moon_global.py em public/data/moon/.
 *
 * A imagem é equirretangular centrada na longitude 0, a mesma convenção do uv da SphereGeometry do
 * three: a esfera usa o uv dela. O relevo do polo (ReliefCap e NearRelief) não tem uv, e por isso
 * calcula o mesmo uv pixel a pixel, a partir da posição (equirectMapPatch). Sem a cor também no
 * relevo, a borda dele seria uma faixa cinza lisa no meio da Lua colorida.
 */

export const MOON_TEXTURE_SIZE = Object.freeze({ width: 4096, height: 2048 })

export const MOON_COLOR_URL = 'data/moon/color.jpg'
export const MOON_NORMAL_URL = 'data/moon/normal.png'

/* Ponto da cena (de qualquer tamanho) para o uv da imagem, de 0 a 1: u cresce com a longitude a
   partir de −180°, v com a latitude a partir do polo sul (o three vira a imagem: v = 1 é a linha 0). */
export function sceneToEquirectUv([x, y, z]) {
  const length = Math.hypot(x, y, z)
  const u = Math.atan2(-z, x) / (2 * Math.PI) + 0.5
  const v = Math.asin(Math.min(1, Math.max(-1, y / length))) / Math.PI + 0.5
  return [u, v]
}

/* O pixel da imagem embaixo de um ponto da cena: coluna e linha, a partir do canto de cima à esquerda. */
export function equirectPixel(point) {
  const [u, v] = sceneToEquirectUv(point)
  const { width, height } = MOON_TEXTURE_SIZE
  return {
    column: Math.min(width - 1, Math.floor(u * width)),
    row: Math.min(height - 1, Math.floor((1 - v) * height)),
  }
}

/* O mesmo uv, no shader, para o relevo do polo. A derivada do u pula de 1 para 0 na longitude
   ±180°, e o navegador leria a menor versão da imagem numa linha de pixels: o u2 é o mesmo u
   com a costura do outro lado, e vale a derivada menor dos dois. */
const UV_GLSL = /* glsl */ `
  vec3 moonDir = normalize(vMoonPosition);
  float moonU = atan(-moonDir.z, moonDir.x) / (2.0 * PI) + 0.5;
  float moonV = asin(clamp(moonDir.y, -1.0, 1.0)) / PI + 0.5;
  float moonU2 = fract(moonU + 0.5);
  vec2 moonDx = vec2(dFdx(moonU), dFdx(moonV));
  vec2 moonDy = vec2(dFdy(moonU), dFdy(moonV));
  float moonDx2 = dFdx(moonU2);
  float moonDy2 = dFdy(moonU2);
  if (abs(moonDx2) < abs(moonDx.x)) moonDx.x = moonDx2;
  if (abs(moonDy2) < abs(moonDy.x)) moonDy.x = moonDy2;
  diffuseColor *= textureGrad(moonColorMap, vec2(moonU, moonV), moonDx, moonDy);
`

/* Liga a imagem de cor num MeshStandardMaterial cuja malha não tem uv. A posição usada é a do
   objeto, que no relevo é a da cena: as malhas dele não têm posição nem giro próprios. */
export function applyEquirectColor(material, texture) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.moonColorMap = { value: texture }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMoonPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMoonPosition = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMoonPosition;\nuniform sampler2D moonColorMap;')
      .replace('#include <map_fragment>', UV_GLSL)
  }
  // o three guarda o shader compilado por esta chave: sem ela, o material com e sem a cor
  // dividiriam o mesmo programa
  material.customProgramCacheKey = () => 'moon-equirect-color'
  material.needsUpdate = true
}

/* A distância da câmera para a Lua inteira caber na região da cena (item 1 do v4). Com a distância
 * fixa de antes, numa região larga e baixa, ou no celular em pé, a borda da Lua saía da tela.
 *
 * Conta pela proporção da região (largura / altura): o eixo mais apertado manda. A Lua tem raio 1.
 */

// o campo de visão vertical da câmera, em graus: o padrão do React Three Fiber, escrito aqui para
// a conta e a câmera não se desencontrarem
export const CAMERA_FOV_DEG = 75

// quanto do meio campo de visão a Lua ocupa: sobra uma margem para o marcador e o anel
export const FRAME_FILL = 0.86

export function fitDistance(aspect, fovDeg = CAMERA_FOV_DEG, fill = FRAME_FILL) {
  const vertical = ((fovDeg / 2) * Math.PI) / 180
  const horizontal = Math.atan(Math.tan(vertical) * aspect)
  return 1 / Math.sin(Math.min(vertical, horizontal) * fill)
}

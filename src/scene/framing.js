/* O enquadramento da Lua: a que distância a câmera fica para a Lua inteira caber na cena, em
 * qualquer formato de tela. Só a conta, sem o three, para ser testada no Node.
 */
const DEG = Math.PI / 180

/* fovDeg: o campo de visão vertical da câmera, em graus. aspect: largura dividida pela altura da
   cena. fill: quanto da menor das duas medidas a Lua ocupa (0,8 deixa 10% de céu de cada lado).
   Devolve a distância do centro da Lua, em raios dela. Numa tela em pé, quem limita é a largura:
   o campo de visão horizontal é menor que o vertical, e a câmera precisa ficar mais longe. */
export function fitDistance({ fovDeg, aspect, fill }) {
  const halfVertical = (fovDeg / 2) * DEG
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect)
  return 1 / Math.sin(Math.min(halfVertical, halfHorizontal) * fill)
}

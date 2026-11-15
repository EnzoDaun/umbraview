/* O enquadramento da Lua: a que distância a câmera fica para a Lua inteira caber na cena, em
 * qualquer formato de tela, e o caminho dela até o ponto escolhido. Só as contas, sem o three,
 * para serem testadas no Node.
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

/* A curva do tempo do voo: sai devagar, corre no meio e chega devagar (um cúbico de entrada e
   saída). t de 0 a 1. */
export function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/* Onde a câmera está no instante t (de 0 a 1) do voo de from até to, os dois [x, y, z] na cena, a
   partir do centro da Lua. A direção gira pelo arco mais curto e a distância muda em linha reta:
   assim a câmera dá a volta por fora da Lua. Uma linha reta entre os dois pontos passaria por
   dentro dela quando o ponto escolhido está do outro lado. */
export function flyPosition(from, to, t) {
  const fromLength = Math.hypot(...from)
  const toLength = Math.hypot(...to)
  const a = from.map((v) => v / fromLength)
  const b = to.map((v) => v / toLength)
  const cos = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const angle = Math.acos(cos)
  let direction
  if (angle < 1e-6) {
    direction = b
  } else if (Math.PI - angle < 1e-6) {
    // exatamente do outro lado: todo arco serve; escolhe o que passa por uma direção de lado
    const side = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    const dot = side[0] * a[0] + side[1] * a[1] + side[2] * a[2]
    const perpendicular = side.map((v, i) => v - dot * a[i])
    const length = Math.hypot(...perpendicular)
    direction = a.map((v, i) => v * Math.cos(angle * t) + (perpendicular[i] / length) * Math.sin(angle * t))
  } else {
    const sin = Math.sin(angle)
    const wa = Math.sin((1 - t) * angle) / sin
    const wb = Math.sin(t * angle) / sin
    direction = a.map((v, i) => v * wa + b[i] * wb)
  }
  const distance = fromLength + (toLength - fromLength) * t
  return direction.map((v) => v * distance)
}

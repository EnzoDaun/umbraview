/* O desenho da vista do horizonte (item 2): o groundView do motor (summary.js) virando linhas de um
 * SVG de 360°. Não calcula astronomia: só põe na escala o azimute e a elevação que chegam prontos.
 *
 * x: o azimute, de 0 (norte) a 360, crescendo para o leste, como a pessoa gira no lugar.
 * y: a elevação, para cima, numa escala que cobre o relevo e os dois astros.
 */

// o tamanho do desenho, em unidades do viewBox; o SVG estica para a largura do painel
export const CHART = Object.freeze({ width: 360, height: 120 })

// a margem acima e abaixo do que precisa aparecer, em graus
const PAD_DEG = 1

/* Corta o caminho hora a hora em trechos: um novo onde o astro muda entre à vista e escondido, e um
   novo onde ele passa de 359° para 0° (ou volta), que sem isso riscaria a vista de ponta a ponta. */
function segments(path, xOf, yOf) {
  const out = []
  let current = null
  for (let i = 0; i < path.length; i++) {
    const p = path[i]
    const point = [xOf(p.azimuthDeg), yOf(p.elevationDeg)]
    const previous = path[i - 1]
    const wraps = previous && Math.abs(p.azimuthDeg - previous.azimuthDeg) > 180
    if (!current || wraps || current.visible !== p.visible) {
      const next = { visible: p.visible, points: [] }
      // o trecho novo começa no último ponto do anterior, para a linha não ter buraco na troca
      if (current && !wraps) next.points.push(current.points[current.points.length - 1])
      out.push(next)
      current = next
    }
    current.points.push(point)
  }
  return out
}

export function horizonChartModel({ horizonDeg, sun, earth }) {
  const all = [...horizonDeg, ...sun.map((p) => p.elevationDeg), ...earth.map((p) => p.elevationDeg), 0]
  const minDeg = Math.floor(Math.min(...all) - PAD_DEG)
  const maxDeg = Math.ceil(Math.max(...all) + PAD_DEG)
  const xOf = (azimuthDeg) => (azimuthDeg / 360) * CHART.width
  const yOf = (deg) => CHART.height - ((deg - minDeg) / (maxDeg - minDeg)) * CHART.height

  // o relevo como área: do canto de baixo, pelo contorno grau a grau, até o 360 (o mesmo 0°)
  const line = horizonDeg.map((deg, a) => `L${xOf(a)} ${yOf(deg).toFixed(2)}`).join(' ')
  const terrainPath = `M0 ${CHART.height} ${line} L${CHART.width} ${yOf(horizonDeg[0]).toFixed(2)} L${CHART.width} ${CHART.height} Z`

  let highest = 0
  for (let a = 1; a < horizonDeg.length; a++) if (horizonDeg[a] > horizonDeg[highest]) highest = a

  return {
    minDeg,
    maxDeg,
    yOf,
    terrainPath,
    flatY: yOf(0),
    sunSegments: segments(sun, xOf, yOf),
    earthSegments: segments(earth, xOf, yOf),
    now: {
      sun: sun.length ? [xOf(sun[0].azimuthDeg), yOf(sun[0].elevationDeg)] : null,
      earth: earth.length ? [xOf(earth[0].azimuthDeg), yOf(earth[0].elevationDeg)] : null,
    },
    sunVisibleHours: sun.filter((p) => p.visible).length,
    earthVisibleHours: earth.filter((p) => p.visible).length,
    totalHours: sun.length,
    highestTerrain: { elevationDeg: horizonDeg[highest], azimuthDeg: highest },
  }
}

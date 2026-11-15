/* Os arquivos da grade de pouso (public/data/landing-grid/, gerados por
 * scripts/prepare-data/prepare-landing-grid.mjs) no formato que landingAreas.js usa.
 *
 * Como em reliefFiles.js, quem lê os arquivos é a função readFile(caminho), que chega de fora e
 * devolve uma Promise de ArrayBuffer: no site, com fetch, dentro de um Worker; nos testes, do disco.
 */
import { polarXYToUnit } from './geometry.js'
import { GRID_DIRECTIONS, globalGridPoints, globalGridVectors } from './landingAreas.js'

/* Devolve { horizons, points, layout }: os horizontes (um byte por direção), o vetor de tamanho 1
   de cada ponto, e o desenho da grade (stepM, x0, y0, columns, rows, cells), para a cena saber onde
   pintar cada ponto. O tamanho do arquivo é conferido: um download cortado, ou uma página de erro
   servida no lugar dele, viraria horizontes errados. */
export async function loadLandingGrid(readFile) {
  const manifest = JSON.parse(new TextDecoder().decode(await readFile('manifest.json')))
  const layout = manifest.polar
  const buffer = await readFile(layout.file)
  if (buffer.byteLength !== layout.points * GRID_DIRECTIONS) {
    throw new Error(`a grade de pouso ${layout.file} veio com ${buffer.byteLength} bytes, e não ${layout.points * GRID_DIRECTIONS}`)
  }
  const points = new Float64Array(layout.points * 3)
  for (let i = 0; i < layout.points; i++) {
    const column = layout.cells[2 * i]
    const row = layout.cells[2 * i + 1]
    // o centro do quadrado da grade, na projeção polar (a linha 0 é a de cima, a de y maior)
    points.set(polarXYToUnit(layout.x0 + (column + 0.5) * layout.stepM, layout.y0 - (row + 0.5) * layout.stepM), 3 * i)
  }
  return { horizons: new Uint8Array(buffer), points, layout, global: await loadGlobalGrid(manifest.global, readFile) }
}

/* A grade da Lua inteira, ou null se o manifesto não tem uma. A posição de cada ponto sai de
   globalGridPoints, a mesma função que o script usou: o arquivo só traz os horizontes. layout:
   { stepDeg, gridPoints }, para a cena saber onde pintar cada ponto. */
async function loadGlobalGrid(description, readFile) {
  if (!description) return null
  const gridPoints = globalGridPoints(description.stepDeg, description.polarMaxLatDeg)
  const buffer = await readFile(description.file)
  if (description.points !== gridPoints.length || buffer.byteLength !== gridPoints.length * GRID_DIRECTIONS) {
    throw new Error(`a grade de pouso ${description.file} veio com ${buffer.byteLength} bytes, e não ${gridPoints.length * GRID_DIRECTIONS}`)
  }
  return {
    horizons: new Uint8Array(buffer),
    points: globalGridVectors(gridPoints),
    layout: { stepDeg: description.stepDeg, gridPoints },
  }
}

/* A máscara do mapa: um byte por quadrado da grade inteira (columns × rows), 255 onde o ponto tem
   janela de pouso e 0 no resto. flags: o resultado de evaluateLandingGrid, na ordem do arquivo. A
   linha 0 da máscara é a de baixo, que é como a placa de vídeo guarda uma textura: assim a cena lê
   a máscara com a mesma conta da cor do polo (moonGlobe.js). */
export function landingMask(layout, flags) {
  const mask = new Uint8Array(layout.columns * layout.rows)
  for (let i = 0; i < flags.length; i++) {
    if (!flags[i]) continue
    const column = layout.cells[2 * i]
    const row = layout.cells[2 * i + 1]
    mask[(layout.rows - 1 - row) * layout.columns + column] = 255
  }
  return mask
}

/* A máscara do mapa da Lua inteira, na projeção de latitude e longitude: um byte por quadrado de
   stepDeg × stepDeg graus, com a longitude 0° na coluna 0, crescendo para o leste, e o polo sul na
   linha 0 (a de baixo, como na máscara do polo). Perto dos polos, uma faixa tem menos pontos que
   colunas: cada ponto pinta todas as colunas da fatia de longitude dele. Devolve { mask, width,
   height }. */
export function globalLandingMask({ stepDeg, gridPoints }, flags) {
  const width = Math.round(360 / stepDeg)
  const height = Math.round(180 / stepDeg)
  const mask = new Uint8Array(width * height)
  gridPoints.forEach(({ band, index, count }, i) => {
    if (!flags[i]) return
    const first = Math.floor((index * width) / count)
    const last = Math.ceil(((index + 1) * width) / count)
    for (let column = first; column < last; column++) mask[band * width + column] = 255
  })
  return { mask, width, height }
}

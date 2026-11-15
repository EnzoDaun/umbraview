/* Os arquivos da grade de pouso (public/data/landing-grid/, gerados por
 * scripts/prepare-data/prepare-landing-grid.mjs) no formato que landingAreas.js usa.
 *
 * Como em reliefFiles.js, quem lê os arquivos é a função readFile(caminho), que chega de fora e
 * devolve uma Promise de ArrayBuffer: no site, com fetch, dentro de um Worker; nos testes, do disco.
 */
import { polarXYToUnit } from './geometry.js'
import { GRID_DIRECTIONS } from './landingAreas.js'

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
  return { horizons: new Uint8Array(buffer), points, layout }
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

/* Os locais de pouso da lista (card I2), um objeto por linha da planilha do P1, revisada pelo Enzo.
 * Linha sem fonte não entra, e nenhuma coordenada é estimada (README, "Nenhum dado inventado"). As
 * fontes também estão no CREDITS.md.
 *
 * Só entram os locais que o site calcula hoje, os que ficam dentro do relevo, até 84°S (card E2).
 * As 9 regiões candidatas do Artemis III entram quando o Enzo mandar as coordenadas; os outros 31
 * locais da planilha ficam de fora até o card E8 trazer o relevo deles.
 *
 * landedAtUtc é null nas regiões candidatas: é isso que separa os dois grupos da lista
 * (src/panel/SiteList.jsx). */
export const sites = [
  {
    id: 'im-2',
    // A planilha dizia "Mons Mouton (Athena)": o nome mudou para não confundir com a região
    // candidata Mons Mouton.
    name: 'Athena (IM-2)',
    mission: 'IM-2 (NASA CLPS)',
    agency: 'Intuitive Machines',
    lat: -84.7906,
    lon: 29.1957,
    /* Hora aproximada: a NASA e a Intuitive Machines dão "approximately 11:30 a.m. CST" (UTC−6) em
       https://www.nasa.gov/blogs/missions/2025/03/06/intuitive-machines-mission-lands-near-south-pole-carrying-nasa-science
       Os 17:32 da planilha eram a janela-alvo do pouso, e não a hora em que ele aconteceu. */
    landedAtUtc: new Date('2025-03-06T17:30:00Z'),
    // a página da LROC de 10/03/2025
    sourceUrl: 'https://lroc.im-ldi.com/images/1408',
  },
]

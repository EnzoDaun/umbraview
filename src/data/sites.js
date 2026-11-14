/* Os locais de pouso da lista (cards I2 e E16), um objeto por linha da planilha do P1, revisada
 * pelo Enzo. Linha sem fonte não entra, e nenhuma coordenada é estimada (README, "Nenhum dado
 * inventado"). A coordenada das regiões candidatas do Artemis III é o centro do contorno que o
 * USGS desenhou para cada uma (o comentário delas, mais abaixo, diz como). As fontes também estão
 * no CREDITS.md.
 *
 * Só entram os locais que o site calcula hoje, os que ficam dentro do relevo, até 84°S (card E2).
 * Das 9 regiões candidatas do Artemis III, Nobile Rim 2 e Peak near Cabeus B têm o centro ao norte
 * disso; elas e os outros 31 locais da planilha ficam de fora até o card E8 trazer o relevo deles.
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
  /* As regiões candidatas do Artemis III (card E16), em ordem alfabética: numa lista <select>,
     digitar a primeira letra pula para a região. Os nomes são os da NASA (NTRS 20250011660).

     A NASA não dá um ponto de cada região. A coordenada é o centro do contorno que o USGS desenhou
     (scripts/references/artemis-regions.geojson), calculado pelo measurePolarPolygon
     (src/engine/geometry.js), e o src/data/sites.test.js reprova a linha que não bater com ele. O
     "(center)" no nome diz que o painel mostra o meio da região, e não um ponto de pouso: cada
     região tem de 16 a 77 km de lado.

     O id é artemis- mais o código da região no USGS: é por ele que o teste acha o contorno. */
  {
    id: 'artemis-g2',
    name: 'de Gerlache Rim 2 (center)',
    mission: 'Artemis III',
    agency: 'NASA',
    lat: -88.23,
    lon: -64.6284,
    landedAtUtc: null,
    sourceUrl: 'https://doi.org/10.5066/P1MEQ6UK',
  },
  {
    id: 'artemis-hw',
    name: 'Haworth (center)',
    mission: 'Artemis III',
    agency: 'NASA',
    lat: -86.7639,
    lon: -22.777,
    landedAtUtc: null,
    sourceUrl: 'https://doi.org/10.5066/P1MEQ6UK',
  },
  {
    id: 'artemis-ma',
    name: 'Malapert Massif (center)',
    mission: 'Artemis III',
    agency: 'NASA',
    lat: -85.9948,
    lon: -0.2358,
    landedAtUtc: null,
    sourceUrl: 'https://doi.org/10.5066/P1MEQ6UK',
  },
  {
    id: 'artemis-mm',
    name: 'Mons Mouton (center)',
    mission: 'Artemis III',
    agency: 'NASA',
    lat: -85.4266,
    lon: 31.7428,
    landedAtUtc: null,
    sourceUrl: 'https://doi.org/10.5066/P1MEQ6UK',
  },
  {
    id: 'artemis-mp',
    // O centro fica dentro de 84°S, mas a região passa dele: vai até 82,85°S.
    name: 'Mons Mouton Plateau (center)',
    mission: 'Artemis III',
    agency: 'NASA',
    lat: -84.3347,
    lon: 30.5923,
    landedAtUtc: null,
    sourceUrl: 'https://doi.org/10.5066/P1MEQ6UK',
  },
  {
    id: 'artemis-n1',
    name: 'Nobile Rim 1 (center)',
    mission: 'Artemis III',
    agency: 'NASA',
    lat: -85.4364,
    lon: 37.347,
    landedAtUtc: null,
    sourceUrl: 'https://doi.org/10.5066/P1MEQ6UK',
  },
  {
    id: 'artemis-sp',
    name: 'Slater Plain (center)',
    mission: 'Artemis III',
    agency: 'NASA',
    lat: -87.1637,
    lon: 125.5377,
    landedAtUtc: null,
    sourceUrl: 'https://doi.org/10.5066/P1MEQ6UK',
  },
]

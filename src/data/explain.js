/* Textos que explicam o que a pessoa vê (direção v4 · Explicativo): o "What am I seeing?" de cada
 * região, a vista do horizonte, as notas que o motor decide e a libração. Em inglês, como todo
 * texto de tela (README, "Três regras que valem para qualquer tela").
 *
 * Os números da órbita vêm da NASA NSSDC, Moon Fact Sheet,
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html (lida em 15/11/2026):
 * período de revolução 27,3217 dias, rotação sideral 655,720 h (os mesmos 27,32 dias), período
 * sinódico 29,53 dias, inclinação da órbita sobre a eclíptica 5,145°, excentricidade 0,0549,
 * perigeu 363.300 km e apogeu 405.500 km. A página não traz a amplitude da libração em graus, e por
 * isso o texto não dá esse número.
 */
export const explain = {
  question: 'What am I seeing?',

  scene: [
    'The Moon with its real colors (NASA LRO data) and the stars of the real sky, turned to the chosen date. The bright ring marks 84°S: inside it, the terrain is NASA LOLA elevation at true height, down to 400 m between points when you zoom in.',
    'The light comes from where the Sun really is on that date. Near the pole the Sun skims the horizon, so a small ridge decides whether a crater floor sees it at all.',
  ],

  panel: [
    'A site works for landing when, at the same time, at least half of the Sun is above the real terrain (power) and some part of the Earth is too (radio contact).',
    'The numbers cover 30 days from the chosen date: one full lunar day, so every site shows its whole cycle of light and dark.',
  ],

  horizon: [
    'Imagine standing on the site and turning around once. The gray shape is the terrain around you, from north (0°) through east (90°), south and west, back to north.',
    'The gold line is the path of the Sun over the 30 days; the blue line is the Earth. Solid where they rise above the terrain, dashed where the terrain hides them. The dot marks the chosen moment.',
  ],

  // A vista do horizonte (item 2): rótulos, eixo e o resumo para o leitor de tela.
  chart: {
    title: 'Horizon view',
    directions: [
      { deg: 0, label: 'N' },
      { deg: 90, label: 'E' },
      { deg: 180, label: 'S' },
      { deg: 270, label: 'W' },
      { deg: 360, label: 'N' },
    ],
    flatHorizon: '0° flat horizon',
    legendTerrain: 'Terrain',
    legendSun: 'Sun',
    legendEarth: 'Earth',
    legendHidden: 'dashed: hidden by terrain',
    summary: ({ highestDeg, highestAzimuthDeg, sunHours, earthHours, totalHours }) =>
      `Horizon view. The terrain around the site rises up to ${highestDeg.toFixed(1)}° at azimuth ${highestAzimuthDeg}°. Over ${totalHours} hours, the Sun is in view for ${sunHours} hours and the Earth for ${earthHours} hours.`,
  },

  // As notas embaixo da vista: o motor decide quando cada uma vale (summary.js, buildNotes), e a
  // frase só encaixa o número. O limite de 0,5° está no config.js, com o motivo.
  notes: {
    title: 'What the terrain does here',
    earthHidden: (hours) => `A ridge hides the Earth for ${hours} h in this period, while it is above the flat horizon.`,
    sunNear: (hours, limitDeg) => `The Sun passes within ${limitDeg}° of the terrain for ${hours} h: small terrain errors matter here.`,
    earthNever:
      'The Earth never rises above the flat horizon here in this period. No ridge is to blame: from this side of the Moon, the Earth is below the horizon.',
    none: 'Nothing unusual: the terrain does not change the picture much at this site.',
  },

  // A libração e a órbita (C7 e item 2). Só números com fonte (NSSDC, no topo do arquivo).
  libration: {
    title: 'Why the Earth moves in the polar sky',
    points: [
      'The Moon turns once on its axis in 27.32 days, the same time it takes to go around the Earth (27.3217 days). That is why one face always points at the Earth, and from the far side the Earth never rises.',
      'The orbit is not a circle (eccentricity 0.0549, from 363,300 to 405,500 km): the Moon moves faster near the Earth and slower far from it, but it spins at a steady rate. Seen from the Moon, the Earth swings a little east and west.',
      'The orbit is tilted 5.145° to the plane of the Earth’s orbit. Over each month, the Earth rises and sinks in the sky of the poles. At the south pole the Earth sits near the horizon, so this small wobble decides whether a ridge hides it.',
      'The Sun goes around the lunar sky once every 29.53 days (the synodic month): a lunar day and night together.',
    ],
    source: 'Orbit numbers: NASA NSSDC Moon Fact Sheet',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
  },
}

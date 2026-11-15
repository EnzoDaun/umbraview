/* Textos da vista do sistema (a Terra, a Lua e o Sol), em inglês, como todo texto de tela (README,
 * "Três regras que valem para qualquer tela"). */
export const systemView = {
  // O seletor de vista, por cima da cena.
  viewLabel: 'View',
  viewMoon: 'Moon',
  viewSystem: 'Earth, Moon and Sun',
  // Nome da cena para o leitor de tela: o canvas não tem texto.
  label:
    '3D view of the Sun at the centre, the Earth on its orbit around it and the Moon on its orbit around the Earth on the chosen date, over the real star field. Sizes and distances are not to scale. Drag to rotate, scroll to zoom.',
  earth: 'Earth',
  moon: 'Moon',
  sun: 'Sun',
  // a linha da órbita da Terra em volta do Sol
  earthOrbit: "Earth's orbit",
  // o botão que prende a câmera na Terra; solto, ela fica no Sol
  followEarth: 'Follow the Earth',
  /* Quem anda em volta de quem, e o que a linha azul é. Os números chegam da vista: o ano sideral
     (NASA NSSDC Earth Fact Sheet, CREDITS.md), quantos graus a Terra anda por dia, que é 360
     dividido por ele, e quantos dias o relógio da vista cobre. */
  earthOrbitNote: (yearDays, degreesPerDay, clockDays) =>
    `The Sun stays at the centre and the Earth travels along the blue line, its orbit, taking the Moon with it. One lap takes ${yearDays} days, about ${degreesPerDay.toFixed(1)}° per day, so the ${clockDays} days of this clock cover about ${Math.round(clockDays * degreesPerDay)}° of it. Follow the Earth keeps the camera on the Earth, to watch the Moon go around it.`,
  // O relógio próprio da vista: anda pelo período sem mudar a data do cálculo.
  timeLabel: 'Time in the period',
  play: 'Play',
  pause: 'Pause',
  useThisTime: 'Set as date',
  distance: 'Earth–Moon distance',
  distanceValue: (km) => `${Math.round(km).toLocaleString('en-US')} km`,
  phase: 'Moon lit, seen from Earth',
  // A libração: onde, na Lua, a Terra está a pino. Sem ela, seria sempre o centro do lado visível
  // (latitude 0°, longitude 0°).
  libration: 'Libration',
  librationValue: ({ lat, lon }) =>
    `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`,
  // O que é de verdade e o que não é. Os números vêm do motor, conferidos em src/engine/system.test.js;
  // o mês sideral e o sinódico, do NASA NSSDC Moon Fact Sheet (CREDITS.md).
  notes: [
    'Sizes and distances are not to scale. Positions, tilts and rotations are real: the Moon’s orbit is tilted about 5° to the Earth’s, and the Moon’s axis only 1.5°, which is why the Sun always grazes the lunar poles.',
    'The Sun is drawn near and small so that it fits on screen: only its direction is real, and it is the direction the light on the Earth and the Moon comes from.',
    'The Moon turns once per orbit (27.32 days), so the same face looks at the Earth. Its orbit is oval and tilted, so that face rocks a few degrees: the libration above is the point of the Moon where the Earth is overhead. That rocking is what raises and lowers the Earth over the polar horizon.',
  ],
}

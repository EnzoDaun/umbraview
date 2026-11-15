/* Textos da vista do sistema (a Terra, a Lua e o Sol), em inglês, como todo texto de tela (README,
 * "Três regras que valem para qualquer tela"). */
export const systemView = {
  // O seletor de vista, por cima da cena.
  viewLabel: 'View',
  viewMoon: 'Moon',
  viewSystem: 'Earth, Moon and Sun',
  // Nome da cena para o leitor de tela: o canvas não tem texto.
  label:
    '3D view of the Earth, the Moon on its orbit and the direction of the Sun on the chosen date, over the real star field. Sizes and distances are not to scale. Drag to rotate, scroll to zoom.',
  earth: 'Earth',
  moon: 'Moon',
  sun: 'To the Sun',
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
    'The Moon turns once per orbit (27.32 days), so the same face looks at the Earth. Its orbit is oval and tilted, so that face rocks a few degrees: the libration above is the point of the Moon where the Earth is overhead. That rocking is what raises and lowers the Earth over the polar horizon.',
  ],
}

/* Onde fica um ponto da Lua, nas três formas que o motor usa.
 *
 * O motor trabalha com o vetor de tamanho 1 que sai do centro da Lua até o ponto, no referencial
 * fixo da Lua (o mesmo dos dados LOLA): x aponta para latitude 0°, longitude 0°; y para longitude
 * 90° leste; z para o polo norte. A cena 3D (card C3) usa o y para cima: o ponto (x, y, z) daqui
 * é o (x, z, −y) de lá. Trocar a convenção num lado só põe o Sol do lado errado da montanha.
 */

/* Raio de referência dos produtos LOLA, em metros. A altura do relevo é medida a partir dele. */
export const MOON_RADIUS_M = 1737400

const DEG = Math.PI / 180

export function latLonToUnit(latDeg, lonDeg) {
  const lat = latDeg * DEG
  const lon = lonDeg * DEG
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]
}

/* Longitude de −180° a 180°. O Math.min/max segura o z que passa de 1 por arredondamento, que
   faria o asin devolver NaN. */
export function unitToLatLon([x, y, z]) {
  return { lat: Math.asin(Math.max(-1, Math.min(1, z))) / DEG, lon: Math.atan2(y, x) / DEG }
}

/* Projeção estereográfica polar sul dos arquivos LOLA do polo (+proj=stere +lat_0=-90
   +R=1737400): x = 2R·Y/(1 − Z), y = 2R·X/(1 − Z). O x da projeção vem do Y do vetor, e não do X;
   a referência do pyproj (fixtures/polarReference.json) é o que garante isso. */
export function unitToPolarXY([X, Y, Z]) {
  const k = (2 * MOON_RADIUS_M) / (1 - Z)
  return [k * Y, k * X]
}

export function polarXYToUnit(x, y) {
  const rho2 = x * x + y * y
  const k = 4 * MOON_RADIUS_M * MOON_RADIUS_M
  const Z = (rho2 - k) / (rho2 + k)
  const f = (1 - Z) / (2 * MOON_RADIUS_M)
  return [y * f, x * f, Z]
}

/* Leste, norte e cima no ponto p. É a régua da elevação e do azimute: azimute 0° é o norte e
   cresce para o leste. Exatamente no polo, leste e norte não existem (o ponto não tem
   longitude); as referências do motor chegam a −89,999°. */
export function localFrame(p) {
  const lat = Math.asin(Math.max(-1, Math.min(1, p[2])))
  const lon = Math.atan2(p[1], p[0])
  return {
    east: [-Math.sin(lon), Math.cos(lon), 0],
    north: [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)],
    up: p,
  }
}

/* Onde estão o Sol e a Terra, vistos da Lua, hora a hora.
 *
 * As posições vêm do astronomy-engine, que roda no navegador, e são giradas para o referencial
 * fixo da Lua (geometry.js) pelo modelo de rotação da IAU que o próprio astronomy-engine traz.
 * O resultado bate com o SPICE do JPL a menos de 0,01° (ephemeris.test.js).
 */
import { Body, GeoMoon, GeoVector, MakeTime, RotationAxis } from 'astronomy-engine'

const DEG = Math.PI / 180
const AU_KM = 149597870.7
const HOUR_MS = 3600e3

/* count instantes, a cada stepHours horas, a partir de startMs (milissegundos UTC).
   sunDirection: direção do Sol a partir do centro da Lua, de tamanho 1, três números por instante.
   earthPositionKm: posição da Terra a partir do centro da Lua, em km, três números por instante.
   sunDistanceKm: distância até o Sol, que dá o tamanho do disco solar no céu (series.js). */
export function computeEphemeris(startMs, count, stepHours) {
  const sunDirection = new Float64Array(count * 3)
  const earthPositionKm = new Float64Array(count * 3)
  const sunDistanceKm = new Float64Array(count)

  for (let i = 0; i < count; i++) {
    const time = MakeTime(new Date(startMs + i * stepHours * HOUR_MS))
    const moon = GeoMoon(time) // Lua a partir da Terra, em UA, no referencial equatorial
    const sun = GeoVector(Body.Sun, time, true) // Sol a partir da Terra, com aberração
    const toMoonFixed = moonFixedRotation(RotationAxis(Body.Moon, time))

    const s = toMoonFixed(sun.x - moon.x, sun.y - moon.y, sun.z - moon.z)
    const distance = Math.hypot(s[0], s[1], s[2])
    sunDirection[3 * i] = s[0] / distance
    sunDirection[3 * i + 1] = s[1] / distance
    sunDirection[3 * i + 2] = s[2] / distance
    sunDistanceKm[i] = distance * AU_KM

    const e = toMoonFixed(-moon.x, -moon.y, -moon.z)
    earthPositionKm[3 * i] = e[0] * AU_KM
    earthPositionKm[3 * i + 1] = e[1] * AU_KM
    earthPositionKm[3 * i + 2] = e[2] * AU_KM
  }
  return { startMs, count, stepHours, sunDirection, earthPositionKm, sunDistanceKm }
}

/* Do referencial equatorial para o fixo da Lua: M = Rz(W) · Rx(90° − dec) · Rz(90° + ra), com a
   ascensão reta (ra, em horas) e a declinação (dec) do polo norte da Lua e o ângulo de rotação
   (spin = W) do modelo da IAU. Exportada para quem gira outra coisa junto com a Lua: o céu de
   estrelas da cena usa o mesmo giro, para a Terra aparecer entre as estrelas certas. */
export function moonFixedRotation({ ra, dec, spin }) {
  const a1 = Math.PI / 2 + ra * 15 * DEG
  const a2 = Math.PI / 2 - dec * DEG
  const w = spin * DEG
  const c1 = Math.cos(a1), s1 = Math.sin(a1)
  const c2 = Math.cos(a2), s2 = Math.sin(a2)
  const c3 = Math.cos(w), s3 = Math.sin(w)
  return (x, y, z) => {
    const x1 = c1 * x + s1 * y
    const y1 = -s1 * x + c1 * y
    const y2 = c2 * y1 + s2 * z
    const z2 = -s2 * y1 + c2 * z
    return [c3 * x1 + s3 * y2, -s3 * x1 + c3 * y2, z2]
  }
}

/* O giro do referencial equatorial (J2000, o dos catálogos de estrelas e do astronomy-engine) para
   o fixo da Lua, num instante (milissegundos UTC). Devolve a função (x, y, z) => [x, y, z]. Visto da
   Lua, o céu inteiro dá uma volta a cada mês sideral (27,32 dias), porque a Lua gira no mesmo
   tempo em que dá a volta na Terra. */
export function moonFixedFrameAt(dateMs) {
  return moonFixedRotation(RotationAxis(Body.Moon, MakeTime(new Date(dateMs))))
}

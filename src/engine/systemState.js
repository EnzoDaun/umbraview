/* Onde estão a Terra, a Lua e o Sol para a vista de fora (Terra–Lua–Sol), e como girar o céu de
 * estrelas para o referencial fixo da Lua.
 *
 * As posições são as mesmas do motor (ephemeris.js: GeoMoon e GeoVector do astronomy-engine), só
 * giradas do referencial equatorial J2000 para o ECLÍPTICO J2000: x aponta para o equinócio, z
 * para o norte da eclíptica, e a Terra fica na origem. Na eclíptica a órbita da Terra fica deitada
 * no plano xy, e as três inclinações que a tela explica (eixo da Terra, órbita da Lua, eixo da
 * Lua) aparecem como ângulos com o eixo z. Datas em milissegundos UTC.
 */
import {
  Body,
  GeoMoon,
  GeoVector,
  Illumination,
  Libration,
  MakeTime,
  MoonPhase,
  RotateVector,
  Rotation_EQJ_ECL,
  RotationAxis,
} from 'astronomy-engine'

import { moonFixedRotation } from './ephemeris.js'

/* Mesmo valor do ephemeris.js: com outro, a distância daqui deixaria de bater com a de lá. */
const AU_KM = 149597870.7
const DAY_MS = 86400e3

/* Duração dos meses da Lua, em dias. Fonte: NASA NSSDCA, Moon Fact Sheet (D. R. Williams,
   atualizada em 11 de janeiro de 2024), https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
   "Revolution period (days) 27.3217" e "Synodic period (days) 29.53". Os algarismos são os da
   página, sem casas a mais.
   Sideral: uma volta em relação às estrelas, o que fecha o desenho da órbita.
   Sinódico: de uma lua nova à seguinte, mais longo porque a Terra também andou em volta do Sol. */
export const SIDEREAL_MONTH_DAYS = 27.3217
export const SYNODIC_MONTH_DAYS = 29.53

/* A matriz não depende da data: é o giro fixo da obliquidade de J2000 em torno do eixo x. */
const EQUATORIAL_TO_ECLIPTIC = Rotation_EQJ_ECL()

const toEcliptic = (vector) => {
  const v = RotateVector(EQUATORIAL_TO_ECLIPTIC, vector)
  return [v.x, v.y, v.z]
}

const unit = (v) => {
  const length = Math.hypot(v[0], v[1], v[2])
  return [v[0] / length, v[1] / length, v[2] / length]
}

/* Os 9 números, por linhas, da matriz que leva um vetor do referencial equatorial J2000 (o dos
   catálogos de estrelas: ascensão reta e declinação) para o fixo da Lua na data. É o que gira o
   campo de estrelas: fixo = M · equatorial, com fixo[i] = m[3i]·x + m[3i+1]·y + m[3i+2]·z.
   O resultado sai no referencial do geometry.js (z para o polo norte da Lua); a troca para o y
   para cima da cena continua sendo a de lá, (x, y, z) → (x, z, −y).
   Vale para o que está longe (estrelas). Para o Sol e a Terra, use o computeEphemeris, que
   desconta a posição da Lua antes de girar. */
export function equatorialToMoonFixedMatrix(dateMs) {
  const time = MakeTime(new Date(dateMs))
  const toMoonFixed = moonFixedRotation(RotationAxis(Body.Moon, time))
  // cada eixo equatorial girado é uma COLUNA da matriz
  const columns = [toMoonFixed(1, 0, 0), toMoonFixed(0, 1, 0), toMoonFixed(0, 0, 1)]
  const matrix = new Array(9)
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      matrix[3 * row + column] = columns[column][row]
    }
  }
  return matrix
}

/* A Lua a partir do centro da Terra, em km, na eclíptica J2000. */
function moonPositionAt(time) {
  const [x, y, z] = toEcliptic(GeoMoon(time))
  return [x * AU_KM, y * AU_KM, z * AU_KM]
}

/* O estado da vista Terra–Lua–Sol num instante, com a Terra na origem:
   moonPositionKm: a Lua, em km. moonDistanceKm: o tamanho desse vetor.
   sunDirection: da Terra para o Sol, de tamanho 1 (o Sol fica 400 vezes mais longe que a Lua; a
     cena desenha só a direção).
   moonNorthPole, earthNorthPole: os eixos de rotação, de tamanho 1.
   libration: o ponto subterrestre, em graus. É a longitude e a latitude, no referencial fixo da
     Lua, do ponto da superfície que tem a Terra no zênite. Sem libração seria sempre (0°, 0°); o
     passeio de até uns 8° é o que deixa a Terra subir e descer no céu do polo.
   phaseAngleDeg: 0 = nova, 90 = crescente, 180 = cheia, 270 = minguante.
   illuminatedFraction: a parte do disco da Lua iluminada, vista da Terra, de 0 a 1. */
export function computeSystemState(dateMs) {
  const time = MakeTime(new Date(dateMs))
  const moonPositionKm = moonPositionAt(time)
  const libration = Libration(time)

  return {
    moonPositionKm,
    moonDistanceKm: Math.hypot(moonPositionKm[0], moonPositionKm[1], moonPositionKm[2]),
    // com aberração, como no ephemeris.js: a mesma direção do Sol nas duas vistas
    sunDirection: unit(toEcliptic(GeoVector(Body.Sun, time, true))),
    moonNorthPole: unit(toEcliptic(RotationAxis(Body.Moon, time).north)),
    earthNorthPole: unit(toEcliptic(RotationAxis(Body.Earth, time).north)),
    libration: { lonDeg: libration.elon, latDeg: libration.elat },
    phaseAngleDeg: MoonPhase(time),
    illuminatedFraction: Illumination(Body.Moon, time).phase_fraction,
  }
}

/* A linha da órbita para desenhar: samples posições da Lua (km, três números por ponto, mesmo
   referencial do computeSystemState), igualmente espaçadas ao longo de um mês sideral centrado na
   data. O primeiro ponto fica meio mês antes e o último meio mês depois, e por isso os dois quase
   se encontram: a órbita de verdade não fecha (o perigeu e os nós andam), e desenhar a volta real
   mostra isso em vez de uma elipse inventada. Com samples ímpar, o ponto do meio é a Lua na data. */
export function computeMoonOrbit(dateMs, samples) {
  const positions = new Float32Array(samples * 3)
  const spanMs = SIDEREAL_MONTH_DAYS * DAY_MS
  // com um ponto só não há passo; ele fica na própria data, em vez de dividir por zero
  const stepMs = samples > 1 ? spanMs / (samples - 1) : 0
  const firstMs = samples > 1 ? dateMs - spanMs / 2 : dateMs
  for (let i = 0; i < samples; i++) {
    const p = moonPositionAt(MakeTime(new Date(firstMs + i * stepMs)))
    positions[3 * i] = p[0]
    positions[3 * i + 1] = p[1]
    positions[3 * i + 2] = p[2]
  }
  return positions
}

/* O giro que leva o céu de estrelas para a cena, na data escolhida (contrato C5 da v2).
 *
 * As estrelas ficam no referencial equatorial J2000, e a cena é o referencial fixo da Lua, com o y
 * para cima. A conta é do motor (equatorialToMoonFixedMatrix, que usa a mesma rotação da Lua do Sol
 * e da Terra); aqui ela só passa pela troca de eixos da cena, a mesma de coordinates.js: o ponto
 * (x, y, z) do motor é o (x, z, −y) da cena.
 */
import { useMemo } from 'react'

import { equatorialToMoonFixedMatrix } from '../engine/systemState.js'

/* Os 9 números, por linhas, da matriz que leva uma direção equatorial J2000 para a cena. */
export function skyRotationForScene(dateMs) {
  const m = equatorialToMoonFixedMatrix(dateMs)
  return [m[0], m[1], m[2], m[6], m[7], m[8], -m[3], -m[4], -m[5]]
}

/* O mesmo array enquanto a data não muda: a cena só refaz o giro quando ele troca. */
export function useSkyRotation(dateUtc) {
  const ms = dateUtc.getTime()
  return useMemo(() => skyRotationForScene(ms), [ms])
}

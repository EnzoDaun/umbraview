/* Os números que decidem quanto o motor acerta. Cada um tem um dono só: este arquivo.
 *
 * O horizonte desta configuração foi comparado com os mapas de visibilidade da NASA (Mazarico et
 * al. 2011, CREDITS.md) em 259 pontos de 85° a 90°S, em 23/10/2026: erro médio de 2,4 pontos
 * percentuais no Sol e 1,6 na Terra. Mudar qualquer um deles pede refazer essa comparação
 * (card E2), porque o acordo com a NASA é a única prova de que o horizonte está certo.
 */

export const HORIZON = Object.freeze({
  /* Altura do observador acima do chão. Entre 0, 1, 2 e 10 m, a de 2 m deu o menor erro no Sol
     contra os mapas da NASA (6,8; 3,5; 2,5 e 3,6 pontos). */
  mastM: 2,
  /* Uma direção por grau. Com 720 direções, o erro ficou igual (2,5 pontos no Sol). */
  directions: 360,
  /* A montanha mais distante que entra no horizonte. */
  maxDistanceM: 200000,
  /* Passo ao longo do chão: 40 m até 40 km de distância; dali em diante, 0,1% da distância
     (200 m a 200 km). */
  step: (distanceM) => Math.max(40, 0.001 * distanceM),
})

/* O relevo fino (80 m) vale até esta distância; dali até HORIZON.maxDistanceM, o grosso (960 m). */
export const NEAR_LAYER_UP_TO_M = 10000

/* Os números que decidem quanto o motor acerta. Cada um tem um dono só: este arquivo.
 *
 * A prova de que eles estão certos é comparar o horizonte com os mapas de visibilidade da NASA
 * (Mazarico et al. 2011, CREDITS.md). Essa comparação precisa do relevo de verdade, que chega
 * com o card E2: o script que a refaz e o resultado de cada ponto ficam lá. Até ela, os valores
 * abaixo são os escolhidos pela equipe. Mudar qualquer número do horizonte pede refazer a
 * comparação.
 */

export const HORIZON = Object.freeze({
  /* Altura do observador acima do chão. A comparação do card E2 confere esta escolha contra 0, 1
     e 10 m. */
  mastM: 2,
  /* Uma direção por grau. A comparação do card E2 confere esta escolha contra 720 direções. */
  directions: 360,
  /* A montanha mais distante que entra no horizonte. */
  maxDistanceM: 200000,
  /* Passo ao longo do chão: 40 m até 40 km de distância; dali em diante, 0,1% da distância
     (200 m a 200 km). */
  step: (distanceM) => Math.max(40, 0.001 * distanceM),
})

/* O relevo fino vale até esta distância; dali até HORIZON.maxDistanceM, o grosso. O fino é o
   LDEM_80S_80MPP_ADJ, de 80 m por pixel; o grosso, de 960 m por pixel, é a média de 4 × 4 pixels
   do LDEM_60S_240MPP_ADJ (os dois no CREDITS.md). */
export const NEAR_LAYER_UP_TO_M = 10000

/* Janela de pouso mínima: 6 dias seguidos com Sol e Terra à vista. É escolha provisória da equipe,
   sem requisito de missão por trás; o valor final se combina com o Marco e o Miguel antes do
   painel (card I1), porque decide se a lista de janelas aparece vazia. Muda aqui, e só aqui.
   Janela cortada no começo ou no fim do período entra mesmo mais curta (series.js). */
export const MIN_LANDING_WINDOW_HOURS = 144

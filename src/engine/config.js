/* Os números que decidem quanto o motor acerta. Cada um tem um dono só: este arquivo.
 *
 * A prova de que eles estão certos é comparar o horizonte com os mapas de visibilidade da NASA
 * (Mazarico et al. 2011, CREDITS.md): scripts/prepare-data/compare-nasa.mjs, com o relevo do site.
 * O resultado de cada ponto está no card E1 do backlog. Mudar qualquer número do horizonte pede
 * rodar a comparação de novo.
 *
 * Os erros citados abaixo são a média da diferença no Sol, em pontos percentuais, nos 259 pontos
 * sorteados de 85° a 90°S, medidos em 30/10/2026 com o compare-nasa.mjs e a opção dita em cada um.
 */

export const HORIZON = Object.freeze({
  /* Altura do observador acima do chão. Erro com 0, 1, 2 e 10 m (--mast=0, 1 e 10): 6,8; 3,1;
     2,1 e 3,6 pontos. Com 10 m, a Terra também se afasta da NASA (3,2 pontos, contra 1,2 com 2 m). */
  mastM: 2,
  /* Uma direção por grau. Com 720 direções (--directions=720), o erro fica igual: 2,1 pontos. */
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
   painel (card I1), porque decide se a lista de janelas aparece vazia; a medição para essa
   conversa está no card I1. Muda aqui, e só aqui.
   Janela cortada no começo ou no fim do período entra mesmo mais curta (series.js). */
export const MIN_LANDING_WINDOW_HOURS = 144

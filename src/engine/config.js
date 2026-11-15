/* Os números que decidem quanto o motor acerta. Cada um tem um dono só: este arquivo.
 *
 * A prova de que eles estão certos é comparar o horizonte com os mapas de visibilidade da NASA
 * (Mazarico et al. 2011, CREDITS.md): scripts/prepare-data/compare-nasa.mjs, com o relevo do site.
 * O resultado está no card E1 do backlog. Mudar qualquer número do horizonte pede
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

/* Janela de pouso mínima: 1 dia seguido com Sol e Terra à vista. Decisão do Enzo em 12/11/2026
   (card I6): os 144 h de antes não tinham requisito de missão por trás. Pela medição do card I1,
   nos pontos sorteados de 85° a 90°S em 30 dias, com 144 h só 38% têm janela, e com 24 h, 58%; os
   outros 42% não têm nem um dia seguido de Sol e Terra. Zerar o mínimo encheria a lista de pedaços
   de poucas horas. Muda aqui, e só aqui.
   Janela cortada no começo ou no fim do período entra mesmo mais curta (series.js). */
export const MIN_LANDING_WINDOW_HOURS = 24

/* O período que a tela mostra para um ponto, a partir da data escolhida. 30 dias cobrem um dia
   lunar inteiro (29,5 dias: o tempo que o Sol leva para dar uma volta no céu da Lua), então todo
   ponto mostra o ciclo inteiro de luz e escuro, e não só o pedaço em que a data caiu. Medido em
   03/11/2026 no Node, no computador do Enzo: a posição do Sol e da Terra de 30 dias leva de 32 a
   79 ms a cada troca de data; a de 365 dias, de 123 a 180 ms, e o ponto mais iluminado do mapa da
   NASA chega a 13 janelas de pouso na lista. Muda aqui, e só aqui. */
export const PERIOD_DAYS = 30

/* Quão perto do relevo o Sol precisa passar para a nota "o Sol raspa o relevo" aparecer embaixo da
   vista do horizonte (C2). 0,5° é cerca do diâmetro do disco do Sol visto da Lua (0,53°): a essa
   distância, o disco quase encosta na montanha, e um erro pequeno no relevo (o grosso tem 1,9 km
   por pixel, card E2) ou na altura do observador (HORIZON.mastM) já muda se o ponto fica na luz.
   É a hora de a pessoa desconfiar do número, e não só ler. Muda aqui, e só aqui. */
export const TERRAIN_GRAZE_DEG = 0.5

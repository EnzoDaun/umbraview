/* A mistura das luzes que se somam ao que está atrás: as estrelas e o brilho do Sol. É o jeito de
 * fazer brilho sem bloom, que derrubaria a placa de vídeo integrada.
 *
 * Só funciona com o fundo pintado dentro da cena (o <color attach="background"> de LunarScene.jsx
 * e de SystemView.jsx). Sobre uma tela do WebGL transparente, o navegador mistura o desenho com a
 * página pela opacidade: somando a opacidade junto, cada estrela virava um quadrado preto; somando
 * só a cor, as estrelas sumiam, porque um pixel sem opacidade não aparece (as duas tentativas da
 * v2, vistas no navegador em 15/11/2026). Com o fundo opaco, a soma é só de cor e não há o que
 * errar.
 */
import { AdditiveBlending } from 'three'

/* As opções de material (ShaderMaterial) de uma luz aditiva. O shader escreve a cor já na
   intensidade em que ela soma. Sem gravar profundidade: uma luz não esconde a outra. */
export const ADDITIVE_LIGHT = Object.freeze({
  blending: AdditiveBlending,
  transparent: true,
  depthWrite: false,
})

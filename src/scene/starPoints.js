/* O tamanho e o brilho de cada estrela na tela, pela magnitude (contrato C5 da v2). É escolha de
 * desenho, e não astronomia: a magnitude vem pronta do catálogo (src/engine/starCatalog.js).
 *
 * O tamanho do ponto, em pixels da página: Sirius (−1,44) fica com uns 6 px e tudo o que é mais
 * fraco que a magnitude 5 fica no mínimo. O brilho cai mais devagar que o da estrela de verdade
 * (que cai 100 vezes a cada 5 magnitudes): com a queda real, só umas 50 estrelas apareceriam.
 */
const SIZE_AT_ZERO_PX = 5
const SIZE_PER_MAGNITUDE_PX = 0.72
const MIN_SIZE_PX = 1.3
const MAX_SIZE_PX = 6.5
const BRIGHTNESS_PER_MAGNITUDE = 0.16
const MIN_BRIGHTNESS = 0.14

export function starSizePx(magnitude) {
  return Math.max(MIN_SIZE_PX, Math.min(MAX_SIZE_PX, SIZE_AT_ZERO_PX - SIZE_PER_MAGNITUDE_PX * magnitude))
}

/* De 0 a 1: 1 para a magnitude 1 ou mais brilhante. */
export function starBrightness(magnitude) {
  return Math.max(MIN_BRIGHTNESS, Math.min(1, Math.pow(10, -BRIGHTNESS_PER_MAGNITUDE * (magnitude - 1))))
}

/* O céu que responde ao zoom: de perto, só as estrelas mais brilhantes; conforme a câmera se
   afasta, as mais fracas vão aparecendo, até o céu inteiro do catálogo, e todas crescem um pouco.
   É o que diz à pessoa que ela se afastou: a Lua (ou a órbita) encolhe, e o céu em volta enche.
   As estrelas não saem do lugar, porque estão no infinito; só o quanto delas se vê muda.

   Quanto do céu aparece, de 0 (de perto) a 1 (de longe), pela distância da câmera ao centro da
   cena. near e far: as distâncias em que começa e em que termina de aparecer. A escala é a do
   zoom, que multiplica a distância a cada passo da roda: em logaritmo, cada passo revela o mesmo
   tanto. */
export function starReveal(distance, near, far) {
  if (!(distance > near)) return 0
  if (distance >= far) return 1
  return Math.log(distance / near) / Math.log(far / near)
}

/* A magnitude mais fraca que aparece em cada ponto do zoom: de perto, até a 4,8 (umas mil
   estrelas, as das constelações); de longe, todas as do catálogo, que vai até a 6,5. A folga de
   meio ponto faz cada estrela acender aos poucos, e não de uma vez (starVisibility). */
export const NEAR_MAGNITUDE_LIMIT = 4.8
export const FAR_MAGNITUDE_LIMIT = 7
export const MAGNITUDE_FADE = 0.5

export function magnitudeLimit(reveal) {
  return NEAR_MAGNITUDE_LIMIT + (FAR_MAGNITUDE_LIMIT - NEAR_MAGNITUDE_LIMIT) * reveal
}

/* Quanto de uma estrela aparece, de 0 a 1, num ponto do zoom: inteira até o limite menos a folga,
   apagada do limite mais a folga em diante. É a mesma conta do shader do StarField, escrita aqui
   para ter teste. */
export function starVisibility(magnitude, reveal) {
  const limit = magnitudeLimit(reveal)
  const t = Math.max(0, Math.min(1, (limit + MAGNITUDE_FADE - magnitude) / (2 * MAGNITUDE_FADE)))
  return t * t * (3 - 2 * t)
}

/* Quanto os pontos crescem com o céu inteiro à vista, em relação ao tamanho de perto. */
export const FAR_SIZE_SCALE = 1.35

/* O zoom que sai de dentro do céu. Até uma certa distância, as estrelas ficam no infinito: a
   câmera anda e elas não saem do lugar, como no céu de verdade. Dali em diante, a câmera passa a
   se afastar do próprio céu: as estrelas ficam presas numa casca em volta da cena, e de longe a
   casca inteira aparece como um aglomerado pequeno, com a Lua (ou a órbita) no meio. Não é
   astronomia: as estrelas de verdade estão a anos-luz, e nenhum zoom sairia de dentro delas. É o
   que dá à pessoa a medida de quanto ela se afastou, e a cena volta ao normal quando ela chega
   perto de novo.

   Quanto o céu está preso à cena, de 0 (no infinito) a 1 (preso), pela distância da câmera ao
   centro: a mesma escala em logaritmo do starReveal, entre from e to. */
export function starAnchor(distance, from, to) {
  return starReveal(distance, from, to)
}

/* Onde uma estrela fica na cena. direction: a direção dela, de tamanho 1. camera: a posição da
   câmera. anchor: o starAnchor. shellRadius: o raio da casca. Com o céu no infinito (anchor 0), a
   estrela anda junto com a câmera, sempre na mesma direção; preso (anchor 1), fica parada na
   casca. É a mesma conta do shader do StarField, escrita aqui para ter teste. */
export function starPosition(direction, camera, anchor, shellRadius) {
  return direction.map((value, i) => camera[i] * (1 - anchor) + value * shellRadius)
}

/* Com o céu virando um aglomerado, os pontos encolhem até esta fração do tamanho: sem isso, milhares
   de pontos somados num disco pequeno virariam uma mancha branca. */
export const CLUSTER_SIZE_SCALE = 0.45

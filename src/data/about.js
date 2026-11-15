/* O texto que explica o produto para quem abre o site pela primeira vez, em inglês, como todo
 * texto de tela (README, "Três regras que valem para qualquer tela").
 *
 * Por que existe: a tela mostrava o que o site faz, mas nunca por que isso importa nem o que ele
 * faz de diferente. Quem chega sem contexto via um globo da Lua bonito e não tinha como saber que
 * a conta embaixo dele é o horizonte de verdade de cada ponto.
 *
 * O que está escrito aqui é só o que o projeto faz e o que as fontes do CREDITS.md sustentam. Não
 * diz o que outras ferramentas fazem: a comparação com o Moon Trek e o QuickMap é o card P5 do
 * backlog e ainda não foi feita. A duração mínima da janela vem do motor (config.js), e não
 * escrita à mão, para o texto não ficar com um número velho.
 */
export const about = {
  title: 'What am I seeing?',
  blocks: [
    {
      heading: 'Why it matters',
      // O polo sul e as regiões candidatas do Artemis III: NASA RELEASE 22-089 (CREDITS.md).
      body: 'A crewed landing site needs two things at the same time: sunlight, for power and warmth, and the Earth above the horizon, for a direct radio link. Near the lunar south pole, where the Artemis III candidate regions are, the Sun circles low over the ground, so a single ridge can hide it for days, and the Earth hangs so close to the horizon that the terrain can cut the link.',
    },
    {
      heading: 'What this does',
      /* O diferencial, dito pelo que o site faz: o horizonte de verdade em 360°, do relevo LOLA da
         NASA, ponto a ponto. O relevo não é fundo: é de onde a resposta sai. */
      body: 'Every answer here comes from the real skyline of the exact spot you pick: the terrain all around it, in 360°, measured by NASA’s LOLA. A flat horizon would say the Sun is up; the ridge in front of you decides whether you can actually see it.',
    },
    {
      heading: 'Try it',
      // minHours: a duração mínima da janela de pouso, do motor
      body: (minHours) =>
        `Click anywhere on the Moon, or pick a site from the list. "Show landing areas" paints every place that has a landing window in the period: at least ${minHours} hours in a row with the Sun and the Earth above the horizon together.`,
    },
  ],
}

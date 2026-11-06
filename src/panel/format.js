/* Os números do painel do ponto (card I1) viram texto aqui, e não no componente, para o teste
 * conferir o formato sem montar a tela. O ° e o " UTC" são unidade, como o % que o Intl já põe:
 * ficam junto do número, e não em src/data/. */
const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })

/* Sem o timeZone: 'UTC', a hora sai no fuso do computador de quem usa, e as missões falam em UTC.
   O CI roda em UTC e não veria o erro; por isso a suíte roda em Tóquio (vite.config.js). */
const utcDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDegrees(degrees) {
  return `${degrees.toFixed(1)}°`
}

export function formatPercent(fraction) {
  return percent.format(fraction)
}

export function formatUtc(date) {
  return `${utcDateTime.format(date)} UTC`
}

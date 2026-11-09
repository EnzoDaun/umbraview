/* Os números do painel do ponto (card I1) viram texto. A suíte roda no fuso de Tóquio
 * (vite.config.js): o caso da data só passa se a hora sair em UTC, que é a referência das missões,
 * e não no fuso do computador de quem usa. */
import { describe, expect, it } from 'vitest'

import { formatDegrees, formatPercent, formatUtc } from './format.js'

describe('formatDegrees', () => {
  it('mostra uma casa decimal e o símbolo de grau', () => {
    expect(formatDegrees(12.345)).toBe('12.3°')
    expect(formatDegrees(0)).toBe('0.0°')
  })

  it('mostra a altura negativa como ela chega, com o sinal', () => {
    expect(formatDegrees(-0.84)).toBe('-0.8°')
  })
})

describe('formatPercent', () => {
  it('mostra a fração como porcentagem, com até uma casa decimal', () => {
    expect(formatPercent(0.855)).toBe('85.5%')
    expect(formatPercent(1)).toBe('100%')
    expect(formatPercent(0)).toBe('0%')
  })
})

describe('formatUtc', () => {
  it('mostra a data e a hora em UTC, e não no fuso de quem usa', () => {
    // em Tóquio (UTC+9) seriam 12:00; o painel tem que mostrar 03:00
    expect(formatUtc(new Date('2026-11-14T03:00:00Z'))).toBe('14 Nov 2026, 03:00 UTC')
  })
})

/* Carregado antes de cada arquivo de teste (vite.config.js, test.setupFiles).
 *
 * Traz os matchers do Testing Library, como toBeInTheDocument, para o expect do Vitest, e
 * desmonta o que cada teste montou. A desmontagem automática do Testing Library só se liga
 * sozinha quando o Vitest roda com globais, e este projeto não liga os globais (o ESLint não
 * os conhece). Sem o cleanup, o componente de um teste continua na tela no seguinte. */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

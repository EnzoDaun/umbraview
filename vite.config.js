import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  /* Caminhos relativos no build. O GitHub Pages publica o site em
     https://<usuário>.github.io/umbraview/, e não na raiz do domínio; com a base padrão ('/')
     o navegador buscaria os arquivos em /assets/ e a página abriria em branco. */
  base: './',

  server: { port: 5173 },

  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    /* A suíte roda num fuso que não é UTC nem o de Brasília, de propósito. O app mostra
       horários em UTC (a referência das missões); um formatador que esquecesse o
       timeZone: 'UTC' passaria rodando no CI, que é UTC, e erraria no computador de quem usa. */
    env: { TZ: 'Asia/Tokyo' },
  },
})

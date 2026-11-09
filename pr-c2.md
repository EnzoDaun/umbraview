## O que mudei

A cena agora mostra o relevo de verdade do polo sul, em altura real, iluminado pelo Sol na direção que o motor calcula para a data, e as montanhas fazem sombra. A câmera pode descer até uns 35 km do polo para o relevo aparecer.

Card do backlog: C2 · O relevo do polo sul e a sombra das montanhas

Os commits:
1. **cria a conversão para a cena e a malha do relevo do polo.** `src/scene/coordinates.js` faz a ida de latitude e longitude para ponto da cena, com a convenção do C3. O teste também confere que a luz sai do mesmo lado que o Sol do motor. `src/scene/reliefMesh.js` monta a malha a partir do `far.bin`: um vértice a cada 2 pixels (1,9 km), só dentro do `reachM`, com a altura indo a zero numa faixa de 10 km na borda, por volta de 77°S, para a malha encostar na esfera lisa. `src/hooks/useFarRelief.js` baixa o manifesto e o `far.bin` com o `createReliefReader` do E3, e `src/scene/sunLight.js` diz onde fica a luz. O README ganha os arquivos novos.
2. **mostra o relevo na cena, com a luz do Sol da data e a sombra.** No `LunarScene.jsx`, a luz vem do `useSubsolarPoint(dateUtc)`, e a sombra fica ligada no Canvas, na luz e nas duas malhas. A esfera lisa abre um buraco no polo quando o relevo chega; enquanto ele baixa, ou se falhar, a Lua aparece lisa como no C1. A data, por enquanto, é a hora em que a página abriu, guardada no `App.jsx`. O I4 e o E11 trocam por um estado que a pessoa muda.
3. **registra a decisão da escala no backlog.** No item 4 do C2, a escala decidida e o motivo. No C3, que a ida do `coordinates.js` já existe.

A escala: altura real, sem exagero. Exagerar a altura alonga a sombra na mesma proporção, e com o Sol a 1 ou 2 graus do horizonte a cena mostraria sombra em pontos onde o motor diz `visible: true`.

## Como testei

```
npm run verify

 Test Files  24 passed (24)
      Tests  187 passed (187)

dist/index.html                     0.64 kB │ gzip:   0.37 kB
dist/assets/index-5ZvUgmPi.css      3.30 kB │ gzip:   1.29 kB
dist/assets/index-GsTLoXRC.js   1,204.51 kB │ gzip: 339.80 kB
✓ built in 611ms

> umbraview@0.1.0 conferir
> node scripts/conferir-build.mjs

conferencia do build
  arquivos .js e .html lidos em dist/  2
  OK: nenhum TODO_PREENCHER no build.
```

No navegador (Chromium), com o `npm run preview`: de longe, a Lua aparece com o polo em relevo e a linha do dia e da noite passando por ele. Chegando perto com a roda, aparece uma cratera com a borda iluminada de um lado e o fundo no escuro, sem listras de sombra na superfície. O console não mostra erro.

## O que ficou de fora

- O "Pronto quando" do card pede três pontos combinados com o Enzo, na mesma data, com luz onde o motor diz `visible: true` e sombra onde diz `false`. Essa conferência é a próxima etapa, e o card só fecha depois dela. Sugestão: escolher pontos onde a sombra vem de montanha grande e distante. A cena usa relevo de 1,9 km, e o motor usa o de 80 m perto do ponto; num ponto sombreado por uma borda de cratera pequena e próxima, os dois podem discordar sem erro de conta.
- De perto, o relevo fica borrado: a malha tem 1,9 km entre vértices (`RELIEF_STEP = 2`) e a sombra, uns 420 m por pixel (2048). Testei com `RELIEF_STEP = 1` e sombra de 4096 (960 m e 210 m): fica duas vezes mais nítido e sem erro no console, mas com 4 vezes mais vértices, e o WebGL 2 só garante textura de 2048. Voltei os valores até o C4 medir o peso. **Sugestão:** um card novo para o relevo fino de 80 m (`near/`), carregado só perto da câmera, depois do C4; é o único jeito de ficar nítido de perto.
- O nome da cena para leitor de tela diz "current date" porque a data ainda é a hora em que a página abriu; o I4 troca para "chosen date".
- O JavaScript do build foi de 1,15 MB para 1,20 MB (340 kB compactado). O C4 mede de novo.

## Conferi

- [x] A branch de destino é a `develop`.
- [x] Rodei `npm run verify` e ele terminou com `OK: nenhum TODO_PREENCHER no build.`
- [x] Texto de tela só em `src/data/`; cor, espaço e duração só pelos tokens.
- [x] Todo dado novo tem fonte, ou `TODO_PREENCHER`, e a fonte está no `CREDITS.md`. (Nenhum dado novo: o relevo é o do E2.)
- [x] Nenhum commit e nenhuma linha desta descrição têm assinatura do Claude.
- [x] Atualizei o README (bloco "Estrutura") e o `docs/backlog.md`.

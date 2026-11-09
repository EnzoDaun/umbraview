<!-- Escreva na primeira pessoa: quem responde por este PR é você. -->

## O que mudei

Agora dá para escolher um ponto clicando na Lua. Um clique perto do polo sul, até 84°S, escolhe o ponto e põe um marcador âmbar nele. Um clique fora dessa área não escolhe nada e mostra um aviso curto embaixo da cena, que some sozinho depois de 5 segundos. Girar a Lua arrastando não escolhe ponto.

Card do backlog: C3 · Escolher um ponto clicando na Lua

Este PR partiu da branch do C2 (PR #8, já mergeado), porque usa o `latLonToScene` e a malha do relevo de lá.

Os commits:
1. **acrescenta a volta da conversão, de ponto da cena para latitude e longitude.** `sceneToLatLon` em `src/scene/coordinates.js`. Ela passa o ponto para o tamanho 1 antes da conta, porque o clique cai no relevo, um pouco acima ou abaixo do raio 1, e o `asin` de um valor maior que 1 daria `NaN`. Testes: os quatro pontos da convenção do card, um ponto fora do raio 1 e a ida e volta de cinco pontos perto do polo sul.
2. **escolhe o ponto clicando na Lua, com o marcador e o aviso de fora da área.**
   - `src/scene/picking.js`, sem three e sem React, testado no Node: `readMoonClick` decide entre escolher, avisar e ignorar; `markerPosition` põe o marcador na altura do relevo no ponto (lida do `far.bin`); `isOnNearSide` diz se o ponto está do lado da Lua virado para a câmera.
   - O three chama o `onClick` também quando a pessoa solta o mouse depois de girar a Lua. Por isso, se o mouse andou mais de 4 pixels entre apertar e soltar (`CLICK_MAX_DRAG_PX`), o clique é ignorado.
   - O `onClick` fica num `<group>` em volta da esfera lisa e da malha do relevo. O raio do clique atravessa as duas, e o `stopPropagation` faz só a primeira, a que a pessoa vê, contar.
   - `src/scene/SiteMarker.jsx`: o marcador é um elemento da página sobre o Canvas (o `Html` do Drei), com o mesmo tamanho na tela de perto e de longe, e cor e tamanho vindos dos tokens. Ele é desenhado por cima do relevo, para não sumir quando o ponto está na sombra de uma montanha, e some quando o ponto vai para o outro lado da Lua.
   - `src/hooks/useTimedNotice.js`: o aviso que some sozinho. O aviso fica num `role="status"` fora do `role="img"` da cena, senão o leitor de tela não leria.
   - O texto do aviso está em `src/data/scene.js`, com o limite (84°S) lido do `manifest.json`. O nome da cena para o leitor de tela agora diz que o clique escolhe um ponto.
   - `src/App.jsx` guarda o ponto escolhido num estado (`site`) e entrega para a cena (`site` e `onSelect`). O README ganha os arquivos novos.
3. **registra no backlog o C3 em revisão e passa o painel do clique para o E11.** Detalhe na seção abaixo.
4. **marca no backlog que o C2, de que o C3 depende, já foi mergeado.**

Depois da revisão do Enzo:
5. **troca o texto do aviso de fora da área para não dizer que falta relevo.** Agora é "Landing sites can be chosen between the south pole and 84°S.", com o 84 ainda vindo do `manifest.json`. O texto antigo dizia "No terrain data there yet" em cima de um lugar onde a pessoa está vendo relevo.
6. **dá nomes em inglês às variáveis dos testes novos do C3.** Em `picking.test.js` e `useTimedNotice.test.js`, como pede o CLAUDE.md. Os nomes dos testes (`it`) continuam em português.
7. **marca o C3 como feito e cria o card C8, do anel que mostra a área.** O estado do C3 vira "feito em 06/11, PR #9", e o C8, no fim da área C, registra o anel em 84°S e por que escurecer o relevo de fora foi descartado.

## O que ficou de fora: o painel mostrando o resultado do ponto clicado

O "Pronto quando" original do C3 dizia: "o clique escolhe o ponto **e o painel mostra o resultado dele**". Essa segunda parte não está neste PR, e foi uma decisão minha, registrada no backlog:

- **Por quê.** Para o painel mostrar o resultado, precisam existir o painel (card I1, do Miguel) e a ligação do `useSiteSky` com a tela (card E11, do Enzo). Nenhum dos dois existe hoje na `develop`. Fazer isso aqui seria fazer parte do I1 e do E11 dentro do C3.
- **O que o CONTRIBUTING pede.** Regra 6 da seção 1: card que depende de algo que ainda não existe se divide em dois, e não em dois PRs.
- **Como ficou dividido.** No `docs/backlog.md`:
  - o "Pronto quando" do C3 passou a ser "o clique escolhe o ponto e o marcador aparece nele, e o `verify` passa", com uma nota dizendo que a parte do painel foi para o E11 e por quê;
  - o E11 passou a depender do C3, o item 1 dele diz que o estado `site` do `App.jsx` já existe e é ele que vai para o `useSiteSky`, e o "Pronto quando" dele agora inclui "clicar num ponto da cena mostra o resultado no painel".
- **O que já está pronto para o E11.** O ponto escolhido chega no `App.jsx`, no estado `site`, no formato `{ lat, lon }` que o `useSiteSky` recebe. Falta só passar esse estado para o `useSiteSky` e o resultado para o painel.

## Problema conhecido: não dá para ver onde termina a área que se pode escolher

Achei isto testando no navegador. Neste PR, só o texto do aviso mudou (commit 5); o anel que mostra o limite ficou para o card C8, como combinado na revisão.

**O comportamento.** O disco com relevo que aparece na cena, em volta do polo, vai até uns 77°S. Mas só dá para escolher ponto até 84°S. Clicando no relevo entre 84° e 77°S, nada é escolhido e aparece o aviso de fora da área. Testei com um log temporário, que já tirei:
- clique perto do centro do disco: escolheu 88,6°S, e o marcador apareceu;
- clique mais para a borda do disco, ainda em cima do relevo: o ponto era uns 79°S, e deu o aviso;
- clique fora do disco, na esfera lisa: deu o aviso, como esperado.

**Por que o código está certo.** O disco é o relevo grosso (`far.bin`, 960 m), que vai até 200 km além da área porque o motor usa ele para as montanhas distantes do horizonte. O relevo fino (80 m), que o motor precisa em volta do ponto escolhido, só existe até 84°S (card E2, `areaMaxLatDeg` do `manifest.json`). Fora disso, o `useSiteSky` daria erro. Então não escolher o ponto entre 84° e 77°S está certo.

**Por que fica ruim para quem usa.** Na tela, o disco de relevo parece ser "a área clicável", e nada mostra que o limite é outro. A pessoa clica num lugar com montanha, vê o aviso dizendo "no terrain data there yet" em cima de um lugar que claramente tem relevo, e fica sem entender. De longe, o limite de 84°S fica a mais ou menos metade do raio do disco, e não há nenhuma referência visual dele. De perto, com a câmera a 35 km do polo, fica ainda pior, porque a borda do disco nem aparece.

**O que ficou combinado na revisão.** O texto do aviso mudou neste PR (commit 5). O anel em 84°S, com a latitude lida do `manifest.json`, virou o card C8. Escurecer o relevo de fora da área foi descartado, porque na tela ele se confundiria com sombra.

## Outras coisas que ficaram de fora
- Enquanto o `manifest.json` não chega, o clique não faz nada: a área não é conhecida, e o motor também não teria como calcular o ponto.
- Com o relevo na altura real, a altura do marcador vem do pixel do `far.bin` (960 m), e a malha usa um vértice a cada 2 pixels. Bem de perto, o marcador pode ficar algumas centenas de metros acima ou abaixo da superfície desenhada. Como ele é desenhado por cima de tudo, isso não esconde o marcador.
- Quem usa teclado escolhe pela lista de locais (card I2), como o card já dizia.

## Como testei

```
npm run verify

COLE AQUI AS ÚLTIMAS LINHAS DA SUA SAÍDA
```

No navegador (TROQUE PELO NAVEGADOR EM QUE VOCÊ TESTOU, com `npm run dev`):
- clique perto do polo: o marcador aparece onde cliquei;
- clique longe do polo: aparece "Landing sites can be chosen between the south pole and 84°S." e some em 5 segundos;
- arrastar para girar a Lua não troca o ponto escolhido;
- girando a Lua até o polo sair de vista, o marcador some, e volta quando o polo volta.

## Conferi

- [ ] A branch de destino é a `develop` (ou a `main`, se este é o PR do Enzo trazendo a `develop`).
- [ ] Rodei `npm run verify` e ele terminou com `OK: nenhum TODO_PREENCHER no build.`
- [ ] Texto de tela só em `src/data/`; cor, espaço e duração só pelos tokens.
- [ ] Todo dado novo tem fonte, ou `TODO_PREENCHER`, e a fonte está no `CREDITS.md`.
- [ ] Nenhum commit e nenhuma linha desta descrição têm assinatura do Claude.
- [ ] Atualizei o README (bloco "Estrutura") e o `docs/backlog.md`, se este PR muda o que está neles.

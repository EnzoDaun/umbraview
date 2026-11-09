<!-- Escreva na primeira pessoa: quem responde por este PR é você. -->

## O que mudei

Medi quanto o site pesa no meu notebook, antes e depois do C2, e registrei no card C4 do
`docs/backlog.md` os números do meu notebook, do do Enzo e do do Miguel. Com os três, o C4 fica
feito. Este PR não muda código: só o backlog.

Card do backlog: C4 · Quanto o site pesa nos notebooks da equipe

Os commits:
1. **registra a medição do C4 no notebook do Marco e cria o card C9.** Tudo em `docs/backlog.md`:
   - o estado do C4 passa a ser "medido no notebook do Marco em 08/11; falta o do Enzo e o do
     Miguel", e o "Depende de" marca o C2 como feito;
   - depois do "Pronto quando" do C4 entra o bloco da medição: o notebook (Samsung 960XFH,
     i7-13700H, 32 GB, tela de 144 Hz, Windows 11, Edge 157 e Chrome 156), os dois momentos
     medidos e duas tabelas;
   - a primeira tabela tem as colunas que o "Pronto quando" pede (notebook, data, navegador,
     tempo até a Lua, quadros por segundo) e mais o tamanho do JavaScript, com uma linha vazia
     para o Enzo e outra para o Miguel;
   - a segunda tabela é o custo de cada quadro (explicado abaixo), que é o número que diz quanto
     a cena aguenta a mais, e que o C6 vai usar;
   - o card novo **C9 · Desenhar a cena só quando algo muda**, no fim da área C.
2. **registra a medição do Enzo e do Miguel e marca o C4 como feito.** Também em
   `docs/backlog.md`:
   - as linhas do Enzo (Edge) e do Miguel (Edge e Chrome) nas duas tabelas, com a mediana das 3
     rodadas que cada um mandou nos comentários deste PR; a tabela do custo por quadro ganhou a
     coluna "Notebook";
   - as conclusões mudaram com o notebook do Miguel (ver "O que encontrei");
   - o estado do C4 vira "feito em 09/11, PR #12", e o C6 passa a depender do "C4 (feito)".

## Como medi

- Dois momentos, com `npm run build` e `npm run preview` (a versão final do site):
  (a) `0b669b9`, o merge do PR #5, só com o C1; (b) `10cd326`, a `develop` com C1, C2 e C3.
- No lugar do cronômetro e do "Frame Rendering Stats" do DevTools, que o card pedia, usei um
  script com o playwright-core e o Edge e o Chrome instalados, com a janela aberta e a placa de
  vídeo de verdade. O motivo: cronômetro na mão não pega diferença de 100 ms, e o script repete a
  mesma medida 3 vezes, com perfil limpo e janela de 1280 × 800. O script fica fora do
  repositório (ele precisa do playwright-core, que não é dependência do projeto); passo para quem
  quiser medir.
- **Tempo até a Lua:** do início da navegação até o primeiro quadro em que o canvas tem pixels
  acesos. O canvas do WebGL apaga a imagem depois de cada quadro, então o script lê o canvas logo
  depois que o React Three Fiber desenha, no mesmo quadro.
- **Quadros por segundo:** contando os `requestAnimationFrame` por 10 s com a Lua girando sozinha
  e 10 s arrastando o mouse em vai e vem no centro da cena.
- **Placa:** o notebook tem uma RTX 4050, mas os dois navegadores usaram a Intel Iris Xe (o
  WebGL informa a placa). Deixei assim, porque é o caso mais parecido com um computador qualquer.

## O que encontrei

- Os quadros por segundo ficaram em 144 em tudo, porque a minha tela é de 144 Hz e o navegador
  não desenha mais rápido que a tela. Isso diz que a cena não trava, mas não diz quanto sobra.
- Tentei tirar esse limite (`--disable-gpu-vsync --disable-frame-rate-limit`), e não serve: os
  quadros se acumulam na placa e a página para de 0,4 a 2,8 s de uma vez. Com só o
  `--disable-gpu-vsync`, continua em 144.
- Por isso medi o **custo de cada quadro**: logo depois que a cena desenha, ler 1 pixel obriga a
  placa a terminar, e o tempo disso é o trabalho de CPU e GPU do quadro. O C2 dobrou esse custo,
  de 2,9 para 6,0 ms. Numa tela de 60 Hz (16,7 ms por quadro) sobra quase 3 vezes; numa de 144 Hz
  (6,9 ms) quase não sobra. Deixei no card a proposta de usar 16,7 ms como o "aceitável" do C6.
- Do C1 para a `develop`: +28 kB de JavaScript compactado e uns 100 ms a mais até a Lua aparecer.
  A página baixa 1.595 KB, dos quais 1.258 KB são dois arquivos de relevo.
- Com a Lua parada (pedido de menos movimento), a cena continua desenhando 144 vezes por segundo,
  a 6 ms por quadro. Isso virou o card C9, em vez de entrar aqui.
- No console, só o aviso "THREE.Clock: This module has been deprecated", em todos os notebooks.

Com os notebooks do Enzo e do Miguel (mesmo commit `10cd326`, mesmo script):

| Notebook | Tela | Navegador | Até a Lua | fps girando / arrastando | Custo por quadro (mediana / p95) |
|---|---|---|---|---|---|
| Marco (Iris Xe) | 144 Hz | Edge | 345 ms | 144 / 144 | 6,0 / 6,5 ms |
| Enzo (Intel UHD) | 120 Hz | Edge | 479 ms | 120 / 119,9 | 5,2 / 12,9 ms |
| Miguel (Iris Xe) | 60 Hz | Edge | 1.925 ms | 55,2 / 59,4 | 20,5 / 23,9 ms |
| Miguel (Iris Xe) | 60 Hz | Chrome | 1.669 ms | 54,9 / 54,4 | 20,5 / 24,1 ms |

- No meu notebook e no do Enzo a cena acompanha a tela, com folga.
- **No do Miguel, a cena não fecha 60 fps:** o quadro custa uns 20 ms, acima dos 16,7 ms de uma
  tela de 60 Hz. Sem a leitura do pixel, o fps ficou em 55, com engasgos de até 116 ms
  arrastando. A Lua levou de 1,5 a 2,6 s para aparecer, com o servidor no próprio notebook.
- **Consequência para o C6:** a proposta que eu tinha feito ("aceitável = quadro abaixo de
  16,7 ms") não basta mais, porque no notebook mais fraco a cena atual já passa disso. O C6
  precisa de uma decisão da equipe antes de 14/11: sair do escopo, ou ligar só onde a máquina
  aguenta. Deixei isso escrito no C4, sem mudar o C6.

## Como testei

```
npm run verify   (últimas linhas, com trechos cortados)

> eslint . --max-warnings 0
 Test Files  26 passed (26)
      Tests  213 passed (213)
dist/assets/index-DBxSfU5k.css      3.98 kB │ gzip:   1.44 kB
dist/assets/index-CCMt7oWP.js   1,213.85 kB │ gzip: 343.03 kB
(!) Some chunks are larger than 500 kB after minification.
conferencia do build
  arquivos .js e .html lidos em dist/  2
  OK: nenhum TODO_PREENCHER no build.
```

O lint passou sem avisos. O aviso de "chunks larger than 500 kB" já aparecia antes deste PR, que não
muda código.

Como o PR só muda o backlog, não há tela nova para testar no navegador. Abri o site com
`npm run preview` e a cena continua igual à da `develop`.

## O que ficou de fora

- O tempo até a Lua foi medido com o servidor no próprio notebook. Numa rede de verdade, os
  1,26 MB de relevo vão demorar mais; isso não foi medido em nenhum dos três notebooks.
- A RTX 4050 do meu notebook não foi medida, de propósito (ver "Como medi").
- O Miguel não informou o modelo do notebook nem as versões dos navegadores; na tabela ficou
  "modelo não informado". O Enzo mediu só no Edge.
- A decisão sobre o C6, que a medição do Miguel levantou (ver "O que encontrei").

## Conferi

- [ ] A branch de destino é a `develop` (ou a `main`, se este é o PR do Enzo trazendo a `develop`).
- [ ] Rodei `npm run verify` e ele terminou com `OK: nenhum TODO_PREENCHER no build.`
- [ ] Texto de tela só em `src/data/`; cor, espaço e duração só pelos tokens.
- [ ] Todo dado novo tem fonte, ou `TODO_PREENCHER`, e a fonte está no `CREDITS.md`.
- [ ] Nenhum commit e nenhuma linha desta descrição têm assinatura do Claude.
- [ ] Atualizei o README (bloco "Estrutura") e o `docs/backlog.md`, se este PR muda o que está neles.

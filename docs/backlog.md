# Backlog

O que falta fazer, de quem é e como saber que ficou pronto. Procure o seu nome.

## Como usar este arquivo

**Quem é de dev (Enzo, Marco, Miguel).** Avise no grupo que pegou o card, crie a branch com o
código dele (`feat/i1-painel`) e siga o [CONTRIBUTING.md](../CONTRIBUTING.md). No PR que fecha o
card, troque o "Estado" dele para "feito em dd/mm, PR #n".

**Quem não é de dev (Mateus B.).** Você não usa o GitHub: o Enzo manda os seus cards em PDF, e
manda de novo quando eles mudarem. O que você precisa ler vai no fim do PDF: as fontes de dados
do projeto (anexo A) e o texto de uso de IA (anexo B). A entrega é planilha, texto, imagem ou
vídeo, numa pasta compartilhada com a equipe. Avise o Enzo quando terminar; ele marca o card como
feito e leva o resultado para o projeto. Se usar IA para gerar imagem, música, vídeo ou texto que
entra no projeto, avise o Enzo: o texto de uso de IA precisa dizer isso.

**Achou algo que não é do seu card?** Vira card novo, no fim da área certa, com o próximo
número. Não resolva no meio do card que você está fazendo.

## Calendário

| Quando | O quê |
|---|---|
| até 13/11 | Os cards abaixo. |
| 13/11 | O Space Apps publica o guia de submissão de 2026. Os cards P4, V1 e V4 se ajustam a ele. |
| 14/11, 9h, até 15/11, 23h59 (horário do evento local) | Hackathon e submissão, pela página do projeto no site do Space Apps. |

---

## Como as peças se encaixam

O site responde a uma pergunta: **num ponto da Lua, numa data, o Sol e a Terra aparecem acima
das montanhas em volta?** Quatro peças fazem isso:

- **Motor** (`src/engine/`, Enzo): faz a conta. Recebe o ponto e a data, devolve números. O
  relevo que ele usa fica em `public/data/relief/` (card E2).
- **Ponte** (`src/hooks/`, Enzo): o `useSiteSky` chama o motor quando o ponto ou a data mudam, e
  avisa a tela se está calculando, se deu certo ou se deu erro; o `useSubsolarPoint` dá a direção
  do Sol para a luz da cena.
- **Cena 3D** (`src/scene/`, Marco): a Lua na tela, com a luz do Sol vindo da direção certa.
- **Painel** (`src/panel/`, Miguel): os números do ponto escolhido, em texto, e os controles para
  escolher o local e a data.

O ponto e a data escolhidos ficam guardados no `App.jsx`, que entrega os dois para a cena e
para o painel. Quem liga isso no `App.jsx` são os cards E11 (o clique na cena) e E14 (a lista e
a data). Os cards C1 e I1 só trocam, cada um, a linha do texto vazio da própria região pelo
componente novo. Assim o Marco e o Miguel não editam as mesmas linhas ao mesmo tempo.

### O que a ponte entrega para a tela

O formato do resultado fica combinado aqui, para a cena e o painel não dependerem de como o
motor faz a conta. Ele é o que o card E3 entregou; mudar depois é card novo, avisando o Marco e o
Miguel no mesmo dia.

`useSiteSky(site, dateUtc)` recebe o ponto (`site`, um objeto com `lat` e `lon` em graus, e
`name` quando vem da lista de locais) e a data (`dateUtc`, um `Date`). Devolve `{ status, sky }`:

| Campo | Tipo | O que é |
|---|---|---|
| `status` | `'idle'`, `'loading'`, `'ready'` ou `'error'` | `idle`: nenhum ponto escolhido. `loading`: calculando. `ready`: o `sky` tem o resultado. `error`: a conta falhou. |
| `sky` | objeto, ou `null` quando o `status` não é `ready` | O resultado, nos campos abaixo. |
| `sky.sunNow.elevationDeg` | número | Altura do centro do Sol acima do plano do horizonte, em graus. Pode ser negativa. |
| `sky.sunNow.visible` | `true` ou `false` | O Sol está acima das montanhas naquela direção (pelo menos metade dele à vista). |
| `sky.earthNow.elevationDeg` | número | O mesmo, para a Terra. |
| `sky.earthNow.visible` | `true` ou `false` | Alguma parte da Terra está acima das montanhas. |
| `sky.nextSunsetUtc` | `Date` ou `null` | Quando metade do Sol some atrás das montanhas. `null` se ele não se põe no período. |
| `sky.sunFraction` | número de 0 a 1 | Quanto do Sol ficou à vista, em média, no período. |
| `sky.longestDarkHours` | número | O maior trecho seguido, em horas, com o Sol inteiro escondido. |
| `sky.landingWindows` | lista de `{ startUtc, endUtc, startsBeforePeriod, endsAfterPeriod }`: dois `Date` e dois `true` ou `false` | Trechos em que pelo menos metade do Sol e alguma parte da Terra estão à vista ao mesmo tempo. O começo e o fim caem entre duas horas, pela mesma conta do pôr do Sol: uma janela que fecha pelo Sol fecha no `nextSunsetUtc`. `startsBeforePeriod`: a janela já estava aberta no começo do período, e o `startUtc` é o começo do período, e não o nascer do Sol. `endsAfterPeriod`: a janela continua depois do fim do período, e o `endUtc` é o último instante calculado. A janela inteira dentro do período só entra se durar pelo menos `MIN_LANDING_WINDOW_HOURS` (`src/engine/config.js`); a cortada numa das pontas entra mesmo mais curta. Lista vazia se não houver nenhuma. |

O motor entrega o `sky` pronto, nesse formato: `summarizeSky`, em `src/engine/summary.js`. O
período começa na data escolhida e dura `PERIOD_DAYS` dias (`src/engine/config.js`, com o
motivo).

Um caso que parece erro e não é: `elevationDeg` negativo com `visible: true`. Do alto de um
morro, o Sol pode estar abaixo do plano do horizonte e ainda à vista, porque as montanhas em
volta são mais baixas que o ponto.

`useSubsolarPoint(dateUtc)` devolve `{ lat, lon }`, em graus: o ponto da Lua onde o Sol está a
pino naquela data. A luz da cena vem do centro da Lua na direção dele; para virar ponto 3D, ele
passa pela mesma conversão do marcador do ponto (card C3). Ele não depende do ponto escolhido: a
luz existe antes de alguém escolher um ponto e enquanto o `useSiteSky` calcula. Enquanto a data
não muda, ele devolve o mesmo objeto.

---

## E: Enzo

### E1 · Motor de cálculo

**Estado:** feito em 03/11, PR #2 e PR #3 · **Depende de:** E2 (feito), para a comparação com
a NASA

**O que entrega.** O motor em `src/engine/`, em JavaScript puro (sem React e sem acesso à
página). O caminho que a ponte (E3) usa, nesta ordem:
1. `computeHorizon` (`horizon.js`): o horizonte do ponto, a partir das camadas de relevo que
   `loadReliefLayers` (`reliefFiles.js`, card E2) monta com os arquivos do site;
2. `computeEphemeris` (`ephemeris.js`): o Sol e a Terra hora a hora;
3. `computeSeries` (`series.js`): quanto de cada um as montanhas escondem, hora a hora;
4. `summarizeSky` (`summary.js`): o `sky` no formato de "O que a ponte entrega para a tela".

Os parâmetros ficam em `config.js`.

**Pronto quando.**
- Sol e Terra batem com o SPICE do JPL com diferença de até 0,01°. Feito: `ephemeris.test.js` e
  `series.test.js`, contra `fixtures/spiceReference.json` (`scripts/references/`).
- A porcentagem de Sol no período fica perto do mapa de Mazarico et al. (CREDITS.md) nos pontos
  de referência. Feito: a comparação abaixo, com o relevo do card E2: a diferença de cada um dos
  10 pontos mais iluminados e a média de cada faixa do sorteio, que é o que o `compare-nasa.mjs`
  imprime.
- Próximo pôr do Sol e janelas de pouso conferidos em casos montados à mão. Feito:
  `series.test.js` e `summary.test.js`, inclusive que a janela de pouso não passa do pôr do Sol.
- Nenhum arquivo de `src/engine/` importa React, e o `verify` passa. Feito:
  `noBrowserDependencies.test.js`.

**Comparação com a NASA.** `node scripts/prepare-data/compare-nasa.mjs`, com o relevo do site
(`public/data/relief/`, card E2), em 30/10/2026. Os 10 pontos mais iluminados do mapa de 60 m de
Mazarico et al. 2011, NASA → nosso (diferença em pontos percentuais):

| # | Ponto | Sol | Terra |
|---|---|---|---|
| 1 | 89,475°S 137,44°O | 88,4% → 85,4% (−3,1) | 58,1% → 58,0% (0,0) |
| 2 | 89,686°S 162,94°O | 87,1% → 81,6% (−5,4) | 53,7% → 53,8% (0,0) |
| 3 | 88,809°S 123,76°L | 86,0% → 84,2% (−1,7) | 56,5% → 58,6% (+2,1) |
| 4 | 89,784°S 155,90°O | 85,5% → 83,0% (−2,5) | 56,7% → 56,7% (0,0) |
| 5 | 85,300°S 37,10°L | 83,1% → 82,0% (−1,1) | 59,9% → 63,7% (+3,8) |
| 6 | 88,665°S 68,40°O | 82,7% → 79,2% (−3,5) | 61,4% → 61,5% (0,0) |
| 7 | 86,001°S 2,06°L | 81,9% → 74,0% (−7,9) | 58,7% → 58,3% (−0,4) |
| 8 | 85,955°S 3,38°O | 81,3% → 80,2% (−1,1) | 63,3% → 64,2% (+0,9) |
| 9 | 87,988°S 166,38°O | 80,4% → 76,8% (−3,6) | 45,3% → 45,5% (+0,2) |
| 10 | 86,041°S 3,16°L | 79,6% → 68,9% (−10,7) | 59,3% → 56,8% (−2,5) |

E nos sorteios por faixa de Sol:

| Faixa | Mapa da NASA | Pontos | Erro médio no Sol | Onde a NASA dá ≥ 50% de Sol | Erro médio na Terra |
|---|---|---|---|---|---|
| 85° a 90°S | 60 m | 259 | 2,1 pts | 3,1 pts (109 pontos) | 1,2 pts |
| 84° a 85°S | 240 m | 113 | 2,6 pts | 4,3 pts (38 pontos) | 1,6 pts |

**Aberto.**
- Os pontos 7 e 10, perto de 86°S entre 2° e 3°L, ficam 8 e 11 pontos abaixo da NASA no Sol, e a
  causa não foi investigada. Com mastro de 10 m (`--mast=10`), os dois ficam a 1,3 e 1,5 pontos
  da NASA, mas o erro médio do sorteio sobe de 2,1 para 3,6 (`config.js`).
- O nosso Sol fica abaixo do da NASA: nos 10 pontos mais iluminados, em todos os 10, e o viés (a
  média da diferença, com o sinal) é de −2,5 pontos de 84° a 85°S, para um erro médio de 2,6, e de
  −0,6 de 85° a 90°S, para 2,1. A Terra vai para o outro lado de 85° a 90°S: viés de +1,2, para um
  erro médio de 1,2. Medido em 04/11/2026, na linha "viés" do `compare-nasa.mjs`. A causa não foi
  investigada.

### E2 · Dados do relevo para o site

**Estado:** feito em 03/11, PR #3 · **Depende de:** nada

**O que entrega.**
- `public/data/relief/`: o relevo do polo sul, do polo até 84°S, recortado dos arquivos LOLA da
  NASA (CREDITS.md). O fino, de 80 m por pixel, vale até 10 km do ponto e fica em 332 ladrilhos
  de 20 × 20 km, de 127 kB cada. O grosso, de 960 m, vale até 200 km e fica num arquivo só, de
  1,3 MB. São 43,5 MB no total.
- `src/engine/reliefFiles.js`: `loadReliefLayers(manifest, ponto, readFile, cache)` devolve as
  camadas que `computeHorizon` usa, baixando só o relevo grosso e os ladrilhos em volta do ponto
  (em geral 4, cerca de 0,5 MB). `isInsideReliefArea(manifest, lat)` diz se o ponto está na área.
- `scripts/prepare-data/`: o script que gera os recortes, a comparação com a NASA, a medição das
  janelas de pouso e o README para rodar tudo do zero. O script dos recortes gera os mesmos
  arquivos, byte a byte, no Windows e no Linux.

**Por que 80 m.** Medido em 29/10/2026 nos 259 pontos sorteados de 85° a 90°S
(`scripts/prepare-data/nasa-reference.json`), com um script de uma vez só, que não ficou no
repositório, e por isso estes números não se refazem por ele: o mesmo motor e os mesmos pontos,
trocando só o relevo fino (a média de 2 × 2 pixels do de 80 m, para 160 m, e o arquivo de 240 m):

| Relevo fino | Erro médio no Sol | Onde a NASA dá ≥ 50% de Sol | Ponto mais iluminado (NASA: 88,4%) |
|---|---|---|---|
| 80 m | 2,1 pts | 3,1 pts | 85,4% |
| 160 m | 3,4 pts | 6,2 pts | 78,0% |
| 240 m | 5,1 pts | 10,0 pts | 70,9% |

Com 160 m, quem mais perde são os pontos mais iluminados, que são os que interessam para pousar.

**Por que ladrilhos e por que até 84°S.** O site baixa só os ladrilhos em volta do ponto, então o
custo de um clique é o mesmo em qualquer área; a área só muda o peso do repositório (medido em
29/10/2026, também com um script de uma vez só, que não se refaz pelo repositório): até 88°S, 7 MB; até 86°S, 22 MB; até 85°S, 33
MB; até 84°S, 44 MB. A escolha de 84°S seguiu o que a NASA disse em 19/08/2022 das 13 regiões
candidatas do Artemis III: elas ficam "within six degrees of latitude of the lunar South Pole"
(fonte no CREDITS.md). Das 9 que sobraram depois, o centro de 7 fica dentro de 84°S; Peak near
Cabeus B e Nobile Rim 2 esperam o card E8 (card E16). Num arquivo só, o relevo fino até 84°S teria 46 MB para baixar antes do
primeiro clique. Comprimir os ladrilhos (gravando a diferença entre vizinhos, e depois gzip)
tiraria uns 24 MB do repositório, mas pede código para descomprimir no site; se fizer falta, a
mudança fica só em `reliefFiles.js`.

**Comparação com a NASA.** Está no card E1, feita com estes arquivos.

**Pronto quando.**
- Com os recortes, a porcentagem de Sol e de Terra fica perto do mapa de Mazarico et al.
  (CREDITS.md) nos pontos de referência, e um script refaz a comparação. Feito:
  `scripts/prepare-data/compare-nasa.mjs`, com o resultado no card E1.
- Outra pessoa da equipe roda o script do zero seguindo só o README dele. Feito: card I5, em
  12/11 (PR #29).
- O tamanho de `public/data/` e a área escolhida estão anotados neste card. Feito: "O que
  entrega" e "Por que ladrilhos e por que até 84°S".
- Nenhum arquivo passa de 50 MB. Feito: o maior é o `far.bin`, de 1,3 MB.

**Aberto.**
- Os arquivos não têm versão no nome. Se um deploy trouxer recortes novos, o navegador de quem
  já abriu o site pode juntar o `manifest.json` de uma versão com ladrilhos da outra, enquanto o
  cache dele não vence, e o tamanho igual não denuncia. Só acontece quando os recortes mudam; se
  for preciso, a saída é uma pasta por versão.
- O git guarda cada versão de cada arquivo. A versão de hoje dos recortes ocupa 31,7 MB dentro do
  `.git` (medido em 04/11/2026, com `git cat-file`), e cada geração nova que mude os ladrilhos
  soma outra versão ao histórico, mesmo substituindo a anterior. Gerar de novo arquivos idênticos,
  como no card I5, não soma nada: para o git, é a mesma versão.

### E3 · Ponte entre o motor e a tela

**Estado:** feito em 04/11, PR #4 · **Depende de:** E1 (feito) e E2 (feito)

**Para que serve.** A cena e o painel não chamam o motor direto: a ponte chama, no formato
combinado em "O que a ponte entrega para a tela". Ligar a ponte no `App.jsx` é o card E11.

**O que entrega.**
- `src/hooks/useSiteSky.js` pede a conta a `src/engine/siteSky.js`, que segue a ordem do card
  E1, lê o `manifest.json` uma vez, usa o mesmo `cache` de relevo para todos os pontos e guarda a
  última posição do Sol e da Terra (serve para qualquer ponto na mesma data) e o último horizonte
  (serve para qualquer data no mesmo ponto). A `readFile` do site (`createReliefReader`) faz o
  `fetch` dentro de `data/relief/`, a partir do endereço da página, e confere o `response.ok`.
  Ponto fora da área com relevo (`isInsideReliefArea`) dá `status: 'error'`.
- `src/hooks/useSubsolarPoint.js` dá a direção do Sol para a cena.
- A tabela de "O que a ponte entrega para a tela", com o período e o `useSubsolarPoint`.

**Pronto quando.**
- Os testes do hook cobrem os quatro `status`, com o motor de verdade (não um substituto).
  Feito: `src/hooks/useSiteSky.test.js`.
- O Marco e o Miguel foram avisados do formato final. Feito: no PR #4.

**Aberto.**
- Por enquanto, sem Web Worker. Medido em 03/11/2026, no Node, no computador do Enzo: trocar de
  ponto trava a página por uns 50 ms (o horizonte leva de 38 a 46 ms); trocar de data, até uns
  80 ms (a posição do Sol e da Terra, `src/engine/config.js`). Se a página travar nos notebooks
  da equipe (dá para ver junto com o card C4), a conta vai para um Web Worker sem mudar o motor,
  porque o `siteSky.js` não toca na página. No Worker, endereço relativo é lido a partir do
  arquivo do Worker, e não da página: a página passa o endereço completo da pasta,
  `new URL('data/relief/', document.baseURI).href`.

### E4 · GitHub quando o repositório ficar público

**Estado:** a fazer · **Depende de:** o repositório ficar público

**Para que serve.** No plano gratuito do GitHub, o site publicado (Pages) e a proteção das
branches só existem em repositório público.

**O que fazer.**
1. Settings > Pages > Source: **GitHub Actions**. Conferir o endereço do site numa janela
   anônima.
2. Settings > Rules: proteger a `main` e a `develop` com PR obrigatório, 1 aprovação, as duas
   verificações do CI (`lint, testes, build e conferência` e `sem assinatura do Claude`)
   obrigatórias, sem force push e sem apagar a branch.
3. Numa sessão do Claude Code no Windows, pedir a ele um `git commit` e ver a recusa
   `Bloqueado pela politica do repositorio`. O gancho só foi testado no Linux até agora.
4. Na hora da entrega (15/11, 23h59): uma tag na `main` marcando o que foi submetido.

**Pronto quando.** O site abre no endereço do Pages, e um push direto na `main` é recusado.

### E5 · Corrigir os documentos do projeto no claude.ai

**Estado:** feito em 05/11, PR #7 · **Depende de:** nada

**Para que serve.** Os três documentos do projeto no claude.ai (o projeto, o escopo e o roteiro
da apresentação para a equipe) são o que a equipe lê fora do repositório. Eles precisam dizer o
nome atual do desafio e o que a FAQ de 2026 diz sobre começar antes do hackathon.

**O que entrega.**
- As abas do projeto e do escopo com o nome "Lunar Landing Site Navigator". O nome antigo fica só
  como "(antes, CLPS Lunar Mission Browser)", porque o endereço da página do desafio ainda usa ele.
- No roteiro, a resposta a "Pode programar antes do evento?" cita a FAQ ("Teams are not allowed
  to begin working on the challenges prior to the hackathon", conferida em 05/11/2026) e a decisão
  da equipe de começar pela orientação do orientador e da organização do evento de 2025. No
  escopo, a tabela "Riscos" registra esse risco como aceito.

**Atenção.** A página da FAQ monta o texto pelo JavaScript: uma leitura da página sem navegador
não acha essa frase, e foi assim que um documento chegou a dizer que a FAQ não proibia. Regra do
site do Space Apps se confere no navegador.

### E6 · Revisar PRs e levar a `develop` para a `main`

**Estado:** contínuo. Quem revisa o quê está no CONTRIBUTING.md, seção 1.

### E7 · Teste dos ganchos numa pasta que já é repositório

**Estado:** feito em 05/11, PR #6 · **Depende de:** nada

**Para que serve.** O teste "fora de um repositório git, avisa e não quebra o npm install", em
`scripts/hooks.test.js`, roda o `install-hooks.mjs` numa pasta sem git. Se essa pasta fica
dentro de outro repositório, o git acha o de fora: o teste falha, e o instalador grava
`core.hooksPath = .githooks` nesse repositório, no git de quem rodou o `verify`. Era o caso da
máquina do Marco, em que a pasta temporária fica dentro da pasta de usuário, que é um repositório
git (revisões dos PRs #2, #4 e #5).

**O que entrega.** O teste monta o caso de propósito, em toda máquina: cria um repositório na
pasta temporária e a pasta sem git dentro dele, e roda o instalador com `GIT_CEILING_DIRECTORIES`
apontando para esse repositório, o que faz o git parar de procurar antes de entrar nele. O teste
confere que, assim, o git não acha o repositório a partir da pasta sem git, e que o repositório
continua sem `core.hooksPath` depois do instalador.

**Pronto quando.**
- O teste passa com a pasta temporária dentro de um repositório git. Feito: o próprio teste monta
  esse repositório, então todo `verify` e o CI conferem.
- O `verify` passa. Feito.

**Conferido** em 05/11/2026: no Linux, também com a pasta temporária do sistema dentro de um
repositório; no Windows do Enzo, no `verify` de cada commit do PR #6; e no Windows do Marco, na
revisão do PR #6.

### E8 · Relevo dos locais da lista fora do polo

**Estado:** a fazer · **Depende de:** P1 (a lista de locais)

**Para que serve.** O relevo do site vai do polo até 84°S (card E2). Os outros locais da
planilha do P1 (Apollo, Luna, Surveyor, Chang'e, Chandrayaan-3, SLIM, CLPS) e duas regiões
candidatas do Artemis III (Peak near Cabeus B e Nobile Rim 2, card E16) ficam fora dele, e
eles ficam fora da lista até este card.

**O que fazer.**
1. No script de `scripts/prepare-data/`, um recorte por local da lista ao norte de 84°S, dos
   arquivos LOLA da Lua inteira (CREDITS.md): o fino até 10 km do local e o grosso até 200 km.
2. No site, montar as camadas desses recortes com `cylindricalGridRelief`
   (`src/engine/relief.js`).
3. Escolher uma referência de fora para conferir o resultado: os mapas de Mazarico só cobrem o
   polo.
4. As duas regiões do Artemis III entram na lista como as outras sete (card E16): o centro do
   contorno do USGS, com "(center)" no nome. Em `src/data/sites.test.js`, o teste da área com
   relevo e o que confere quais regiões estão na lista usam o `areaMaxLatDeg`: os dois mudam junto
   com a regra da área.
5. Os 4 locais do NASEM da planilha também não têm data de pouso: com `landedAtUtc: null`, eles
   cairiam no grupo "Artemis III candidate regions" da lista (`src/panel/SiteList.jsx`). Eles
   precisam de um grupo próprio antes de entrar.

**Pronto quando.** Escolher qualquer local da lista mostra o resultado no painel, o tamanho dos
recortes está anotado aqui, e a conferência também.

### E9 · Testes do motor sem o navegador simulado

**Estado:** feito em 11/11, PR #25 · **Depende de:** nada

**Para que serve.** Todos os testes rodam dentro do jsdom, o navegador simulado, inclusive os do
motor, que não usam tela. Em 29/10/2026, o Vitest avisou que criar o jsdom levou 67% do tempo
que ele mediu.

**O que fazer.** Pôr `// @vitest-environment node` no topo dos testes de `src/engine/` e de
`scripts/` (conferir antes que o Vitest 5 aceita esse comentário), e medir o tempo do
`npm run test` antes e depois.

**Pronto quando.** O `verify` passa e os dois tempos estão anotados aqui.

**Medido** em 10/11/2026, no Linux (2 processadores), com a suíte inteira (`npx vitest run`, 241
testes; a duração é a do relatório JSON do Vitest), três rodadas de cada:

| Ambiente dos 12 arquivos de teste de `src/engine/` e `scripts/` | Duração da suíte |
|---|---|
| jsdom, o navegador simulado (antes) | 30,3 a 34,7 s |
| Node (depois) | 22,1 a 24,0 s |

O Vitest 5 respeita o comentário: um teste com ele vê o `document` indefinido; sem ele, vê o do
jsdom. A regra para teste novo nessas pastas está no `vite.config.js`.

### E10 · Nome dos scripts em inglês

**Estado:** feito em 06/11, PR #10 · **Depende de:** nada

**Para que serve.** O CLAUDE.md pede nome de arquivo em inglês, e quatro arquivos de `scripts/`
estavam em português.

**O que entrega.** Os quatro com nome em inglês:
- `conferir-build.mjs` → `check-build.mjs`, e a função `conferirBuild` → `checkBuild`;
- `conferir-build.test.js` → `check-build.test.js`;
- `ganchos.test.js` → `hooks.test.js`;
- `instalar-ganchos.mjs` → `install-hooks.mjs`.

O `package.json` (scripts `conferir` e `prepare`), o README, o `.githooks/commit-msg` e o card E7
citam os nomes novos. O comando continua `npm run conferir`. Os nomes de variável em português
dentro dos arquivos ficaram para o card E12.

**Pronto quando.** Nenhum nome em português em `scripts/`, e o `verify` e o CI passam.

**Conferido:** o `verify` passa em cada commit do PR #10, no Linux e no Windows do Enzo, com o
mesmo número de testes da `develop`; e o `npm run prepare` liga os ganchos pelo
`install-hooks.mjs`.

### E11 · Ligar o clique na cena ao painel

**Estado:** feito em 10/11, PR #19 · **Depende de:** E3 (feito), C1 (feito), C3 (feito) e I1 (feito)

**Para que serve.** É aqui que o site passa a responder: o ponto clicado na cena (card C3) vai
para o `useSiteSky`, e o painel (card I1) mostra o céu dele. A lista de locais e o controle de data
ficaram para o card E14, porque dependem do I2 e do I4, que ainda não existiam
(CONTRIBUTING.md, seção 1, regra 6).

**O que entrega.** No `App.jsx`, o ponto do clique (`site`) e a data vão para o `useSiteSky`, e o
`{ status, sky }` que ele devolve vai para o `SitePanel`. A data é a hora em que a página abriu, a
mesma da luz da cena, para a sombra e os números falarem do mesmo instante, até o E14 ligar o
controle de data.

**Pronto quando.** Clicar num ponto da cena mostra o resultado dele no painel, e o `verify` passa.
Feito: `src/App.test.jsx` escolhe um ponto pelo `onSelect` que o `App` entrega à cena (o clique
não dá para simular sem WebGL) e confere que o painel mostra o aviso de calculando no mesmo render
e depois, número por número, o céu que o motor dá para aquele ponto na hora em que a página abriu.
Com o céu calculado 6 h depois, o teste reprova: a altura da Terra muda no painel.

**Conferido** em 10/11/2026, no `npm run build` + `npm run preview`, num Chromium sem placa de
vídeo (SwiftShader), com o pedido de menos movimento ligado: um clique perto do polo põe o
marcador, o painel mostra o aviso de calculando na hora e os números do ponto depois; um clique
fora da área mostra o aviso da cena e não muda o painel. No console, só o aviso de sempre do
`THREE.Clock`.

### E12 · Nomes de variável e função em inglês

**Estado:** a fazer · **Depende de:** E10 (feito), e de não haver PR aberto nos arquivos que ele muda

**Para que serve.** O CLAUDE.md pede nome de variável e função em inglês e, logo abaixo, pede
para seguir o estilo dos arquivos que já existem. Enquanto houver nome em português no código, as
duas regras brigam: quem usa um arquivo como modelo, pessoa ou Claude, copia o português junto.
Veio do PR #10 (card E10), que trocou só os nomes dos arquivos.

**O que fazer.** Trocar para inglês os nomes de constante, variável e função declarados em
português, e os campos que uma função devolve (o `checkBuild` devolve `lidos` e `problemas`), sem
mudar o que o código faz. Contagem de 06/11/2026, nas declarações com `const`, `let` e `function`
(a lista de palavras em português foi feita à mão, então pode faltar algum nome):
- código que roda: `scripts/check-build.mjs` (9 nomes) e `scripts/install-hooks.mjs` (3);
- testes: outros 20 arquivos de `src/` e `scripts/`. Os que têm mais são
  `src/engine/series.test.js` (22), `src/scene/reliefMesh.test.js` (15),
  `src/readmeStructure.test.js` (14) e `scripts/hooks.test.js` (13).

Um commit por pasta, para a revisão ler só troca de nome, sem caçar mudança de comportamento no
meio. Comentário e texto de `describe`/`it` continuam em português (CLAUDE.md). A troca mexe em
muitas linhas de cada arquivo e briga com qualquer outro PR no mesmo arquivo: por isso a
dependência acima.

**Pronto quando.** Os nomes declarados nesses arquivos estão em inglês, o `npm run test` passa
com o mesmo número de testes de antes da troca, e o `verify` passa.

### E13 · O motivo do erro, para o painel

**Estado:** fechado em 11/11, PR #26, sem código · **Depende de:** nada

**Por que fechou.** O ponto fora da área não chega mais ao painel: o clique na cena barra (card
C3), e a lista só tem locais dentro dela (card I2, com o teste da área no `sites.test.js`). O
único erro que sobra é a conta que falhou, e o texto de erro do painel passou a falar só dela
(card E14). O motor continua recusando o ponto fora da área, e o motivo continua indo para o
console.

**Para que serve.** O `status: 'error'` do `useSiteSky` junta dois casos que pedem respostas
diferentes de quem usa:
- **o ponto fora da área com relevo:** o `loadReliefLayers` recusa antes de baixar qualquer
  ladrilho (`src/engine/reliefFiles.js`). Tentar de novo não adianta; outro ponto, dentro da
  área, adianta;
- **a conta que falhou:** um arquivo de relevo que não chegou (o `createReliefReader`, em
  `src/hooks/useSiteSky.js`, confere o `response.ok`) ou que chegou com o tamanho errado
  (`reliefFiles.js`). Aqui o ponto pode estar certo.

O hook manda o motivo só para o console (`useSiteSky: a conta do céu falhou`), e a tela recebe só
o `status`. Por isso o texto de erro do painel diz "It may be outside the area we have terrain
for": o "may" é porque o painel não sabe qual dos dois aconteceu. O clique na cena já barra o
ponto fora da área antes de chegar ao hook (card C3), e a lista (I2) só traz locais dentro dela: o
`src/data/sites.test.js` reprova o local ao norte de 84°S. Veio do PR #11 (card I1).

**O que fazer.**
1. A ponte devolve o motivo junto com o `error`. Como o motor separa os dois casos fica com o
   Enzo; comparar o texto da mensagem do `Error` não serve, porque quebra na primeira vez que
   alguém reescrever a frase.
2. O campo novo entra na tabela de "O que a ponte entrega para a tela", avisando o Marco e o
   Miguel no mesmo dia.
3. No painel (`src/panel/SitePanel.jsx`), dois textos em `src/data/panel.js` no lugar do `error`
   de hoje: o do ponto fora da área pede outro ponto, dentro da área; o da falha não pode
   prometer que escolher o mesmo ponto de novo resolve, porque hoje isso não refaz a conta (card
   E14, item 3).

**Como testar.** Em `src/hooks/useSiteSky.test.js`, o teste do ponto fora da área passa a
conferir o motivo, e um caso novo cobre o arquivo que não chega. Em `src/panel/SitePanel.test.jsx`,
um texto para cada motivo.

**Pronto quando.** O painel mostra um texto para o ponto fora da área e outro para a falha da
conta, a tabela da ponte tem o campo novo, os testes acima passam e o `verify` passa.

### E14 · Ligar a lista e a data no `App.jsx`

**Estado:** feito em 11/11, PR #26 · **Depende de:** E11 (feito), I2 (feito) e I4 (feito)

**Para que serve.** Com o E11, o site responde ao clique na cena, sempre na hora em que a página
abriu. Este card liga os outros dois controles: a lista de locais (I2), que também é o jeito de
escolher pelo teclado, e a data e a hora (I4). Veio da divisão do E11, no PR #19.

**O que fazer.**
1. No `App.jsx`, a data vira um estado que o `onChange` do controle de data (I4) muda, e o
   `onSelect` da lista (I2) chama o mesmo `setSite` do clique na cena. A cena e o painel continuam
   recebendo a mesma data.
2. Não trocar a data guardada por uma data inválida: uma data inválida (`Invalid Date`) não tem
   posição do Sol no motor, e o `useSubsolarPoint` derruba a tela. O controle do I4 não chama o
   `onChange` com o campo vazio (PR #17).
3. Decidir o que a tela oferece quando o `useSiteSky` devolve `error`. Escolher de novo o mesmo
   ponto na mesma data não refaz a conta, porque o pedido é o mesmo; trocar de ponto ou de data
   refaz, e o `siteSky.js` tenta de novo o arquivo que falhou. Um botão de "tentar de novo"
   precisa de um jeito novo de pedir a mesma conta ao hook. O motivo do erro aparece no console
   (`useSiteSky: a conta do céu falhou`).
4. Digitar o ano no campo do I4 pode pedir uma conta por tecla: digitando 2026, o campo passou
   por 0002, 0020 e 0202, e cada um é uma data válida (visto pelo Miguel no PR #17, com a cena
   sozinha; com o painel ligado, ainda não foi testado). Cada troca de data refaz a posição do Sol
   e da Terra do período (`PERIOD_DAYS`, `src/engine/config.js`, com o tempo medido). Medir com o
   painel ligado antes de decidir o que fazer.
5. Os dois comentários do controle de data que citam o E11 (o de quem guarda a data e o do
   "item 2") passam a citar este card.

**Como ficou.**
- A lista mostra o local escolhido e volta ao "Choose a site…" quando o ponto vem do clique na
  cena: sem isso, ela continuaria mostrando o último local com o painel em outro ponto.
- Item 2: a guarda ficou no `DateTimeControl.jsx`, junto da do campo vazio. Além do campo vazio,
  o ano depois de 9999 também dá data inválida: o campo aceita, mas o `Date` só lê esse ano com um
  `+` na frente.
- Item 3: o texto de erro do painel diz para recarregar a página, que sempre refaz a conta. Um
  botão de "tentar de novo" precisaria de um jeito novo de pedir a mesma conta ao hook, só para
  fazer o que recarregar já faz. O E13 fechou junto.
- Item 4: não precisou de nada. Cada troca de data custa uma conta curta, e o `useSiteSky` já
  descarta o resultado de um pedido velho (medido abaixo).

**Conferido** em 11/11/2026, no Chromium do Playwright (153, sem placa de vídeo: o WebGL é por
software), com o build no `npm run preview`:
- O primeiro Tab da página chega à lista, com o anel de foco; a seta para baixo escolhe o Athena
  (IM-2), o marcador aparece na cena e o painel mostra o céu dele.
- Com o Athena escolhido, digitar 2027 no ano: o campo passou por 0002, 0020, 0202 e 2027, e cada
  um pediu uma conta, de 23 a 32 ms entre o "Calculating…" e os números. Entre uma tecla e outra a
  página levou de 0,7 a 1,4 s: é o quadro da cena nesse Chromium sem placa de vídeo (617 a 867 ms
  por quadro, medido com a Lua girando), e não a conta. Com placa de vídeo, o quadro é de uns 6 ms
  (card C4).
- Digitar 10000 no ano: o campo não aceitou e ficou em 2027. A guarda do ano depois de 9999 está
  provada no teste do `DateTimeControl`; em outro navegador, não conferi.
- O clique na Lua depois da lista faz a lista voltar ao aviso, e escolher o Athena de novo volta a
  mostrar o céu dele.
- Com os ladrilhos de relevo respondendo 404, o painel mostra "Couldn't calculate this site.
  Reload the page to try again." e o motivo vai para o console.
- O console ficou sem erro, fora os do 404 de propósito.

**Pronto quando.** Escolher um local na lista ou trocar a data mostra o resultado no painel e a
luz certa na cena, também só com o teclado, e o `verify` passa.

### E15 · Testes que estouram o tempo no Windows de vez em quando

**Estado:** feito em 14/11, PR #32 · **Depende de:** nada

**Para que serve.** O teste "aponta o core.hooksPath para .githooks num repositório git"
(`scripts/hooks.test.js`) abre o `git` e o `node` três vezes, e o Vitest dá 5 s para cada teste.
No Windows do Enzo ele costuma levar menos de 1 s, mas em 10/11/2026, entre 16h30 e 17h10, levou
6,3 s e 9,4 s dentro do `verify`, e reprovou os dois; numa terceira rodada, outro teste da suíte
falhou, sem o nome registrado. Teste que passa ou não conforme o computador está ocupado ensina a
rodar de novo até passar (card C7). Veio do PR #25 (card E9).

**O que se sabe** (no Windows do Enzo, com o relatório JSON do Vitest):
- Sozinho, o arquivo dos ganchos dá de 212 a 238 ms nesse teste, no Node ou no jsdom (10/11/2026).
- Na suíte inteira, em 11/11/2026, deu de 562 a 698 ms em 6 rodadas: com os ganchos no Node ou no
  jsdom, e logo depois do `lint` ou não. Não é o card E9 nem a ordem do `verify`.
- A causa da lentidão de 10/11 não foi achada.

**O que fazer.** Dar a todo teste da suíte um limite de tempo maior que os 5 s do Vitest, com o
motivo no comentário (o "Como ficou" diz por que a suíte toda, e não só os testes que abrem
processos), e medir no notebook do Miguel, onde o site foi o mais lento no card C4. Se a falha
voltar, registrar o nome de todo teste que falhar.

**Como ficou.**
- Todo teste da suíte tem 30 s de limite, e não os 5 s do Vitest: o `testTimeout` do
  `vite.config.js`, com o motivo no comentário.
- O limite vale para a suíte, e não só para os testes que abrem processos, por causa da medição de
  13/11/2026, às 21h04 (abaixo). Logo depois de um `npm ci`, reprovou também um teste que só lê o
  disco: o "o relevo fino lido pelo site bate com o arquivo da NASA", de
  `src/engine/reliefFiles.test.js`. A lentidão pega a máquina inteira, e dar mais tempo teste a
  teste viraria caça ao teste lento.
- O custo: um teste assíncrono que trave leva 30 s para reprovar, e não 5 s.

**Medido** em 12, 13 e 14/11/2026, no Windows. "O teste" é o "aponta o core.hooksPath para
.githooks num repositório git"; "o arquivo" é o `scripts/hooks.test.js` inteiro. "Limite" é o
limite de cada teste naquela rodada: os 5 s do Vitest, 30 s só nos testes dos ganchos que abrem
processos, ou 30 s na suíte toda (como ficou).

| Quando | Onde | Como | Limite | O teste | O arquivo |
|---|---|---|---|---|---|
| 12/11, 14h38 | computador do Enzo | `verify` logo depois do `npm ci` | 5 s | 17.381 ms (reprovou) | 32 s |
| 12/11, 15h09 a 15h11 | computador do Enzo | `verify` | 5 s | 520 a 649 ms | 8,0 a 13,4 s |
| 12/11, 15h30 | computador do Enzo | `verify` logo depois do `npm ci` | ganchos, 30 s | 1.293 ms | 19,9 s |
| 13/11 | computador do Enzo | 4 `verify` | 5 s | 548 a 775 ms | 11 a 12 s |
| 13/11, 15h48 | desktop do Miguel | `verify` | ganchos, 30 s | 415 ms | 7,3 s |
| 13/11, 21h04 | computador do Enzo | `verify` logo depois do `npm ci` | 5 s | 994 ms | 22,0 s |
| 13/11, 21h08 | computador do Enzo | `verify`, sem `npm ci` | 5 s | 487 ms | 10,8 s |
| 13/11, 21h23 | notebook do Miguel | `verify` logo depois do `npm ci` | ganchos, 30 s | 783 ms | 19,2 s |
| 13/11, 21h24 | notebook do Miguel | 3 rodadas só do arquivo | ganchos, 30 s | 380 a 477 ms | 9,9 a 10,1 s |
| 14/11, 00h10 a 00h11 | computador do Enzo | 3 `verify`, sem `npm ci` | suíte, 30 s | 636 a 694 ms | 12,1 a 14,2 s |

- Às 21h04, reprovaram pelos 5 s dois outros testes:
  - o "aceita mensagem normal" do commit-msg, com 5.400 ms (417 ms às 21h08);
  - o do relevo fino, com 5.011 ms (503 ms às 21h08).

  A suíte inteira levou 39,5 s, contra 17,6 s às 21h08.
- Nas três vezes em que o `verify` rodou logo depois de um `npm ci` no computador do Enzo, ficou
  lento, e reprovou em duas. A causa não foi provada.
- No notebook do Miguel, o teste mais lento levou 1,5 s, e a suíte levou 47 s.

**Pronto quando.** Todo teste da suíte tem um limite de tempo maior que os 5 s do Vitest, com o
motivo escrito; o `verify` passa no Windows de quem fizer e no do Miguel; e os tempos medidos estão
anotados aqui.

### E16 · As regiões candidatas do Artemis III na lista

**Estado:** feito em 12/11, PR #27 · **Depende de:** I2 (feito) e E14 (feito)

**Para que serve.** A lista de locais (card I2) separa as regiões candidatas do Artemis III num
grupo próprio, "Artemis III candidate regions", mas saiu só com o IM-2, porque as regiões não
tinham coordenada. Veio do card I7, que passou para a área E porque o Enzo fez.

**O ponto de partida.**
- Os nomes das 9 regiões vêm da NASA
  ([NTRS 20250011660](https://ntrs.nasa.gov/citations/20250011660)). Esse documento não dá
  coordenada, e a NASA não dá um ponto de cada região.
- O USGS publicou o contorno de cada uma (McClernan 2024, CREDITS.md). Na projeção polar dos
  arquivos LOLA, cada contorno é um retângulo de 16 a 77 km de lado.

**Como ficou.**
- `measurePolarPolygon` (`src/engine/geometry.js`) dá o centro e a área de um contorno, feitos na
  projeção polar. A média das latitudes e longitudes erraria perto do polo e em cima da longitude
  180°.
- A coordenada de cada região na lista é o centro do contorno do USGS: o meio do retângulo que o
  USGS desenhou, calculado de uma fonte, com o método no código e testado. O nome leva
  "(center)", para o painel não parecer um ponto de pouso oficial.
- O contorno copiado fica em `scripts/references/artemis-regions.geojson`, e dois testes de
  `src/data/sites.test.js` amarram a lista a ele: a coordenada e o nome de cada região são os do
  contorno, e a lista traz toda região com o centro dentro da área com relevo, e só elas.
- Entram 7 das 9. Peak near Cabeus B (centro em −83,6375°) e Nobile Rim 2 (−83,9541°) ficam ao
  norte de 84°S e esperam o card E8. A Mons Mouton Plateau entra pelo centro (−84,3347°), mas a
  região vai até 82,85°S.
- O card E2 e o `scripts/prepare-data/prepare_relief.py` diziam que até 84°S cabiam as regiões do
  Artemis III: valia para as 13 de 2022. Os dois foram corrigidos.

**Conferido** em 12 e 13/11/2026:
- A área calculada de cada contorno bate com a `Area_km2` do USGS nas 9 regiões. O Marco refez os
  7 centros em Python, sem o `measurePolarPolygon`, e eles batem com o `sites.js` até a 4ª casa
  decimal (13/11).
- A caixa que a
  [página do mosaico da LROC](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_ROI_CABEUSPKLO2) dá
  para a Peak near Cabeus B (latitude de −84,06 a −83,21, longitude de −72,47 a −64,80) bate com os
  cantos do contorno do USGS. A página foi achada pelo Miguel em 11/11, e a caixa, conferida pelo
  Marco em 13/11.
- No Chromium do Playwright, com o build no `npm run preview`: as 7 regiões aparecem no grupo, em
  ordem alfabética; escolher Haworth (center) põe o marcador na cena e mostra o céu no painel;
  digitar "h" com a lista em foco pula para Haworth; o console ficou sem erro.
- Cada teste novo pega o erro dele: trocar um dígito de uma coordenada, ou trocar os nomes de
  Haworth e Malapert Massif entre si, reprova só o teste da coordenada e do nome; tirar uma região
  reprova só o teste de quais regiões estão na lista; pôr a Nobile Rim 2 reprova esse e o da área
  com relevo.

**Pronto quando.** As regiões com o centro dentro da área aparecem no grupo "Artemis III
candidate regions", os testes de `src/data/sites.test.js` passam e o `verify` passa.

---

## C: Marco

Além dos cards, o Marco revisa os PRs do Enzo (CONTRIBUTING.md, seção 1).

### C1 · A Lua em 3D, girando com o mouse

**Estado:** feito em 05/11, PR #5 · **Depende de:** nada

**Para que serve.** A região da esquerda da tela mostra a Lua em 3D, para a pessoa ver onde fica
o ponto escolhido e de que lado vem a luz do Sol. Este card faz só a base: a Lua, a luz e a
câmera. O relevo de verdade e a sombra das montanhas ficam no C2; o clique no C3.

**O que a pessoa vê quando o card estiver pronto.** Na região "Lunar scene", ocupando a região
inteira, uma esfera cinza iluminada de um lado só, por uma luz que faz o papel do Sol. Arrastando
com o mouse, a Lua gira; com a roda do mouse, aproxima e afasta. A câmera começa olhando para o
polo sul, porque é lá que o produto se concentra.

**O que fazer.** As bibliotecas (three, `@react-three/fiber` e `@react-three/drei`) já estão no
`package.json`; não instale nada.
1. `src/scene/LunarScene.jsx`, com um `<Canvas>` do React Three Fiber contendo:
   - a Lua: um `<mesh>` com `<sphereGeometry args={[1, 64, 64]} />` e `<meshStandardMaterial />`;
   - o Sol: um `<directionalLight>` numa direção fixa por enquanto (a direção certa vem do motor,
     no C2);
   - um `<ambientLight>` bem fraco, para o lado escuro não sumir de todo;
   - os controles: `<OrbitControls>` do Drei, com `enablePan={false}` (arrastar não tira a Lua do
     centro) e limites de zoom (`minDistance` e `maxDistance`);
   - a câmera começando abaixo da esfera: `camera={{ position: [0, -3, 0.01] }}` no `<Canvas>`.
2. As cores da Lua e da luz são tokens novos no `src/styles/tokens.css` (por exemplo
   `--color-moon` e `--color-sunlight`). O componente lê com
   `getComputedStyle(document.documentElement).getPropertyValue('--color-moon').trim()`. Nada de
   `#hex` no componente.
3. `src/scene/LunarScene.css`: o Canvas ocupa o tamanho do elemento em volta dele. Se esse
   elemento não tiver altura, a cena fica com 150 px (visto num rascunho em 29/10/2026). Dê a ele
   `flex: 1` dentro da região.
4. Menos movimento: `src/hooks/usePrefersReducedMotion.js` devolve `true` quando a pessoa pediu ao
   sistema menos animação (`window.matchMedia('(prefers-reduced-motion: reduce)')`). Com `true`:
   `autoRotate={false}` e `enableDamping={false}` (sem o deslizar depois de soltar o mouse). Sem o
   pedido, um giro lento automático pode ficar.
5. `src/data/scene.js`: o nome da cena para leitor de tela, em inglês, dizendo o que é e como
   usar (por exemplo "3D view of the Moon. Drag to rotate, scroll to zoom."). Ele vai no
   `aria-label` do elemento em volta do Canvas, com `role="img"`.
6. No `App.jsx`, trocar a linha `<p className="app__empty">{app.scene.empty}</p>` por
   `<LunarScene />`, e tirar o `scene.empty` de `src/data/app.js`.
7. Os arquivos novos no bloco "Estrutura" do README.

**Como testar** (`src/scene/LunarScene.test.jsx`). Os testes rodam no jsdom, que não tem WebGL
nem `matchMedia`. Troque as bibliotecas 3D por substitutos e simule o pedido de menos movimento:

```jsx
const controles = vi.fn()
vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => <div data-testid="canvas">{children}</div> }))
vi.mock('@react-three/drei', () => ({ OrbitControls: (props) => { controles(props); return null } }))

function sistemaPede(menosMovimento) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: menosMovimento, addEventListener: vi.fn(), removeEventListener: vi.fn() })
}
```

Casos: o nome acessível vem de `src/data/scene.js`; com `sistemaPede(true)`, os controles recebem
`autoRotate: false` e `enableDamping: false`; com `sistemaPede(false)`, `autoRotate: true`. Esse
jeito de testar foi conferido num rascunho em 29/10/2026: os testes passam, o lint passa e o
build sai.

**Pronto quando.**
- No `npm run dev`, a Lua aparece ocupando a região, gira arrastando e aproxima com a roda.
- Com o pedido de menos movimento ligado (no Chrome ou no Edge: DevTools > Rendering >
  "Emulate CSS media feature prefers-reduced-motion" > reduce), a Lua não gira sozinha.
- Os testes acima passam e o `verify` passa.

### C2 · O relevo do polo sul e a sombra das montanhas

**Estado:** feito em 06/11, PR #8 · **Depende de:** C1 (feito) e E2 (feito); a direção do Sol
já está pronta (`useSubsolarPoint`, card E3)

**Para que serve.** Uma esfera lisa não mostra por que um ponto fica no escuro. Com o relevo de
verdade perto do polo e a luz vindo da direção certa, a pessoa vê as montanhas fazendo sombra,
que é o assunto do produto.

**O que fazer.**
1. Montar uma malha com altura, encaixada na esfera, a partir do relevo grosso do E2:
   `public/data/relief/far.bin`, 802 × 802 alturas em `int16` (meio metro por unidade), 960 m por
   pixel, linha a linha a partir da de cima, na projeção polar dos arquivos LOLA. Onde a grade
   fica está no campo `far` do `manifest.json`, e `polarXYToUnit` (`src/engine/geometry.js`)
   converte o x/y da projeção em ponto da Lua.
2. A direção da luz vem do `useSubsolarPoint(dateUtc)` (`src/hooks/useSubsolarPoint.js`; o
   formato está em "O que a ponte entrega para a tela"): a luz sai do centro da Lua na direção
   do ponto que ele devolve.
3. Ligar sombra: `shadows` no `<Canvas>`, `castShadow` na luz, `castShadow` e `receiveShadow` na
   malha.
4. Decidir a escala: montanhas de alguns quilômetros numa Lua de 1.737 km de raio quase não
   aparecem. Ou a altura é exagerada (e a tela diz que está exagerada, com o texto em
   `src/data/scene.js`), ou a câmera chega perto do polo.
   **Decidido em 06/11 (Marco): altura real, e a câmera chega a uns 35 km do polo.** Exagerar a
   altura alonga a sombra na mesma proporção: com o Sol a 1 ou 2 graus do horizonte, a cena
   mostraria sombra em pontos onde o motor diz `visible: true`, e o "Pronto quando" abaixo não
   fecharia.

**Pronto quando.** Em três pontos combinados com o Enzo, numa mesma data, a cena mostra luz onde
o motor diz `visible: true` e sombra onde diz `false`; e o `verify` passa.

Feito em 06/11/2026, com os três pontos que o Enzo calculou com o motor para 14/11/2026, 00:00
UTC (revisão do PR #8). A cena foi desenhada no Chromium com essa data e a câmera a uns 7 km
acima de cada ponto, olhando para baixo; o número é o brilho no centro da imagem, de 0 a 255 (só
a luz fraca do lado escuro dá uns 5):

| Ponto | Lat, lon | Motor | Cena com sombra | Cena sem sombra (controle) |
|---|---|---|---|---|
| 1 | −86,219°, 154,92° | luz (folga +7,80°) | 51: luz | 51 |
| 2 | −87,097°, 40,99° | sombra (folga −17,08°) | 5: sombra | 8 |
| 3 | −85,445°, −175,65° | sombra (folga −2,11°) | 5: sombra | 87 |

O controle desliga a sombra e deixa só a inclinação do chão. No ponto 3, é a sombra da montanha
que escurece o ponto: sem ela, ele fica claro. No ponto 2, a encosta já está virada para o lado
contrário do Sol, e a sombra só completa. O `verify` passa no PR #8.

**Aberto.**
- Com o Sol rasante, a sombra perde precisão. Um pixel da sombra tem 424 m de lado, de frente
  para a luz, e cobre uns 424 m / tan(altura do Sol) no chão, na direção do Sol: cerca de 14 km
  com o Sol a 1,8°. Uma borda de sombra pode andar por essa distância (conta do Enzo, na revisão
  do PR #8; não medido na cena). Por isso os pontos da conferência acima têm folga grande.

### C3 · Escolher um ponto clicando na Lua

**Estado:** feito em 06/11, PR #9 · **Depende de:** C1 (feito), C2 (feito) e E2 (feito)

**Para que serve.** Além da lista de locais (I2), a pessoa pode clicar em qualquer ponto da área
liberada e ver o resultado dele.

**O que fazer.**
1. `src/scene/coordinates.js`, com duas funções, de latitude e longitude para ponto 3D e de
   volta. A ida (`latLonToScene`) e os quatro pontos do teste abaixo já vieram com o C2, porque a
   luz do Sol passa por ela; falta a volta. A convenção: o eixo y aponta para o polo norte;
   longitude 0° em +x; longitude 90° leste em −z.
   - ida: `x = cos(lat)·cos(lon)`, `y = sin(lat)`, `z = −cos(lat)·sin(lon)`;
   - volta: `lat = asin(y)`, `lon = atan2(−z, x)` (normalize o ponto para tamanho 1 antes).
2. No `onClick` do `<mesh>` da Lua, o ponto atingido chega em `event.point`. Converter e chamar
   `onSelect({ lat, lon })`, que vem do `App.jsx`. Feito com o `onClick` num `<group>` em volta da
   esfera e da malha do relevo, e a conta em `src/scene/picking.js`: o fim de um arrasto para girar
   a Lua também chega como clique, e é ignorado (`CLICK_MAX_DRAG_PX`). O `App.jsx` guarda o ponto
   num estado só para a cena; entregar ele ao painel é o E11.
3. Um marcador pequeno no ponto escolhido, também quando ele vem da lista.
4. Clique fora da área liberada não escolhe nada e mostra um aviso curto (texto em
   `src/data/scene.js`), que some sozinho depois de 5 segundos (decisão do Marco, 06/11). A área
   liberada vai do polo até 84°S: é o `areaMaxLatDeg` de `public/data/relief/manifest.json`, e a
   conta é `isInsideReliefArea(manifest, lat)`, de `src/engine/reliefFiles.js`.

Quem usa teclado escolhe pela lista (I2); a cena não precisa receber foco.

**Como testar** (`src/scene/coordinates.test.js`). Os quatro pontos da convenção: (0°, 0°) → (1,
0, 0); (0°, 90°) → (0, 0, −1); (90°, 0°) → (0, 1, 0); (−90°, 0°) → (0, −1, 0). E a ida e volta de
alguns pontos perto do polo sul dando o mesmo ponto, comparando com `toBeCloseTo`: perto do polo,
arredondar no meio da conta já desloca a longitude.

**Pronto quando.** Os testes passam, o clique escolhe o ponto e o marcador aparece nele, e o
`verify` passa. Mostrar o resultado do ponto no painel saiu deste card e foi para o E11 (decisão do
Marco, 06/11): o painel é o I1 e a ligação é o E11, e nenhum dos dois existia quando o C3 foi feito
(CONTRIBUTING.md, seção 1, regra 6).

### C4 · Quanto o site pesa nos notebooks da equipe

**Estado:** feito em 09/11, PR #12 · **Depende de:** C1 (feito), e de novo depois do C2 (feito)

**Para que serve.** Os juízes abrem o site num computador qualquer. Se a cena travar nos
notebooks da equipe, vai travar lá também.

**O que fazer.** Com o C1 na `develop`, em cada notebook (Enzo, Marco e Miguel), rodar
`npm run build` e depois `npm run preview` (a versão final do site, e não a de desenvolvimento) e
medir:
- o tempo até a Lua aparecer, com cronômetro;
- os quadros por segundo girando a Lua: no Chrome ou no Edge, DevTools > Rendering > "Frame
  Rendering Stats";
- o tamanho do JavaScript, que o `npm run build` imprime no fim.

Referência: num rascunho de 29/10/2026, só a cena do C1 levou o JavaScript do site de 221 kB
para 1,15 MB (315 kB compactado).

**Pronto quando.** Uma tabela neste card com notebook, navegador, tempo, quadros por segundo e
data; repetida depois do C2.

**Medido no notebook do Marco em 08/11/2026**, das 12:43 às 13:03 (horário de Brasília). Samsung
960XFH, i7-13700H, 32 GB, na tomada, tela de 144 Hz, Windows 11 (10.0.26200), Edge 157 e Chrome
156. O notebook tem uma RTX 4050, mas os dois navegadores usaram a **Intel Iris Xe** (o WebGL
informa "ANGLE (Intel, Iris Xe … D3D11)"): o Windows dá a placa integrada ao navegador quando
ninguém configura outra coisa, e é o caso mais parecido com um computador qualquer.
Dois momentos: (a) `0b669b9`, o merge do PR #5, só com o C1; (b) `10cd326`, a `develop` com C1,
C2 e C3. Build com `npm run build` e site no `npm run preview`; cada linha junta 3 rodadas, com
perfil limpo e janela de 1280 × 800.

| Notebook | Data | Momento | Navegador | Até a Lua aparecer | fps girando | fps arrastando | JavaScript (gzip) |
|---|---|---|---|---|---|---|---|
| Marco (Samsung 960XFH, Iris Xe, tela de 144 Hz) | 08/11/2026 | (a) só C1 | Edge 157 | 248 ms | 144 | 144 | 1.150 kB (315 kB) |
| Marco (Samsung 960XFH, Iris Xe, tela de 144 Hz) | 08/11/2026 | (a) só C1 | Chrome 156 | 273 ms | 144 | 144 | 1.150 kB (315 kB) |
| Marco (Samsung 960XFH, Iris Xe, tela de 144 Hz) | 08/11/2026 | (b) C1 + C2 + C3 | Edge 157 | 345 ms | 144 | 144 | 1.214 kB (343 kB) |
| Marco (Samsung 960XFH, Iris Xe, tela de 144 Hz) | 08/11/2026 | (b) C1 + C2 + C3 | Chrome 156 | 365 ms | 144 | 144 | 1.214 kB (343 kB) |
| Enzo (Dell 15 DC15250, Intel UHD, tela de 120 Hz) | 09/11/2026 | (b) C1 + C2 + C3 | Edge 157 | 479 ms | 120 | 119,9 | 1.214 kB (343 kB) |
| Miguel (modelo não informado, Iris Xe, tela de 60 Hz) | 09/11/2026 | (b) C1 + C2 + C3 | Edge | 1.925 ms | 55,2 | 59,4 | 1.214 kB (343 kB) |
| Miguel (modelo não informado, Iris Xe, tela de 60 Hz) | 09/11/2026 | (b) C1 + C2 + C3 | Chrome | 1.669 ms | 54,9 | 54,4 | 1.214 kB (343 kB) |

O tempo é a mediana, contado do início da navegação até o primeiro quadro com a Lua acesa. No
(b), a página baixa 1.595 KB, dos quais 1.258 KB são dois arquivos de relevo; com o servidor
local, eles chegam em uns 150 ms, então numa rede de verdade o tempo até a Lua vai ser maior. O
`dist/` tem 44 MB, quase tudo em `data/relief/`, mas a página só baixa o que usa. O card pedia
cronômetro e o "Frame Rendering Stats" do DevTools; um script com o navegador instalado
(playwright-core) fez a mesma medida com mais precisão e repetível. Numa das 3 rodadas do Edge no
(b), arrastando, apareceu um quadro de 20,8 ms; nas outras, nenhum passou de 9 ms. O fps é a
mediana das 3 rodadas.

O fps fica em 144 porque o navegador não desenha mais rápido que a tela. Isso diz que a cena não
trava, mas não diz quanto sobra. Desligar esse limite (`--disable-gpu-vsync
--disable-frame-rate-limit`) não serve: os quadros se acumulam na placa e a página para de 0,4 a
2,8 s de uma vez. O que mede a folga é o **custo de cada quadro**: logo depois que o React Three
Fiber desenha, ler 1 pixel do canvas obriga a placa a terminar o quadro, e o tempo dessa conta é
o trabalho de CPU e GPU dele.

| Notebook | Momento | Navegador | Custo por quadro girando (mediana / p95) | Arrastando (mediana / p95) |
|---|---|---|---|---|
| Marco | (a) só C1 | Edge | 2,9 / 3,3 ms | 2,9 / 3,2 ms |
| Marco | (a) só C1 | Chrome | 2,9 / 3,3 ms | 2,8 / 3,1 ms |
| Marco | (b) C1 + C2 + C3 | Edge | 6,0 / 6,5 ms | 5,9 / 6,4 ms |
| Marco | (b) C1 + C2 + C3 | Chrome | 6,0 / 6,6 ms | 5,9 / 6,6 ms |
| Enzo | (b) C1 + C2 + C3 | Edge | 5,2 / 12,9 ms | 5,1 / 12,7 ms |
| Miguel | (b) C1 + C2 + C3 | Edge | 20,5 / 23,9 ms | 20,4 / 23,6 ms |
| Miguel | (b) C1 + C2 + C3 | Chrome | 20,5 / 24,1 ms | 20,2 / 23,8 ms |

- O relevo e a sombra do C2 dobraram o custo do quadro no notebook do Marco, de 2,9 para 6,0 ms,
  e somaram 28 kB (gzip) de JavaScript e uns 100 ms até a Lua aparecer.
- No do Marco e no do Enzo a cena acompanha a tela (144 e 120 Hz), com uns 5 a 6 ms por quadro.
  Ler o pixel faz a CPU esperar a placa, então esse custo é um teto, não o custo exato.
- **No do Miguel, a cena não fecha 60 fps.** A tela é de 60 Hz (16,7 ms por quadro), e o quadro
  custa uns 20 ms. Sem a leitura do pixel, que também pesa, o fps ficou em 55 girando e de 54 a 59
  arrastando, com engasgos de até 116 ms ao arrastar. A Lua levou de 1,5 a 2,6 s para aparecer,
  mesmo com o servidor no próprio notebook; o relevo chegou em 0,5 a 0,7 s, então ele explica só
  parte da demora.
- **Para o C6:** no notebook mais fraco da equipe, a cena atual já passa dos 16,7 ms, então não
  sobra folga para o relevo fino. Decidido em 09/11: o relevo fino liga só onde a máquina
  aguenta; o como está no card C6.
- Com a Lua parada (pedido de menos movimento), a cena continua custando o mesmo por quadro, a
  cada quadro da tela: virou o card C9.
- No console, só o aviso "THREE.Clock: This module has been deprecated", em todos os notebooks.

**Notebooks do Enzo e do Miguel:** medidos em 09/11/2026, no mesmo commit (b) `10cd326`, com
`npm run build`, `npm run preview` e o mesmo script do Marco (`medir2.mjs`, 3 rodadas de cada
medida, na tomada). Os números completos estão nos comentários do PR #12. O Enzo mediu só no
Edge; a primeira rodada dele de tempo até a Lua teve o mouse mexido sem querer (1.118 ms) e foi
refeita. O Miguel mediu no Edge e no Chrome e não informou o modelo do notebook nem as versões dos
navegadores.

### C5 · Parar o giro quando a pessoa mexe na Lua

**Estado:** feito em 09/11, PR #13 · **Depende de:** C1 (feito)

**Para que serve.** Sem o pedido de menos movimento no sistema, a Lua do C1 gira sozinha o tempo
todo, e não há como pausar. A WCAG 2.2.2 (nível A) pede um jeito de pausar o que se move sozinho
por mais de 5 segundos junto com outro conteúdo. Parar o giro quando a pessoa mexe também ajuda o
C3 e o E11: o ponto escolhido não sai andando da frente dela. Veio da revisão do PR #5.

**O que fazer.** Em `src/scene/LunarScene.jsx`, desligar o `autoRotate` na primeira vez que a
pessoa arrasta ou usa a roda (o `OrbitControls` do Drei avisa no `onStart`), e deixar desligado
dali em diante. Com o pedido de menos movimento, nada muda: a Lua já começa parada.

**Como testar** (`src/scene/LunarScene.test.jsx`). Com os mesmos substitutos do C1: sem o pedido
de menos movimento, os controles começam com `autoRotate: true`; depois de chamar o `onStart` que
a cena entregou a eles, passam a receber `autoRotate: false`.

**Pronto quando.** No `npm run dev`, a Lua gira sozinha até a primeira vez que a pessoa mexe, e
não volta a girar; os testes passam e o `verify` passa.

O `onStart` chega quando a pessoa aperta o botão esquerdo ou o do meio, usa a roda ou toca na tela
(lido no `OrbitControls` do three-stdlib, que o Drei usa). Por isso o clique comum que escolhe um
ponto também para o giro, que é o que o "Para que serve" pede.

**Conferido** em 09/11/2026, no `npm run dev`, num Chromium (o navegador do app do Claude), lendo
da página a posição da câmera e o `autoRotate` dos controles:
- O Windows do Marco está com os "Efeitos de animação" desligados, e o navegador responde
  `prefers-reduced-motion: reduce`: a Lua começou parada e continuou parada.
- Sem o pedido (o `matchMedia` trocado só naquela aba), a Lua girou sozinha e parou na primeira
  vez que a pessoa arrastou, usou a roda ou clicou para escolher um ponto, cada caso numa página
  recarregada. Depois do deslize, a câmera ficou no mesmo lugar por 600 quadros (10 s), também
  depois de a cena desenhar de novo.
- O navegador estava escondido e não desenhava sozinho: os quadros foram avançados pelo `advance`
  do React Three Fiber, que roda o mesmo código de cada quadro, inclusive o giro dos controles.
- O Marco conferiu a olho no navegador dele, no mesmo dia, com o `npm run dev`: funcionou.

**O que ficou para depois** virou o card C10, na revisão do PR #13. O Enzo conferiu no navegador
em 09/11/2026 que o Shift+clique escolhe o ponto e a Lua continua girando (o three-stdlib trata o
clique com Ctrl, Shift ou Cmd como pan e não avisa o `onStart`); o mesmo vai acontecer com a lista
do I2.

### C6 · O relevo fino de perto

**Estado:** feito em 13/11, PR #30; conferido pelo Marco no CIT-DES06 (Intel UHD 630, mais fraca
que a Iris Xe do notebook dele), com a janela maximizada, e pelo Miguel no notebook dele (Iris Xe),
onde o relevo fino fica desligado · **Depende de:** C2 (feito), C4 (feito) e C9 (feito), porque o medidor pede os próprios quadros na cena que só
desenha quando algo muda

**Para que serve.** De perto, a cena do C2 fica borrada: ela desenha o relevo grosso (`far.bin`),
com um vértice a cada 1,9 km, e uma cratera de 1 ou 2 km vira poucos triângulos. Testado em
06/11/2026: com todos os pixels do `far.bin` (960 m) e sombra de 4096, fica só duas vezes mais
nítido, com 4 vezes mais vértices, e o WebGL 2 só garante textura de 2048. Veio do PR #8.

**O que fazer.** Desenhar o relevo fino de 80 m (`public/data/relief/near/`, os ladrilhos de 20 km
do card E2) só perto de onde a câmera olha, por cima do relevo grosso, trocando os ladrilhos
quando a câmera anda. O C4 diz quanto a cena aguenta a mais.

**Decidido em 09/11 (Marco), com os números do C4:** o relevo fino liga só onde a máquina
aguenta. No notebook do Miguel, a cena de hoje já custa uns 20 ms por quadro (55 fps numa tela de
60 Hz), então lá ele fica desligado e a cena continua como hoje. A cena mede o próprio ritmo nos
primeiros segundos (o `PerformanceMonitor` do Drei faz isso) e só liga o relevo fino se os quadros
ficarem abaixo de 16,7 ms; se passar disso depois de ligado, desliga de novo.

**Pronto quando.** Com a câmera na distância mínima, num notebook que aguenta (o do Marco ou o do
Enzo), uma cratera de 1 km aparece com borda e fundo, e os quadros continuam abaixo de 16,7 ms;
num notebook que não aguenta (o do Miguel), o relevo fino fica desligado e o custo por quadro não
passa do que o C4 mediu; e o `verify` passa.

**O que mudou do "O que fazer"**, com o motivo de cada um:
- **400 m, e não 80 m nem 160 m** (`src/scene/nearTiles.js`). Um vértice a cada 5 pixels. Até
  13/11 eram 160 m, um vértice a cada 2 pixels: com 80 m, os triângulos ficariam menores que um
  pixel, que a placa de vídeo desenha muito mal. Na conferência do Marco, com a janela maximizada,
  os triângulos de 160 m ficavam com uns 2 pixels, e o antisserrilhado que o React Three Fiber liga
  pinta de novo um pixel para cada triângulo que encosta nele: o medidor desligou o relevo fino
  (sexta rodada, abaixo). A borda e o fundo de uma cratera de 1 km vêm do mapa de normais de 80 m,
  e não dos vértices: no mesmo lugar, a imagem com 400 m mudou mais que 8 tons em 154 de 847.754
  pixels. A cratera de 1 km fica com uns 3 vértices de lado a lado.
- **Duas camadas** (`src/scene/nearTiles.js`), em volta do canto de ladrilho mais perto do centro
  da tela, e só com a câmera abaixo de 80 km de altitude (mais alto, o relevo fino some no pixel):
  - o **centro**, 2 × 2 ladrilhos (40 × 40 km) a cada 400 m, com o centro da tela a pelo menos
    10 km da borda. O plano era 3 × 3 a 160 m, e a medida abaixo mostrou que ele encostava nos
    16,7 ms; depois, o 2 × 2 a 160 m não coube na janela maximizada do CIT-DES06 (13/11);
  - o **anel**, 6 × 6 ladrilhos (120 × 120 km) a cada 800 m, que passa também por baixo do centro.
    Pedido pelo Marco em 12/11, depois de ver só um quadrado de relevo fino no meio da tela: com o
    anel, a tela inteira fica coberta na distância mínima (até a proporção de 1,8, largura sobre
    altura). Por baixo do centro, ele tapa qualquer fresta entre as duas camadas, sem precisar de
    "saia" na borda (uma revisão do desenho, em 12/11, mostrou que a saia fazia sombra falsa). Cada
    ladrilho do centro leva sempre a peça dele do anel por baixo, mesmo que o anel na tela ainda
    seja o de antes e não chegue até ali (num arrasto de 4 ladrilhos). Lá o anel não faz sombra:
    é mais liso que o centro, e no fundo de uma cratera fica acima dele.
  O centro troca sozinho, assim que chega, como antes; o anel só é pedido com o centro da posição
  de agora na tela, e troca quando os 36 chegaram. Esperar os 36 para mostrar o centro levaria 9
  vezes mais bytes (4,6 MB contra 0,5 MB) na primeira aproximação, e num arrasto pediria os 36 de
  cada bloco do caminho.
- **Mapa de normais** (`buildNormalMap`, em `src/scene/reliefMesh.js`): cada ladrilho ganha uma
  textura com a direção "para fora" da superfície em cada pixel de 80 m, e a luz das duas camadas
  vem dela. Pedido pelo Marco em 12/11, depois de ver o anel de 800 m quase tão borrado quanto o
  grosso, e com linhas retas na emenda entre ladrilhos (cada malha calculava a própria luz, e a
  emenda ficava com luz diferente dos dois lados). Com o mapa, o anel fica com o detalhe do centro
  sem nenhum triângulo a mais, e a emenda usa o pixel que cada ladrilho repete do vizinho. A
  textura é de meio-float: com 8 bits, a normal erraria uns 0,2°, e com o Sol a 1,5° do horizonte o
  chão plano ficaria com manchas de até 15% de brilho. Cada textura de 250 × 250 pesa 500 kB na
  placa de vídeo, e o mesmo na memória do JavaScript, que guarda os dados dela. Com a cena parada
  são 36 (uns 18 MB: os 4 do centro estão dentro do anel). Na troca do anel, as do anel de antes
  ficam até as do novo estarem prontas: de 72 a 80 no pior caso (uns 36 a 40 MB), contado numa
  simulação da revisão do código, em 12/11. O mapa de um ladrilho é uma montagem própria, num
  quadro só dele, e a textura sobe para a placa de vídeo já nesse quadro (uns 3 ms e mais uns 6 ms,
  no navegador do CIT-DES06, em 13/11). A sombra continua a do C2 e o contorno das montanhas, o da
  malha.
- **Estêncil** (`src/scene/reliefLayers.js`): o centro aparece por cima do anel e do grosso, e o
  anel por cima do grosso, mesmo onde eles estão um pouco mais altos. Sem ele, na emenda, o grosso
  mais alto furava o fino em degraus ("dentes", vistos pelo Marco em 12/11). Só a profundidade não
  resolve, e mexer na altura da borda faria a malha de cada ladrilho depender do bloco em que ele
  está. O `<Canvas>` pede o estêncil ao WebGL, que o three cria sem ele.
- **Um medidor próprio** (`src/scene/frameBudget.js`), e não o `PerformanceMonitor` do Drei. Ele
  conta quadros por segundo em janelas de tempo, e com o C9 a cena parada não desenha: ele
  concluiria "não aguenta" até num notebook rápido. O medidor só mede os quadros que ele mesmo
  pede, em rajadas: ao abrir a página, até decidir; e, depois de ligado, a cada bloco novo de
  relevo fino na tela, que é quando o custo do quadro muda. O resto (um passo da roda do mouse, um
  ladrilho que chega) não conta: o intervalo entre esses quadros soltos é o ritmo da mão ou da
  rede, e não o custo de desenhar, e contado ele desligava o relevo fino numa máquina que aguenta.
  Na rajada, ele ignora o primeiro segundo da página (a cena ainda montando o relevo), os 6
  primeiros intervalos de um bloco novo (uns 100 ms: a troca na tela e o que ela deixa para os
  quadros seguintes, como o buffer do buraco subindo para a placa de vídeo; eram 2 até 13/11, e a
  revisão viu que sobravam quadros da troca nos contados) e o quadro depois de montar um ladrilho,
  e decide pela média de 60 intervalos de até 100 ms. A rajada vai até juntar esses 60, e não um
  número fixo de quadros: com um número fixo, um intervalo a mais que não conta deixava 59, e ela
  acabava sem decidir. O teto é o dobro dos quadros que ela precisa, para ela não pedir quadros
  para sempre numa página que só tem pausas. A abertura tem o mesmo teto, contado depois do
  primeiro segundo: se passar dele sem juntar os 60 intervalos, ela desliga o relevo fino e mostra a
  linha no console, com a média de todos os intervalos. Sem ele, numa máquina em que todo quadro
  passa de 100 ms (um Chrome sem aceleração de vídeo, uma máquina virtual, uma área de trabalho
  remota), a abertura pedia quadros para sempre e a cena parada voltava a desenhar sem parar
  (revisão do Enzo, em 13/11). Numa aba escondida de verdade o navegador nem chama o
  `requestAnimationFrame`, então quadro solto numa aba visível quer dizer máquina lenta; no
  navegador escondido do app do Claude, a abertura desliga, e a conferência por lá continua
  precisando do relógio mais lento. Ele decide em **degraus**: uma rajada que estoura com o anel na tela tira só o
  anel e abre outra rajada sozinha, que mede o centro; se essa estourar também, desliga tudo. O
  degrau nunca sobe. Sem os degraus, uma máquina que aguenta o centro e não o anel perderia o
  relevo fino inteiro. Toda medição que termina vai para o console, com a média (`relevo fino
  ligado`, `continua ligado`, `só no centro`, `continua só no centro` ou `desligado`): até 13/11,
  só as que mudavam alguma coisa, e com a máquina aguentando ninguém via a folga.
- **O limite é 17,5 ms, e não 16,7 ms** (OK do Marco em 13/11; ele tinha decidido 16,7 ms em 09/11).
  A média de 60 intervalos numa tela de 60 Hz que acompanha a cena dá 16,67 ms, colada nos 16,7:
  um único quadro que perde a vez da tela (33,3 ms) leva a média a 16,94 ms e desligaria o relevo
  fino para sempre. Com 17,5 ms, a média aceita até 3 quadros perdidos em 60 (uns 57 por segundo).
  O notebook do Miguel, com a Lua girando, fica em 18,1 ms (C4), acima do limite. Desligado, não
  liga mais naquela página, para o relevo fino não piscar numa máquina no limite.
- **Um buraco no relevo grosso** embaixo dos ladrilhos das duas camadas: numa cratera, o grosso (a
  média de 1,9 km) fica acima do fundo e faria sombra no fino. Saem só os quadrados com os quatro
  cantos cobertos, para a emenda não abrir fresta; os que ficam só em parte embaixo continuam, e o
  estêncil não deixa eles aparecerem por cima do fino. O buraco segue a malha do fino, que fica
  meio pixel (40 m) para a direita e para baixo da borda do ladrilho na grade. Trocar o buraco
  refaz só os triângulos do grosso, no mesmo buffer da placa de vídeo, a partir do ladrilho de cada
  vértice, calculado uma vez por relevo (`reliefVertexLabels` e `coverTriangles`): 4 ms por troca,
  contra os uns 31 ms de percorrer a grade de novo, que engasgavam a página. O clique segue a
  regra do estêncil (`visibleHit`): o acerto do centro, senão o do anel, senão o do grosso, mesmo
  que outro esteja mais perto. O acerto mais perto podia ser o grosso ou o anel escondidos embaixo
  do fino, a até uns 600 m de onde a pessoa clicou.
- **As malhas montadas aos poucos**: um mapa de normais por quadro; a malha de um ladrilho do centro
  no quadro seguinte ao do mapa dele (uns 2 ms, a 400 m); e até 8 do anel, com o mapa pronto
  (0,4 ms cada). O bloco novo de uma camada entra na tela de uma vez, junto com o buraco, no mesmo
  commit do React (o estado do buraco fica dentro do Canvas): a página não trava, e o grosso nunca
  fica com buraco sem o fino por cima. O bloco novo só entra quando todos os ladrilhos dele
  chegaram (ou falharam) e estão montados (`nearTilesStep` e `nearFrameStep`); até lá, o bloco de
  antes continua na tela. Trocando antes, os ladrilhos que saíam do bloco sumiam antes de os novos
  chegarem, e o relevo fino piscava a cada troca. O ladrilho que falhou fica de fora, e o grosso
  cobre o lugar dele. A memória da página guarda 100 ladrilhos (12,7 MB), para ir e voltar num
  arrasto sem baixar de novo.
- **A sombra é a do C2** (424 m por pixel). A borda e o fundo das crateras aparecem pela luz do
  mapa de normais.
- **Sem antisserrilhado** (`src/scene/LunarScene.jsx`), decidido pelo Marco em 13/11. O MSAA que o
  React Three Fiber liga pinta cada pixel uma vez para cada triângulo que encosta nele: com ele, na
  Intel UHD 630 e a janela maximizada, o relevo fino ficava no limite dos 60 quadros por segundo e
  o medidor desligava. Sem ele, o quadro leva metade do tempo na placa de vídeo, com ou sem o
  relevo fino, e de perto a imagem quase não muda (sétima rodada). De longe, a borda da Lua fica
  em degraus, e a linha dos 84°S do C8 passou a ser uma faixa de 1,5 pixel (`src/scene/AreaRing.jsx`):
  a linha comum sumia aos pedaços.

**Conferido** em 11/11/2026, no `npm run dev`, num Chromium (o navegador do app do Claude), no
computador CIT-DES06, com uma Intel UHD 630 (mais fraca que a Iris Xe do notebook do Marco no C4).
O navegador estava escondido: ele desenha poucos quadros por segundo, num ritmo que muda sozinho.
Por isso o custo foi medido pelo cronômetro da própria placa de vídeo
(`EXT_disjoint_timer_query_webgl2`), e o medidor foi conferido com os quadros entregues pelo teste,
pelo `advance` do React Three Fiber, no intervalo que o teste escolheu. Isso confere as ligações do
medidor na cena, e não a velocidade da máquina; quem diz a velocidade é a tabela do custo.

Primeira rodada, antes das correções da revisão do PR:
- **Crateras:** em cima de (−89°, 180°), o lugar mais iluminado de 8 pontos testados nessa data, o
  centro da tela ficou com 2,65 vezes mais detalhe (a variação de brilho entre pixels vizinhos) e
  mostra dezenas de crateras com borda clara do lado do Sol e fundo escuro, várias menores que 1
  km. Sem o relevo fino, o mesmo lugar é só mancha. Nenhum pixel vazio na tela inteira.
- **Bloco:** 3 × 3 custou 12,8 ms por quadro (p95 de 16,3 ms), no limite dos 16,7 ms; daí o 2 × 2.
- **Clique:** em cima do relevo fino, escolhe o ponto, o marcador aparece e o painel mostra o céu.

Segunda rodada, depois das correções, com a cena parada (o pedido de menos movimento trocado só
naquela aba, para a cena ficar no `demand` do C9):
- **Custo**, na mesma página, com a tela de 538 × 584 pixels e a câmera na distância mínima, em
  cima de (−89,6°, 40°); cada rodada são 100 quadros, depois de 20 descartados:

  | Na tela | Mediana | p95 | Rodadas |
  |---|---|---|---|
  | sem o relevo fino | 4,7 ms | 6,1 a 6,3 ms | 3 |
  | com o bloco de 2 × 2 | 9,4 e 10,9 ms | 11,4 e 11,9 ms | 2 |

- **Ao abrir, sem ninguém mexer:** o medidor pediu os próprios quadros e decidiu sozinho. No ritmo
  de verdade do navegador escondido (uns 29 quadros por segundo), desligou com 34,5 ms de média;
  com o relógio da página três vezes mais lento, ligou com 11,1 ms. Depois de decidir, a cena
  parada desenhou 0 quadros em 2 s.
- **Quadros que ele não pediu:** 200 quadros, cada um 25 ms depois do outro, pedidos por fora (o
  que a roda do mouse faz): o relevo fino continuou ligado. Antes da correção, a média de 25 ms
  desligava.
- **Bloco novo:** levando a câmera para (−88,2°, 75°) a 60 Hz, o bloco entrou e o medidor pediu os
  quadros da rajada (62) e continuou ligado. Levando para (−87,5°, 190°) com 25 ms por quadro, a
  rajada desligou no 62º quadro: os 4 ladrilhos saíram e o relevo grosso voltou inteiro (249.034
  triângulos). Desligado, a câmera de volta perto do polo não trouxe o relevo fino.
- **Buraco no grosso:** com o bloco de 2 × 2 na tela, o grosso desenhou 248.234 dos 249.034
  triângulos; o buraco segue a malha do fino dos quatro lados (teste em `nearTiles.test.js`).
- **Console:** só as linhas do medidor e o aviso de sempre do `THREE.Clock`.
- **Não refeito nesta rodada:** a imagem das crateras e o clique (o navegador escondido parou de
  desenhar). O Marco confere a olho no `npm run dev`.

Terceira rodada, depois do conserto do pisca na troca de bloco e das correções de uma segunda
revisão (a rajada que junta os 60 intervalos, a falha que só vale na tentativa dela), com o código
final, do mesmo jeito (os quadros e o relógio do teste, a 60 Hz), numa página recarregada e com o
giro parado por um passo da roda:
- **Ao abrir:** ligou com 16,67 ms, em 122 quadros (o primeiro segundo e mais 61).
- **Troca para um bloco sem ladrilho em comum**, de (−89,6°, 40°) para (−88,2°, 75°): os 4
  ladrilhos de antes ficaram na tela por 7 quadros, até os 4 novos estarem montados, e a troca foi
  num quadro só, com o buraco junto, seguida da rajada de 62 quadros. Antes do conserto, a mesma
  troca tinha 6 quadros sem relevo fino nenhum.
- **Bloco vizinho**, 20 km para o lado (2 ladrilhos em comum): os 2 novos montados em 5 quadros, e
  a troca dos 4 num quadro só.
- **Um ladrilho que falha** (o `fetch` trocado só naquela aba para responder HTTP 503 ao
  `r07c05`): uma linha de erro no console, e a tela passou dos 4 ladrilhos de antes direto para os
  3 que chegaram; o grosso cobriu o lugar do que falhou.
- **A câmera subindo dos 80 km num passo só**, sem nada mais pedindo quadro: no quadro seguinte o
  relevo fino saiu e o grosso voltou inteiro.
- **Descendo de novo no mesmo bloco**, agora com o `r07c05` respondendo: a cena esperou a leitura
  nova dele e trocou direto para os 4 ladrilhos, sem passar pelos 3.
- **Com 25 ms por quadro**, num bloco novo: a rajada desligou no 62º quadro e o grosso voltou
  inteiro.
- **Console:** o aviso de sempre do `THREE.Clock`, as linhas do medidor e a linha do ladrilho que
  falhou de propósito.
- **Não reproduzido:** a segunda revisão apontou que, no `npm run dev`, o Fast Refresh podia rodar
  a limpeza do `NearRelief` sem desmontar e deixar o grosso por cima do fino. Editei o arquivo com
  o bloco na tela, e os efeitos não rodaram de novo: nada mudou. A limpeza agora também tira o que
  está na tela, para o caso de acontecer.

Quarta rodada, em 12/11/2026, depois do anel e do estêncil, do mesmo jeito (os quadros e o relógio
do teste, a 60 Hz), numa página recarregada, com a tela de 538 × 584 pixels:
- **Primeira aproximação**, em (−89,6°, 40°), com o código final: o centro entrou 8 quadros depois
  do movimento, com o buraco (o grosso com 248.234 triângulos) e as 4 peças do anel por baixo; o
  anel inteiro, 26 quadros depois, com os 36 ladrilhos (o grosso com 241.592). A página baixou 36
  ladrilhos: os 4 do centro estão entre os do anel e não foram baixados duas vezes.
- **Dentes**: cada camada pintada com uma cor chapada, contando os pixels do grosso entre pixels do
  centro na mesma linha da tela, na distância mínima:

  | Lugar | Sem estêncil no grosso (como era) | Com estêncil | Grosso na tela inteira, com o anel |
  |---|---|---|---|
  | (−89,0°, 180°) | 1.802 px | 196 px | 0 px |
  | (−85,5°, 60°) | 836 px | 0 px | 0 px |
  | (−84,3°, 120°) | 1.160 px | 0 px | 4.491 px (4 ladrilhos do anel não existem ali) |

  Os 196 px com estêncil são de fora do centro: com ele, o grosso não pinta onde o centro desenhou,
  e o relevo deixa a borda do centro ondulada na tela. Sem o estêncil no anel, a malha de 800 m
  cobriria de 62 a 72 mil pixels do centro; com ele, nenhum. Nenhum pixel vazio em nenhum caso.
- **Clique** de verdade, pelos eventos do navegador, no centro da tela: o painel mostrou o céu do
  ponto, e o marcador ficou a 1 m do ponto embaixo da câmera. A escolha entre as camadas está nos
  testes (`visibleHit`, comparada com o estêncil em todas as combinações): no navegador, o pixel
  achado com o anel na frente do centro deu 18 m entre os dois acertos, menos que a imprecisão do
  clique simulado.
- **Arrasto de 4 ladrilhos** (80 km) num quadro só, com o código final: o centro novo entrou com as
  peças do anel dele por baixo (o anel de antes não chegava até ali), e nenhum pixel vazio em
  nenhum quadro da troca.
- **Buraco**: 10 ms uma vez por relevo e 4,2 ms por troca (9,2 ms no pior de 9).
- **Arrasto** de 100 km em 5 quadros: o relevo fino nunca saiu da tela (sempre 4 ladrilhos no centro
  e 36 no anel, e o grosso nunca voltou inteiro); parada a câmera, o centro trocou primeiro e o anel
  8 quadros depois.
- **Degraus do medidor**: num bloco novo com 25 ms por quadro, saiu só o anel (`relevo fino só no
  centro`); com os quadros de volta a 16,7 ms, ficou o centro, e noutro bloco o anel não foi pedido
  (nenhum ladrilho baixado); com 25 ms de novo, desligou tudo e o grosso voltou inteiro.
- **Não medido**: o custo do anel na placa de vídeo (o navegador escondido não deixa). Pela conta,
  são 45 mil triângulos a mais que os 125 mil do centro (com o centro a 160 m).

Quinta rodada, em 12/11/2026, depois do mapa de normais, do mesmo jeito, com cada peça pintada de
uma cor para saber de que ladrilho é cada pixel. A cena estava escura nessa hora (brilho médio de uns
6 em 255), então os números são pequenos; a comparação é no mesmo quadro, com o mapa ligado e
desligado só naquele instante:

| Lugar | Detalhe do anel, sem → com o mapa | Emenda no anel (diferença de brilho na emenda ÷ a de dentro), sem → com |
|---|---|---|
| (−89,0°, 180°) | 0,25 → 0,67 | 4,41 → 0,46 |
| (−85,5°, 60°) | 0,30 → 0,67 | 2,79 → 1,15 |
| (−88,2°, 75°) | 0,24 → 0,86 | 2,22 → 1,30 |
| (−87,5°, 300°), quase sem luz | 0,03 → 0,07 | 1,40 → 0,85 |

- O detalhe do centro também subiu (0,36 → 0,53 em (−89,0°, 180°)), e o anel ficou no nível dele.
- **Montagem**, medida no navegador com 6 ladrilhos: o mapa de normais em 2,4 ms de mediana (5,3 ms no
  pior), a textura em meio-float em 1,4 ms (5,1 ms), a malha completa do centro (a 160 m) em 6,8 ms
  (11,8 ms) e a do anel em 0,4 ms. A primeira aproximação: o centro em 12 quadros (4 mapas, 4
  malhas e as peças do anel por baixo) e o anel inteiro uns 40 quadros depois, um mapa por quadro.
- **O primeiro erro**: a primeira versão guardava a normal crua na textura, e o three lê o mapa como
  cor × 2 − 1; a luz saía torta. Achado pela medida (o detalhe tinha pulado 11 vezes) e preso num
  teste.
- **Quadros longos no teste**: o navegador escondido desenha devagar, e o teste entregava quadros
  mais depressa do que a placa de vídeo terminava. De vez em quando o navegador parava o JavaScript
  até ela alcançar: quadros de 50 a 490 ms, também sem textura nenhuma subindo (ler 1 pixel depois
  de 42 quadros esperou de 217 a 423 ms, com textura de meio-float, de 8 bits ou menor). Numa aba
  de verdade, o ritmo da tela não deixa os quadros se acumularem assim; não deu para medir o custo
  real na placa de vídeo aqui.

Sexta rodada, em 13/11/2026, depois da conferência do Marco no Chrome dele, no CIT-DES06 (a janela
maximizada numa tela de 1920 × 1080, `devicePixelRatio` 1, a mesma UHD 630). Com o centro a 160 m,
o console mostrou `relevo fino só no centro (o anel saiu), média de 20.98 ms` e, na rajada seguinte,
`relevo fino desligado, média de 22.82 ms`. Numa tela de 60 Hz, 20,98 ms de média são uns 15 quadros
em 60 que perderam a vez da tela.
- **A causa:** a malha do centro de 160 m. Com a janela maximizada, a cena tem 1114 × 761 pixels, um
  pixel cobre uns 70 m na distância mínima, e cada triângulo de 160 m ficava com uns 2 pixels. O
  antisserrilhado que o React Three Fiber liga (MSAA de 4 amostras) pinta de novo um pixel para cada
  triângulo que encosta nele. Medido pelo cronômetro da placa, como nas rodadas de antes, com o
  navegador do app do Claude no tamanho da janela maximizada, em cima de (−87°, 150°), em 5 rodadas
  intercaladas de 15 quadros:

  | Na tela | Mediana | 90% dos quadros abaixo de |
  |---|---|---|
  | sem o relevo fino | 5,9 ms | 7,8 ms |
  | só o centro, a 160 m | 10,1 ms | 16,0 ms |
  | só o centro, a 400 m | 6,9 ms | 8,0 ms |
  | o centro a 160 m e o anel | 13,5 ms | 21,7 ms |
  | o centro a 400 m e o anel | 9,0 ms | 10,5 ms |
  | o centro a 800 m e o anel | 8,4 ms | 9,9 ms |

  Desenhando a mesma cena sem o antisserrilhado, o centro a 160 m com o anel caía de 14,6 para
  6,7 ms. A sombra custa uns 0,5 ms, e um material mais simples (Lambert) pouparia uns 1,3 ms.
- **A imagem**, no mesmo lugar, com o centro a 160 m e a 400 m: diferença média de 0,04 tom (de 0 a
  255), e 154 de 847.754 pixels mudaram mais que 8 tons; com 800 m, 0,09 tom e 404 pixels. A luz vem
  do mapa de normais, e a câmera olha sempre para o centro da Lua.
- **Com o código final** (o centro a 400 m), noutra hora, do mesmo jeito: sem o relevo fino, 6,4 ms
  (90% abaixo de 7,8 ms); o centro e o anel, 11,0 ms (13,9 ms); na mesma página, com as malhas do
  centro trocadas por 160 m, 13,8 ms (18,3 ms). Os números mudam de uma hora para outra (a placa
  desenha também a tela do computador), por isso cada comparação foi feita na mesma página,
  intercalada.
- **Montagem**, no navegador, 12 vezes: a malha do centro a 400 m em 2,0 ms de mediana (3,1 ms no
  pior), contra 8,8 ms (10,9 ms) a 160 m; o mapa de normais em 3,1 ms (12,7 ms), e a textura dele,
  criada e mandada para a placa, em 5,6 ms (12 ms).
- **O que três revisores conferiram**, em 13/11, no Node: com 400 m, o ponto do clique anda até
  13 m em 95% dos casos na borda da tela (2,6 m de mediana e 103 m no pior; no meio da tela, nada),
  e um pixel cobre 70 m; numa simulação, a sombra muda menos do que muda em meia hora de Sol; as
  emendas, o buraco no grosso, o estêncil e o clique não dependem do passo.
- **O console**, com os quadros e o relógio do teste: `relevo fino ligado` e `continua ligado` a
  60 Hz; num bloco novo com 25 ms por quadro, `só no centro (o anel saiu)`, e com os quadros de
  volta a 60 Hz, `continua só no centro, média de 16.67 ms`.

Sétima rodada, em 13/11/2026, depois da segunda conferência do Marco, com o centro a 400 m, do mesmo
jeito (o navegador do app do Claude no tamanho da janela maximizada, 1114 × 761). No Chrome do
Marco, o console mostrou `relevo fino ligado` (16,67 ms), depois `só no centro (o anel saiu)` com
17,71 ms e `desligado` com 20,73 ms.
- **A montagem não entra na medida.** Quadro a quadro, numa aproximação: as 32 texturas do anel
  sobem uma por quadro, de 6 a 30 ms de JavaScript cada, todas em quadros que o medidor pula, e o
  anel só entra na tela depois da última. Nos quadros que contam, menos de 1 ms de JavaScript e uns
  10 a 13 ms na placa: o que passava do limite era desenhar, e não carregar.
- **O degrau "só no centro" quase não alivia nessa tela.** Depois dele, só o primeiro quadro tem
  trabalho (uns 11 ms, a troca na tela); os seguintes, 0,1 ms de JavaScript e uns 11 ms na placa,
  quase o mesmo que com o anel: onde o anel sai, entra o relevo grosso, que custa parecido por
  pixel. Os 17,71 e 20,73 ms são uns 4 e 14 quadros atrasados em 60, a máquina no limite.
- **Sem antisserrilhado** (`antialias: false` no `<Canvas>`), na mesma página, 5 rodadas de 15
  quadros:

  | Na tela | Com antisserrilhado | Sem |
  |---|---|---|
  | sem o relevo fino | 7,5 ms (90% abaixo de 7,8 ms) | 3,9 ms (5,1 ms) |
  | o centro e o anel | 11,7 ms (12,2 ms) | 6,1 ms (8,1 ms) |

- **A imagem**, antes e depois, no mesmo lugar: de perto, 887 de 847.754 pixels mudaram mais que 8
  tons, quase todos na borda entre as camadas. De longe (a câmera na distância inicial), a borda da
  Lua fica em degraus, e a linha dos 84°S ficava tracejada: cada um dos 720 pedaços dela tem uns
  0,2 pixel ali, e sem o antisserrilhado a placa não pinta pedaço de linha menor que um pixel.
  Afastar o plano mais perto da câmera (0,01 e 0,1, em vez de 0,001) não resolveu. Desenhada como
  uma faixa de triângulos (o `Line` do Drei, `src/scene/AreaRing.jsx`), a linha ficou inteira com
  1,5 pixel de largura, com a mesma cor; com 1 pixel ainda sobravam buracos pequenos.
- **No Chrome do Marco**, sem o antisserrilhado, com a janela maximizada e o F12 fechado durante a
  medida: `relevo fino ligado, média de 16.67 ms` e `relevo fino continua ligado, média de 16.67
  ms`, ou seja, 60 quadros por segundo sem nenhum atrasado. A olho, de longe e de perto, a linha dos
  84°S inteira e as crateras certas.

**No notebook do Miguel**, em 13/11/2026, no commit `e22031c`, com `npm run preview`, o Chrome
157.0.8103.51, a janela maximizada, o notebook na tomada, o F12 fechado e 15 s sem mexer (a Lua
girando), em 2 rodadas com a página recarregada. Medido pelo Miguel; os números são os que ele
copiou do console:
- **As duas rodadas:** uma linha só, sem "ligado" antes:
  `NearRelief: relevo fino desligado, média de 18.15 ms entre quadros (o limite é 17.5 ms)`. A
  abertura decidiu pelos 60 intervalos, e não pelo teto.
- **O "Pronto quando" desse notebook:** o relevo fino fica desligado, e a abertura mede a cena sem
  ele. Os 18,15 ms ficam no que o C4 mediu ali, girando: 54,9 fps no Chrome (18,2 ms) e 55,2 fps no
  Edge (18,1 ms).
- **Console:** sem erro, só o aviso de sempre do `THREE.Clock`. Ele não vem do nosso código: o
  React Three Fiber cria um `THREE.Clock` por dentro, e o three avisa.
- **Antes**, numa rodada sem o commit e o navegador anotados, deu 19,17 ms; e no `npm run dev`, com
  o DevTools aberto, 18,19 ms. Desligado nas duas.
- **No PC do Miguel** (GeForce RTX 3060, AORUS 8G), do mesmo jeito, no Chrome 157.0.8103.52:
  `NearRelief: relevo fino ligado, média de 5.56 ms entre quadros (o limite é 17.5 ms)`, numa
  rodada (a segunda não foi anotada). A frequência da tela não foi anotada: 5,56 ms é o ritmo de
  uma tela de 180 Hz, e então seria o ritmo da tela, e não o custo do quadro (não conferido).

**Aberto.**
- Nas duas conferências de 13/11, a rajada só com o centro deu mais que a com o anel (22,82 contra
  20,98 ms, e 20,73 contra 17,71 ms), e pela medida devia dar quase o mesmo. Os quadros dela não
  têm trabalho a mais (sétima rodada); o mais provável é variação da placa de vídeo, que também
  desenha a tela do computador e o DevTools aberto (não conferido).
- Sem o antisserrilhado, a borda da Lua vista de longe fica em degraus. Se incomodar, o card C12
  sugere suavizar as bordas de outro jeito.
- O custo no notebook do Marco (BOOK, Iris Xe) não foi medido; o CIT-DES06 tem uma placa mais
  fraca, então ele deve ficar abaixo dos números acima (não conferido).
- O custo do anel na placa de vídeo foi medido só no CIT-DES06 (sexta rodada). Se ele não couber
  noutra máquina, o medidor tira só o anel (`relevo fino só no centro`, no console).
- Mais alto que uns 43 km de altitude, numa janela larga (proporção de 1,5), as beiradas da tela
  ficam no relevo grosso: o anel cobre 50 km para cada lado do centro da tela, no mínimo.
- Um ladrilho que demora muito para chegar, sem falhar (a rede parada), segura a troca: o bloco de
  antes fica na tela até ele chegar ou falhar. Pela internet, o navegador desiste da leitura
  parada depois de um tempo, e aí ela vira falha (não conferido quanto tempo).
- Na emenda entre os 4 ladrilhos do centro, num lugar quase sem luz ((−87,5°, 300°)), a diferença
  de brilho na emenda continuou 2,7 vezes a de dentro, com e sem o mapa. Com tão pouca luz, poucos
  pixels decidem a conta; não conferi a olho.
- O custo das texturas na placa de vídeo não foi medido (uns 18 MB com a cena parada e até uns
  40 MB na troca do anel, mais o mesmo na memória do JavaScript), nem o efeito delas num notebook
  com pouca memória de vídeo.
- Entre uns 43 e 80 km, numa janela larga, a borda de fora do anel fica um pouco mais clara que o
  grosso ao lado, com o Sol baixo: a normal de 80 m é mais áspera, e a luz rasante clareia a
  encosta virada para o Sol mais do que escurece a de costas. Numa conta da revisão do código,
  com sombra, luz ambiente e as cores da tela, a diferença típica ficou em uns 8% (2 a 4 tons, de 0
  a 255) e chegou a 43% num lugar de costas para o Sol; antes do mapa, uns 4%. Não conferi a olho.
  Se aparecer, uma saída é misturar a normal do mapa com a da malha nos últimos quilômetros do
  bloco.
- O mapa de normais não tem mipmap. Até uns 60 km, cada pixel da tela cobre no máximo 2 pixels do
  mapa, e o mipmap não mudaria quase nada (simulado na revisão do código); perto dos 80 km, com
  2,6 a 2,8 por pixel, a luz pode tremer um pouco quando a câmera mexe. Não conferi a olho.
- Sombra mais fina perto da câmera: exigiria levar a caixa da sombra do C2 para perto do bloco.
  Fica como sugestão de card, para combinar com o Enzo.
- O relevo fino em 80 m, se um dia sobrar folga.

### C7 · Teste do relevo perto do limite de tempo

**Estado:** feito em 09/11, PR #14 · **Depende de:** nada

**Para que serve.** O Vitest dava 5 s para cada teste (hoje a suíte dá 30 s, card E15). No Windows
do Enzo, em 06/11/2026, o teste "todo vértice fica perto da superfície"
(`src/scene/reliefMesh.test.js`) levou de 2,4 a 7,5 s, e reprovou o `verify` uma vez por tempo,
sem nada de errado na malha. Teste que passa ou não conforme o computador está ocupado ensina a
rodar de novo até passar, e um erro de verdade passa junto. Veio do PR #10 (card E10).

**Causa** (medido no Linux em 06/11/2026). A malha do `far.bin` tem 125.314 vértices, e o teste
chama o `expect` duas vezes para cada um. A conta leva de 6 a 13 ms; os 250 mil `expect`, de 830
a 1.100 ms. O teste vizinho, "todo vértice fica no hemisfério sul da cena", faz o mesmo, com um
`expect` por vértice, e levou de 0,8 a 2,3 s no Windows do Enzo.

**O que fazer.** Nos dois testes, guardar no laço o menor e o maior valor (o raio de cada vértice;
o ângulo até o polo) e conferir com um `expect` só, no fim. A conferência continua a mesma.

**Como conferir que o teste continua pegando erro.** A malha vai de −6,72 km a +6,96 km (medido
junto com a causa). Com o limite de 8000 m trocado por 6000 m, o teste novo tem que reprovar;
de volta a 8000 m, passar.

**Pronto quando.** Os dois testes conferem o mesmo que antes, cada um leva menos de 0,5 s no
`verify` do Windows de quem fizer, e o `verify` passa.

**Conferido** em 09/11/2026, no Windows do Marco, com a suíte inteira rodando como no `verify`
(o tempo de cada teste lido do relatório JSON do Vitest):

| Teste | Antes | Depois |
|---|---|---|
| "todo vértice fica perto da superfície" | 3.868 ms | 79 ms |
| "todo vértice fica no hemisfério sul da cena" | 2.093 ms | 44 ms |

O primeiro confere o maior afastamento da esfera de raio 1, em metros, que é o mesmo que os dois
limites de antes. Com o limite trocado de 8000 m para 6000 m, o teste novo reprova
(`expected 6956.45… to be less than 6000`), o antigo também, e de volta a 8000 m o novo passa. O
segundo, com o alcance diminuído em 1 km, reprova no teste novo e no antigo. A suíte continua com
213 testes.

### C8 · Mostrar na cena até onde dá para escolher um ponto

**Estado:** feito em 09/11, PR #18 · **Depende de:** C3 (feito)

**Para que serve.** O relevo que a cena desenha em volta do polo vai até uns 77°S (o `far.bin`,
que o motor usa para as montanhas distantes do horizonte), mas só dá para escolher ponto até 84°S,
onde existe o relevo fino (card E2). Nada na tela mostra esse limite: a pessoa clica em cima de
uma montanha entre 84° e 77°S e recebe o aviso de fora da área. Testado em 06/11/2026: um clique a
uns 32 px do centro do polo, com a câmera na posição inicial, já cai fora da área. Veio do PR #9.

**O que fazer.** Desenhar na cena um anel discreto na latitude do `areaMaxLatDeg` do
`public/data/relief/manifest.json`, com a cor de um token, seguindo o relevo para não sumir atrás
das montanhas. Escurecer o relevo de fora da área foi descartado na revisão do PR #9: na tela, ele
se confundiria com sombra, que é o assunto do site.

**Pronto quando.** Com a câmera na posição inicial e na distância mínima, o anel aparece em 84°S;
um clique dentro dele escolhe o ponto e um fora dá o aviso; e o `verify` passa.

**Como ficou.** `src/scene/areaRing.js` calcula 720 pontos na latitude do `areaMaxLatDeg`, cada um
300 m acima do relevo grosso daquele lugar (lido do `far.bin` pelo `reliefHeightAtM` do C3), e
`src/scene/AreaRing.jsx` desenha a volta como uma linha fina com a cor do `--color-text-muted`. A
linha não faz nem recebe sombra e não entra no clique (raycast desligado): o clique em cima dela
continua chegando ao relevo. No `LunarScene.jsx`, só o import e a linha que monta o anel.

**Conferido** em 09/11/2026, no `npm run build` + `npm run preview`, no Edge 157 com a Intel Iris
Xe do notebook do Marco, com o pedido de menos movimento ligado para a câmera não andar:
- Na posição inicial, o anel aparece em volta do polo, com uns 21 px de raio. Clicando do centro
  para fora, de 2 em 2 px, até 20 px o ponto é escolhido; de 22 px em diante, não.
- Na distância mínima, com a câmera inclinada até ficar em cima do anel, ele aparece como uma
  linha contínua sobre o relevo. Um clique 6 px para dentro escolhe o ponto; 6 px para fora dá o
  aviso "Landing sites can be chosen between the south pole and 84°S.".
- O custo por quadro (o script do C4, 3 rodadas de cada, alternando antes e depois) foi de uns
  6,0 ms sem o anel e 6,1 ms com ele. O fps ficou em 144, o limite da tela.
- No console, só o aviso de sempre do `THREE.Clock`.

### C9 · Desenhar a cena só quando algo muda

**Estado:** feito em 11/11, PR #22 · **Depende de:** nada

**Para que serve.** O `<Canvas>` desenha a cena 144 vezes por segundo numa tela de 144 Hz (60 numa
de 60 Hz), mesmo com a Lua parada. Medido no C4, em 08/11/2026: com o pedido de menos movimento, a
Lua não gira e cada quadro custa os mesmos 6 ms de quando ela gira. Isso gasta bateria e esquenta
o notebook sem mudar nada na tela.

**O que fazer.** `frameloop="demand"` no `<Canvas>` de `src/scene/LunarScene.jsx`: o React Three
Fiber passa a desenhar só quando algo muda (controles, luz, marcador do C3). Conferir que o giro
automático, o arrasto com `enableDamping` e a troca de data da luz continuam desenhando; o que
mudar a cena fora do React pede um quadro com `invalidate()`.

**Pronto quando.** Com a Lua parada, a cena não desenha quadro nenhum (contando
`requestAnimationFrame` no canvas, ou na aba Performance do DevTools); girando, arrastando e
trocando a data, tudo aparece como antes; e o `verify` passa.

**O que mudou do "O que fazer":** só o `frameloop="demand"` fez a Lua parar de girar sozinha. Ela
desenhava um quadro e ficava no lugar. O passo do giro em cada quadro (2,6 × 10⁻⁵ rad, com o
deslize) fica muito abaixo do que o `OrbitControls` do three-stdlib conta como mudança (`EPS =
1e-6`, comparado com 6,9 × 10⁻¹⁰), e por isso ele não chama o `invalidate`. Ficou assim: `always`
enquanto a Lua gira sozinha, e `demand` quando ela está parada (depois que a pessoa mexe, card C5;
com um ponto escolhido, card C10; ou com o pedido de menos movimento). O desperdício que o C4 mediu
era justamente com a Lua parada.

**Conferido** em 11/11/2026, no `npm run dev`, num Chromium (o navegador do app do Claude), com os
"Efeitos de animação" do Windows do Marco ligados. Os quadros foram contados pelo
`renderer.info.render.frame` do three:

| Situação | `develop` antes | Com o C9 |
|---|---|---|
| Girando sozinha | 300 quadros em 5 s | 300 em 5 s (`always`), e a câmera anda |
| Parada, depois da roda | 300 em 5 s | 0 em 10 s (`demand`), com a Lua aproximada na tela |
| Arrasto e deslize | (desenha sempre) | quadros no arrasto, 75 no deslize, depois 0 em 10 s |
| Clique perto do polo | (desenha sempre) | 2 quadros, o marcador a 0,5 px do clique e o painel com o céu do ponto; depois 0 em 8 s |
| Data 7 dias depois (mudada no estado do `App`, porque quem liga o controle é o E14) | (desenha sempre) | 5 quadros, a luz em outra direção e a sombra no lado novo; depois 0 em 8 s |
| Janela em tamanho de tablet | (desenha sempre) | 2 quadros, a cena no tamanho novo; depois 0 em 6 s |

O Marco conferiu no mesmo dia, no Edge dele, com o `npm run dev` e o "Frame Rendering Stats" do
DevTools: funcionou.

- **Para o C6:** o `PerformanceMonitor` do Drei mede dentro do `useFrame`, então só mede quando a
  cena desenha. Com a Lua parada não há quadro para medir: a medida tem que acontecer enquanto ela
  gira ou enquanto a pessoa mexe, ou o C6 pede alguns quadros só para medir.

### C10 · Parar o giro quando um ponto é escolhido

**Estado:** feito em 10/11, PR #20 · **Depende de:** C5 (feito)

**Para que serve.** Hoje, o ponto escolhido com Ctrl, Shift ou Cmd+clique sai andando com a Lua:
esse clique escolhe o ponto, mas não para o giro do C5. Com a lista do I2 vai acontecer o mesmo.
Veio da revisão do PR #13.

**O que fazer.** O `site` já chega à cena como prop. Com
`autoRotate={!reducedMotion && !hasMoved && !site}` em `src/scene/LunarScene.jsx`, o clique com
tecla e a lista ficam cobertos sem mexer no I2. Parar o giro no `handleMoonClick` cobriria só o
clique, por isso ficou de fora.

**Como testar** (`src/scene/LunarScene.test.jsx`). Com os mesmos substitutos do C5: um teste dá
`rerender` com `site`, sem chamar o `onStart`, e o `autoRotate` vai a `false`.

**Pronto quando.** O teste acima passa; a linha do README (seção "Acessibilidade") deixa de dizer
"sem Ctrl, Shift ou Cmd"; e o `verify` passa.

**Conferido** em 10/11/2026, no `npm run dev`, num Chromium (o navegador do app do Claude), com os
"Efeitos de animação" do Windows do Marco ligados, lendo da página o `autoRotate` dos controles e
a posição da câmera (os quadros avançados pelo `advance` do React Three Fiber, como no C5):
- Shift+clique perto do polo: o ponto foi escolhido, o marcador apareceu e o `autoRotate` foi a
  `false` com o `hasMoved` ainda `false`, ou seja, o clique não avisou o `onStart` e quem parou o
  giro foi o ponto escolhido. Depois do resto do deslize, a câmera ficou parada por 1.100 quadros.
- Clique comum, numa página recarregada: escolheu o ponto e parou o giro pelo `onStart`, como no
  C5.
- O Marco conferiu a olho no navegador dele, no mesmo dia, com o `npm run dev`: o Shift+clique
  perto do polo, sem mexer na Lua antes, escolheu o ponto e parou o giro.
- No teste do C5, o `rerender` do fim passou a trocar a data, e não o ponto: com o C10, um ponto
  escolhido já para o giro, e aquele trecho passaria mesmo com o C5 quebrado. Conferido com uma
  quebra que esquece o `hasMoved` quando a cena desenha de novo: o teste com a data reprova, o com
  o ponto passa.

**Aberto.** Um jeito de pausar pelo teclado antes de a pessoa escolher qualquer ponto (a WCAG
2.2.2 junto com a 2.1.1, "tudo operável pelo teclado"). Decidimos depois do I2.

### C11 · A sombra com o Sol rasante

**Estado:** a fazer; sugestão da revisão do C6, em 13/11 · **Depende de:** nada

**Para que serve.** Na revisão do C6, uma simulação no Node da sombra do three (o mapa de 2048
pixels do C2, com o `normalBias` de 0,0002 raio da Lua, uns 347 m) comparou a sombra desenhada com
um raio traçado até o Sol nos dados de 80 m. Com o Sol rasante, as duas discordaram em 28% dos
pontos virados para o Sol, em média, e em até 73% num ladrilho, com qualquer passo da malha. A
maior parte é sombra que falta: num ladrilho, com um `normalBias` 4 vezes menor, a parte na sombra
subiu de 13% para 46%. Não conferido no navegador.

**O que fazer.** Medir no navegador, num lugar com sombra longa, quanto da sombra some com o
`normalBias` de hoje (`src/scene/LunarScene.jsx`) e com um menor, e ver se voltam as listras que
ele evita (o "shadow acne" do C2).

**Pronto quando.** Os números do navegador estão neste card, e a equipe decidiu se o `normalBias`
muda.

### C12 · Suavizar as bordas sem o MSAA

**Estado:** a fazer; sugestão do C6, em 13/11 · **Depende de:** C6

**Para que serve.** No C6, o antisserrilhado (MSAA) saiu do `<Canvas>`: ele dobrava o tempo de
cada quadro na placa de vídeo, e na Intel UHD 630 com a janela maximizada o relevo fino desligava.
Sem ele, de perto a imagem quase não muda, mas de longe a borda da Lua fica em degraus.

**O que fazer.** Ver se uma passada de FXAA (o código dela vem no three, em `three/examples`, sem
dependência nova) suaviza a borda da Lua sem devolver o custo: ela pinta a tela inteira uma vez a
mais, uns 1 ms (não medido). Ela muda o jeito de a cena desenhar (o quadro passa por uma imagem
intermediária), então o estêncil do relevo fino e a sombra precisam ser conferidos junto.

**Pronto quando.** A borda da Lua de longe fica lisa na conferência a olho, o custo medido no
CIT-DES06 com a janela maximizada fica abaixo de 1,5 ms a mais, e o `verify` passa.

---

## I: Miguel

### I1 · Painel com os números do ponto escolhido

**Estado:** feito em 08/11, PR #11 · **Depende de:** nada para começar; o formato em "O que a
ponte entrega para a tela" basta

**Para que serve.** É a parte que responde em texto: "daqui, o Sol e a Terra aparecem? Até
quando? Quando dá para pousar?". É o que os juízes vão ler.

**O que a pessoa vê, em cada `status`.**
- `idle`: o texto que já aparece hoje ("Choose a landing site to see when the Sun and the Earth
  are above its horizon.").
- `loading`: um aviso de que está calculando, sem números velhos na tela.
- `error`: uma frase curta dizendo que não deu para calcular aquele ponto e para tentar outro.
- `ready`:
  - **Sun now** e **Earth now**: à vista ou escondido pelas montanhas, e a altura em graus;
  - **Next sunset**: data e hora em UTC, ou um texto dizendo que o Sol não se põe no período;
    com o Sol escondido o período inteiro (`sunFraction` 0), um texto dizendo isso, porque o
    `nextSunsetUtc` também vem `null` nesse caso (revisão do PR #11);
  - **Sunlight in the period**: porcentagem;
  - **Longest darkness**: em horas;
  - **Landing windows**: a lista de início e fim em UTC, ou um texto dizendo que não há janela no
    período.

**O que fazer.**
1. `src/data/panel.js` com todos os textos, em inglês. Mova para lá o `panel.empty` que hoje está
   em `src/data/app.js`.
2. `src/panel/format.js` com três funções pequenas:
   - graus com uma casa decimal e o símbolo °;
   - porcentagem: `new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })`
     (0.855 vira "85.5%");
   - data em UTC: `new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', dateStyle: 'medium',
     timeStyle: 'short' })` (vira "14 Nov 2026, 03:00"; acrescente " UTC" depois).
3. `src/panel/SitePanel.jsx`: recebe `status` e `sky` por props e mostra o que está acima.
4. `src/panel/SitePanel.css`, só com tokens.
5. No `App.jsx`, trocar a linha `<p className="app__empty">{app.panel.empty}</p>` por
   `<SitePanel status="idle" sky={null} />`. O E11 liga o resto.
6. Os arquivos novos no bloco "Estrutura" do README.

**Como testar** (`src/panel/SitePanel.test.jsx` e `src/panel/format.test.js`). Escreva o teste
antes do componente: ele falha primeiro, e depois você faz passar. Os resultados de teste ficam
dentro do próprio arquivo de teste, nunca em `src/data/`.
- Um teste para cada `status`.
- `ready` com `nextSunsetUtc: null` mostra o texto de "não se põe".
- `ready` com `landingWindows: []` mostra o texto de "nenhuma janela".
- A hora sai em UTC: com `new Date('2026-11-14T03:00:00Z')`, a tela mostra 03:00. A suíte roda
  no fuso de Tóquio de propósito: se o formatador esquecer o `timeZone: 'UTC'`, aparece 12:00, e
  o teste pega (conferido em 29/10/2026).

**Cuidado.** `elevationDeg` negativo com `visible: true` não é erro (veja "O que a ponte entrega
para a tela"). Mostre os dois como chegam.

**A janela mínima ainda está em aberto.** O painel só lista janelas que duram pelo menos
`MIN_LANDING_WINDOW_HOURS` (`src/engine/config.js`), um valor provisório. Combine o valor com o
Enzo e o Marco antes de fazer a lista de janelas. Para essa conversa, medido em 30/10/2026 com
`node scripts/prepare-data/window-lengths.mjs`: a porcentagem dos pontos de comparação com a NASA
que têm pelo menos uma janela deste tamanho, contando a partir de 14/11/2026.

| Pontos | Período | ≥ 24 h | ≥ 72 h | ≥ 144 h |
|---|---|---|---|---|
| os 10 mais iluminados do mapa da NASA | 30 dias | 100% | 100% | 90% |
| os 10 mais iluminados do mapa da NASA | 365 dias | 100% | 100% | 100% |
| sorteio de 85° a 90°S (259 pontos) | 30 dias | 58% | 49% | 38% |
| sorteio de 85° a 90°S (259 pontos) | 365 dias | 78% | 70% | 59% |
| sorteio de 84° a 85°S (113 pontos) | 30 dias | 50% | 41% | 35% |
| sorteio de 84° a 85°S (113 pontos) | 365 dias | 72% | 66% | 56% |

O sorteio tem de propósito ponto claro e ponto escuro, em dez faixas de Sol.

**Pronto quando.**
- Os quatro `status` aparecem diferentes na tela.
- Os testes acima passam.
- Nenhum texto fora de `src/data/panel.js` e nenhuma cor fora dos tokens.
- O `verify` passa.

### I2 · Lista de locais de pouso

**Estado:** feito em 11/11, PR #23 · **Depende de:** P1 para os dados de verdade; o componente começa antes,
com dados de teste

**Para que serve.** É o caminho mais rápido para ver um resultado: escolher "Athena (IM-2)" numa
lista, em vez de procurar o ponto na Lua. Também é o jeito de escolher pelo teclado.

**O que fazer.**
1. `src/panel/SiteList.jsx`: um `<select>` com `<label>`, com os locais agrupados por tipo
   (`<optgroup>`): "Landed" para os que já pousaram e "Artemis III candidate regions" para as
   regiões candidatas, que não têm data de pouso. Por tipo, e não por agência: com os locais
   previstos (o IM-2 e as 9 regiões candidatas), agência daria um grupo "Intuitive Machines" com
   um local e um "NASA" com nove, e não diria que ninguém pousou nas regiões candidatas (decisão
   do Enzo). Por que um `<select>` comum, e não uma lista desenhada: ele já funciona com teclado e
   com leitor de tela sem esforço nenhum. Uma lista mais bonita fica para depois, se sobrar tempo.
2. Ao escolher, chamar `onSelect(site)`, que o `App.jsx` liga no E14.
3. Quando o P1 entregar a planilha: `src/data/sites.js`, um objeto por linha, no formato
   `{ id, name, mission, agency, lat, lon, landedAtUtc, sourceUrl }`. Linha sem fonte não entra.
   Só entram os locais que o site calcula, os que ficam dentro do relevo, até 84°S (card E2): um
   local ao norte disso daria erro no painel. Por isso a lista sai só com o IM-2: as 9 regiões
   candidatas do Artemis III ficaram para o card E16 (antes I7), e os outros locais da planilha
   esperam o card E8.

**Como testar.**
- `src/panel/SiteList.test.jsx`: escolher uma opção com `userEvent.selectOptions` chama o
  `onSelect` com o local certo (os locais de teste ficam no próprio arquivo de teste).
- `src/data/sites.test.js`: todo local tem `sourceUrl` começando com `https://`, `lat` entre −90 e
  90, `lon` entre −180 e 180, nenhum `id` se repete, e todo local fica dentro da área com relevo,
  pelo `isInsideReliefArea` (`src/engine/reliefFiles.js`) com o `areaMaxLatDeg` de
  `public/data/relief/manifest.json`: a mesma regra com que o motor recusa o ponto e o clique na
  cena barra.

**Pronto quando.** Os testes passam, dá para escolher só com o teclado (Tab até a lista, setas,
Enter), e o `verify` passa.

### I3 · Fonte do site

**Estado:** feito em 11/11, PR #24 · **Depende de:** nada; combinar a escolha com quem fizer o V2

**Para que serve.** Hoje o site usa a fonte padrão do sistema, que muda de um computador para
outro. Uma fonte própria deixa o site igual em qualquer máquina, inclusive na dos juízes.

**O que fazer.**
1. Escolher entre Fira Sans e Overpass, as fontes da identidade visual do Space Apps. Mostrar as
   duas para a equipe antes de decidir.
2. Instalar pelo npm: `npm install --save-exact @fontsource/fira-sans` (ou `@fontsource/overpass`).
   Conferido em 29/10/2026: as duas existem no npm, na versão 5.3.0, com licença OFL-1.1.
   Dependência nova precisa do OK do Enzo: este card é o OK.
3. No `src/main.jsx`, importar só os três pesos que os tokens usam (400, 500 e 600):
   `import '@fontsource/fira-sans/400.css'`, e o mesmo para 500 e 600.
4. No `src/styles/tokens.css`, pôr o nome da fonte no começo do `--font-sans`.
5. Uma linha no CREDITS.md, com a licença.

Por que pelo npm, e não pelo link do Google Fonts: o arquivo da fonte vai junto com o site, então
ela aparece mesmo se o servidor do Google estiver lento ou bloqueado no dia, e a versão fica fixa
no `package.json`.

**Pronto quando.** No DevTools > Network, a fonte vem do próprio site; o CREDITS.md tem a
licença; o `verify` passa.

### I4 · Escolher a data e a hora, em UTC

**Estado:** feito em 09/11, PR #17 · **Depende de:** nada

**Para que serve.** O resultado muda com a data: o mesmo ponto pode estar no Sol hoje e no escuro
daqui a uma semana. As missões trabalham em UTC, e o site também.

**O que fazer.**
1. `src/panel/DateTimeControl.jsx`: um `<input type="datetime-local">` com o rótulo "Date and
   time (UTC)" e um botão "Now". Os textos em `src/data/panel.js`.
2. **O erro mais provável deste card:** o `datetime-local` não guarda fuso, e
   `new Date(valor)` lê o valor no fuso do computador. Leia como UTC: `new Date(valor + ':00Z')`.
   Para pôr uma data no campo: `data.toISOString().slice(0, 16)`.
3. Ao mudar, chamar `onChange(dateUtc)`, que o `App.jsx` liga no E14.

**Como testar** (`src/panel/DateTimeControl.test.jsx`).
- Digitar `2026-11-14T03:00` resulta num `Date` com `getUTCHours() === 3`. A suíte roda em
  Tóquio: com `new Date(valor)`, sem o `Z`, o resultado seria 18:00 UTC do dia 13, e o teste
  falha. Esse é o erro que ele está ali para pegar (conferido em 29/10/2026).
- O botão "Now" usa a hora atual: fixe a hora no teste com `vi.setSystemTime`.

**Pronto quando.** Os testes passam, funciona só com o teclado, e o `verify` passa.

### I5 · Rodar o script do relevo do zero, seguindo só o README

**Estado:** feito em 12/11, PR #29 · **Depende de:** nada

**Para que serve.** O relevo que o site usa (`public/data/relief/`) sai de um script, e até agora
só o Enzo rodou esse script. Se o README dele depender de alguma coisa que só existe no
computador do Enzo, ninguém mais consegue gerar o relevo de novo. O card E2 só fecha de vez
quando outra pessoa roda tudo do zero, lendo só o README.

**O que fazer.**
1. Num clone atualizado da `develop`, siga `scripts/prepare-data/README.md` do passo 1 ao 4, na
   ordem, sem pular nada. Os dois downloads da NASA somam uns 410 MB.
2. Se algum passo não sair como o README diz, pare nele e anote o passo, o comando e a saída
   inteira. Não conserte por conta própria: o que faltou é do README, e o conserto fica com o
   Enzo.

**Pronto quando.** Este card tem uma linha com a data, a versão do Python (a primeira linha da
saída do passo 2) e a saída do passo 4, que é `OK: os recortes gerados são idênticos aos do
repositório` ou o que apareceu no lugar. Com ela, o Enzo marca o critério que falta no card E2.

**Resultado.** 12/11/2026 · `Python 3.12.10` · passo 4:
`OK: os recortes gerados são idênticos aos do repositório`.

Rodado pelo Miguel no computador dele, com Windows 11, na pasta `C:\umbraview`: a `develop`
atualizada, sem `data-raw/`, sem `.venv/` e sem cache do pip antes de começar. Os passos 1 a 4
foram feitos na ordem, cada bloco colado no shell que o README pede, e todos saíram sem erro. O
passo 3 deu as três linhas que o README espera, terminando em `OK: 332 ladrilhos, 334 arquivos,
43.5 MB em public/data/relief; maior arquivo far.bin, 1.29 MB`.

**O que o README não diz, ou confunde.** Anotado para o Enzo; o README não foi mexido.
1. **Tempo.** O README não diz quanto levam os passos 1 e 3 (os passos 5 e 7 dizem). Medido
   aqui: o passo 1 levou uns 10 min (4 min 37 s e 5 min 15 s, média de 660 KB/s); o passo 2,
   menos de 1 min; o passo 3, cerca de 2 min.
2. **Espaço do Python.** O README pede "uns 410 MB livres ... fora o ambiente do Python" e não diz
   quanto ele ocupa. A `.venv/` ficou com 167 MiB (2.796 arquivos), de uns 44 MB baixados do PyPI
   (numpy 12,6 MB, rasterio 30,7 MB, o resto pequeno). Com os arquivos da NASA, uns 600 MB.
3. **Passo 1 sem linha de confirmação.** Além da barra de progresso, o README não diz que saída
   mostra que o download deu certo. Quem confere é o passo 3, pelo SHA-256.
4. **MB e MiB.** O `curl` mostra o tamanho em MiB (180.3M e 208.8M), e o README fala em MB (189 e
   219). São os mesmos arquivos (189.158.392 e 218.961.039 bytes), mas quem confere pela tela
   pode achar que o download veio menor.
5. **Linhas longas.** Copiado de uma tela estreita (aqui, a do Claude Code), o endereço de cada
   `curl` do passo 1 caiu sozinho na linha de baixo, e o PowerShell receberia o `curl` sem o
   endereço; no passo 2, a linha do `pip` quebrou e um pedaço dela apareceu repetido. No GitHub e
   no VS Code, cada comando fica numa linha. Os blocos dos passos 1, 2 e 4 foram colados de uma
   cópia com cada comando inteiro numa linha, com o mesmo texto do README; a linha do passo 4 tem
   uns 190 caracteres.

### I6 · Dizer no painel qual é o período

**Estado:** a fazer · **Depende de:** I1 (feito)

**Para que serve.** "Sunlight in the period" e "Longest darkness" não dizem qual é o período:
quem lê 85.5% não sabe se é de uma semana ou de um ano. O mesmo vale para os dois textos do
painel que terminam em "in this period" (o do pôr do Sol e o da lista de janelas). O período
começa na data escolhida e dura `PERIOD_DAYS` dias (`src/engine/config.js`, hoje 30). Veio do PR
#11 (card I1).

**O que fazer.**
1. Antes de começar, combinar com o Enzo de onde vem o fim do período. Hoje só o motor sabe a
   duração, e o painel nem recebe a data. Dois caminhos: o `sky` passa a trazer o período pronto
   (campo novo na tabela de "O que a ponte entrega para a tela", com aviso ao Marco no mesmo
   dia), ou o painel recebe a data e soma o `PERIOD_DAYS`. Um detalhe pesa a favor do primeiro:
   o motor calcula de hora em hora a partir da data (`src/engine/siteSky.js`), então o último
   instante calculado fica uma hora antes de "data + 30 dias", e é ele o fim de uma janela com
   "(continues)".
2. Mostrar no painel o começo e o fim do período, em UTC, com o `formatUtc`
   (`src/panel/format.js`). Os textos em `src/data/panel.js`.

**Como testar** (`src/panel/SitePanel.test.jsx`). O `ready` mostra o começo e o fim do período em
UTC. A suíte roda em Tóquio: se o fuso escapar, a hora sai errada e o teste pega.

**Pronto quando.** Quem lê o painel sabe de quando a quando valem os números do período, os
testes passam e o `verify` passa.

### I7 · As 9 regiões do Artemis III na lista

**Estado:** passou para a área E, como card E16. O número I7 fica só aqui, para não ser usado de
novo.

---

<!-- Os cards P vão em PDF para quem não usa o GitHub: escreva sem citar arquivo do
repositório. O que eles precisam ler vai nos anexos do PDF: a tabela de dados do CREDITS.md
(anexo A) e o texto em inglês de docs/uso-de-ia.md (anexo B). -->
## P: Mateus Berlingieri

Nenhum destes cards pede código. A entrega fica numa pasta compartilhada com a equipe.

### P1 · Tabela dos locais de pouso

**Estado:** a fazer · **Depende de:** nada

**Para que serve.** Vira a lista de locais que aparece no site (o Miguel monta essa parte). Os
juízes vão ler essas
coordenadas e datas como fato; um número errado é um erro com o nome da equipe.

**O que fazer.** Uma planilha compartilhada, uma linha por local, com estas colunas:

| Coluna | O que vai | Formato |
|---|---|---|
| `name` | nome curto do local, em inglês | texto |
| `mission` | nome da missão | texto |
| `agency` | agência ou empresa responsável | sigla (NASA, CNSA, ISRO, JAXA...) |
| `lat` | latitude, positiva ao norte | graus decimais com ponto, de −90 a 90 |
| `lon` | longitude, positiva a leste | graus decimais com ponto, de −180 a 180 |
| `landedAtUtc` | data e hora do pouso, em UTC; vazio para região candidata | `AAAA-MM-DD HH:MM` |
| `sourceUrl` | link da fonte | `https://...` |
| `consultedOn` | dia em que você leu a fonte | `DD/MM/AAAA` |
| `notes` | o que alguém precisa saber (coordenada aproximada, duas fontes que não batem...) | texto |

Quais locais: os pousos do Apollo (o Apollo 13 não pousou); os pousos soviéticos (Luna) e
americanos sem tripulação (Surveyor); Chang'e 3, 4, 5 e 6; Chandrayaan-3; SLIM; as missões CLPS
que já pousaram (confira a lista atual na página do CLPS da NASA); as regiões candidatas do
Artemis; os 4 locais fora do polo do relatório das Academias Nacionais dos EUA (NASEM) de
21/10/2026.

Onde procurar: na fonte primária, como a página da missão na agência, o artigo científico do
pouso ou as imagens do local feitas pela sonda LRO (LROC). A Wikipedia ajuda a achar a fonte
primária, mas não serve como fonte final.

**Regras.** Linha sem fonte fica de fora; não estime. Se duas fontes derem coordenadas
diferentes, anote as duas em `notes` e avise o Enzo.

**Pronto quando.** Toda linha tem fonte, e o Enzo revisou.

### P2 · Créditos e licenças

**Estado:** a fazer · **Depende de:** nada para começar; a música e a fonte de letra entram
quando forem escolhidas

**Para que serve.** O Space Apps exige que toda fonte externa usada no projeto seja citada, com a
licença.

**O que fazer.**
1. Na lista das fontes de dados do projeto (anexo A do PDF), a coluna "Condição de uso" está
   "a conferir". Para cada linha, abra o link da fonte e procure o que a página diz sobre uso e
   citação. Copie a frase e o link.
2. Ler os termos de participação do Space Apps 2026 (página "Legal" do site) e conferir que a
   licença do projeto, MIT, atende ao que eles pedem.
3. Conferir a licença da música escolhida no V3 e da fonte de letra do site, que o
   Miguel escolhe.

**Entrega.** A condição de uso de cada fonte, com a frase e o link, numa planilha ou num
documento; o Enzo leva para o projeto.

**Pronto quando.** Nenhuma fonte fica "a conferir".

### P4 · Texto da submissão, em inglês

**Estado:** a fazer · **Depende de:** P5 ajuda; revisar em 13/11, com o guia de submissão

**Para que serve.** A submissão é uma página do projeto no site do Space Apps, preenchida entre
14/11, 9h, e 15/11, 23h59. É o primeiro texto que os juízes leem.

**O que fazer.** Um rascunho em inglês, num documento compartilhado, com:
- o problema: por que escolher onde pousar na Lua depende de luz do Sol e de ver a Terra;
- o que o UmbraView faz, em linguagem simples;
- os dados da NASA usados (anexo A do PDF);
- como a equipe usou IA: o texto pronto, em inglês, está no anexo B do PDF (o Space Apps exige
  essa descrição);
- a equipe.

Junto, um parágrafo curto em inglês que apresenta o projeto, para a página do código; o Enzo
coloca lá. Em 13/11, quando sair o guia de
submissão, ajustar o texto aos campos dele.

**Pronto quando.** O Enzo revisou o rascunho, e ele foi ajustado ao guia em 13/11.

### P5 · Ferramentas parecidas que já existem

**Estado:** a fazer · **Depende de:** nada

**Para que serve.** Os juízes vão perguntar "o que isso tem de novo?". A resposta sai desta
tabela.

**O que fazer.** Uma tabela com: nome, link, quem fez, o que mostra, para quem é, e o que o
UmbraView faz que ela não faz. Comece pelo NASA Moon Trek e pelo LROC QuickMap, e procure outras
que mostrem iluminação no polo sul ou ajudem a planejar pouso.

**Pronto quando.** A tabela foi revisada com o Enzo.

---

## V: Miguel

### V1 · Roteiro e storyboard do vídeo

**Estado:** a fazer · **Depende de:** nada para o roteiro; as gravações dependem de as telas do
site ficarem prontas

**Para que serve.** O vídeo mostra o projeto funcionando para quem não vai abrir o site. Ele é
montado no domingo (15/11), com pouco tempo: com o roteiro pronto antes, ninguém decide na pressa.

**O que fazer**, junto com o Mateus B.:
1. Roteiro em três partes: o problema (por que a luz e a Terra importam para pousar), o UmbraView
   funcionando (escolher um local, ver o Sol e a Terra, ver as janelas de pouso) e o resultado.
2. Storyboard: uma linha por cena, com a duração, o que aparece na tela e a legenda em inglês.
3. A lista das gravações de tela que vão ser necessárias, para gravar quando a tela estiver
   pronta.
4. A duração sai do guia de submissão de 13/11. Monte o roteiro em blocos que dê para cortar,
   para servir tanto a uma versão curta quanto a uma longa.

**Pronto quando.** Roteiro e storyboard na pasta compartilhada, revisados com o Enzo.

### V2 · Identidade visual da equipe e do projeto

**Estado:** a fazer · **Depende de:** nada

**Para que serve.** O logo aparece no vídeo, na página da submissão e no ícone do site.

**O que fazer.**
- Logo da Umbra Team e do UmbraView.
- Nas cores do site: fundo `#0b0d12`, dourado `#e9b450` (o Sol) e azul `#79aee8` (a Terra).
- Arquivos em SVG e em PNG (512 e 1024 px, fundo transparente), mais uma versão simples que dê
  para ler bem pequena, como ícone da aba do navegador.
- **Sem o logo redondo da NASA, o logotipo ou o selo dela**: só com autorização da NASA. Escrever
  "NASA Space Apps Challenge 2026" em texto pode.

**Pronto quando.** Os arquivos estão na pasta compartilhada e a equipe aprovou. O Enzo troca o
ícone do site.

### V3 · Kit de produção

**Estado:** a fazer · **Depende de:** nada

**O que fazer.**
1. Música: uma trilha cuja licença permita usar em vídeo publicado. Anote nome, autor, link e
   licença: o Mateus B. confere (P2) e o Enzo registra no projeto.
2. Gravação de tela: OBS Studio (gratuito), configurado em 1080p. Faça uma gravação de teste de
   qualquer janela, para acertar a configuração. O site ainda não está publicado (card E4): a
   gravação dele sai do `npm run preview`, que mostra a versão final do site.
3. Legenda em inglês: um arquivo `.srt` de modelo e o estilo definido (fonte, tamanho, posição).

**Pronto quando.** Tudo na pasta compartilhada, com a licença da música anotada.

### V4 · Edição final

**Estado:** a fazer · **Depende de:** V1, V2, V3 e as gravações do hackathon · **Quando:** 15/11

Montar o vídeo com as gravações do hackathon, exportar no formato e na duração do guia de
submissão de 13/11 e entregar onde o guia pedir.

---

## Fora do escopo por enquanto

Ideias que apareceram e não entram agora. Voltam para a lista de cima só com o OK do Enzo.

- Clicar em qualquer ponto da Lua inteira: a área liberada vai do polo até 84°S (card E2), e o
  resto fica para depois.
- Modo história: contar uma missão passo a passo.
- Pedir à organização local uma confirmação por escrito de que a equipe pode começar antes de
  14/11 (era o card P3): o Enzo decidiu em 05/11/2026 não pedir. A equipe segue a orientação do
  orientador e da organização do evento de 2025, e o risco está aceito no escopo (card E5).

# Backlog

O que falta fazer, de quem é e como saber que ficou pronto. Procure o seu nome.

## Como usar este arquivo

**Quem é de dev (Enzo, Marco, Miguel).** Avise no grupo que pegou o card, crie a branch com o
código dele (`feat/i1-painel`) e siga o [CONTRIBUTING.md](../CONTRIBUTING.md). No PR que fecha o
card, troque o "Estado" dele para "feito em dd/mm, PR #n".

**Quem não é de dev (Mateus B., Matheus).** Vocês não usam o GitHub: o Enzo manda os cards de
vocês em PDF, e manda de novo quando eles mudarem. O que vocês precisam ler vai no fim do PDF:
as fontes de dados do projeto (anexo A) e o texto de uso de IA (anexo B). A entrega é planilha, texto, imagem ou vídeo, numa pasta
compartilhada com a equipe. Avise o Enzo quando terminar; ele marca o card como feito e leva o
resultado para o projeto. Se usarem IA para gerar imagem, música, vídeo ou texto que entra no
projeto, avisem o Enzo: o texto de uso de IA precisa dizer isso.

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
para o painel. Quem liga isso no `App.jsx` é o card E11. Os cards C1 e I1 só trocam, cada um, a
linha do texto vazio da própria região pelo componente novo. Assim o Marco e o Miguel não
editam as mesmas linhas ao mesmo tempo.

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

**Estado:** feito em 03/11, PR #3; falta a conferência do card I5 · **Depende de:** nada

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
MB; até 84°S, 44 MB. Até 84°S cabem as regiões candidatas do
Artemis III: a NASA disse em 19/08/2022 que elas ficam "within six degrees of latitude of the
lunar South Pole" (fonte no CREDITS.md). Num arquivo só, o relevo fino até 84°S teria 46 MB para baixar antes do
primeiro clique. Comprimir os ladrilhos (gravando a diferença entre vizinhos, e depois gzip)
tiraria uns 24 MB do repositório, mas pede código para descomprimir no site; se fizer falta, a
mudança fica só em `reliefFiles.js`.

**Comparação com a NASA.** Está no card E1, feita com estes arquivos.

**Pronto quando.**
- Com os recortes, a porcentagem de Sol e de Terra fica perto do mapa de Mazarico et al.
  (CREDITS.md) nos pontos de referência, e um script refaz a comparação. Feito:
  `scripts/prepare-data/compare-nasa.mjs`, com o resultado no card E1.
- Outra pessoa da equipe roda o script do zero seguindo só o README dele. Falta: card I5.
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

**Estado:** a fazer · **Depende de:** nada

1. Trocar "CLPS Lunar Mission Browser" por "Lunar Landing Site Navigator" / "UmbraView" nos
   títulos: o desafio mudou de nome.
2. Corrigir a frase "a FAQ de 2026 não proíbe": a FAQ diz "Teams are not allowed to begin
   working on the challenges prior to the hackathon". Registrar ao lado a decisão da equipe e o
   card P3.

### E6 · Revisar PRs e levar a `develop` para a `main`

**Estado:** contínuo. Quem revisa o quê está no CONTRIBUTING.md, seção 1.

### E7 · Teste dos ganchos numa pasta que já é repositório

**Estado:** a fazer · **Depende de:** nada

**Para que serve.** O teste "fora de um repositório git, avisa e não quebra o npm install", em
`scripts/ganchos.test.js`, roda o `instalar-ganchos.mjs` numa pasta temporária e supõe que ela
não está dentro de nenhum repositório. Na máquina do Marco, a pasta de usuário é um repositório
git, e o teste falhou (revisão do PR #2, 30/10/2026); com a pasta temporária fora dela, passou.

**O que fazer.** Fazer o git chamado pelo teste parar de procurar repositório acima da pasta
temporária. Uma saída a conferir: passar ao `spawnSync` a variável `GIT_CEILING_DIRECTORIES`
com a pasta de cima da temporária.

**Pronto quando.** O teste passa com a pasta temporária dentro de um repositório git (crie um
de propósito para conferir), e o `verify` passa.

### E8 · Relevo dos locais da lista fora do polo

**Estado:** a fazer · **Depende de:** P1 (a lista de locais)

**Para que serve.** O relevo do site vai do polo até 84°S (card E2). Os outros locais da lista
(Apollo, Luna, Surveyor, Chang'e, Chandrayaan-3, SLIM, CLPS) ficam fora dele, e até este card o
painel mostra erro para eles.

**O que fazer.**
1. No script de `scripts/prepare-data/`, um recorte por local da lista ao norte de 84°S, dos
   arquivos LOLA da Lua inteira (CREDITS.md): o fino até 10 km do local e o grosso até 200 km.
2. No site, montar as camadas desses recortes com `cylindricalGridRelief`
   (`src/engine/relief.js`).
3. Escolher uma referência de fora para conferir o resultado: os mapas de Mazarico só cobrem o
   polo.

**Pronto quando.** Escolher qualquer local da lista mostra o resultado no painel, o tamanho dos
recortes está anotado aqui, e a conferência também.

### E9 · Testes do motor sem o navegador simulado

**Estado:** a fazer · **Depende de:** nada

**Para que serve.** Todos os testes rodam dentro do jsdom, o navegador simulado, inclusive os do
motor, que não usam tela. Em 29/10/2026, o Vitest avisou que criar o jsdom levou 67% do tempo
que ele mediu.

**O que fazer.** Pôr `// @vitest-environment node` no topo dos testes de `src/engine/` e de
`scripts/` (conferir antes que o Vitest 5 aceita esse comentário), e medir o tempo do
`npm run test` antes e depois.

**Pronto quando.** O `verify` passa e os dois tempos estão anotados aqui.

### E10 · Nome dos scripts em inglês

**Estado:** a fazer · **Depende de:** nada

**Para que serve.** O CLAUDE.md pede nome de arquivo em inglês, e quatro arquivos de `scripts/`
estão em português: `conferir-build.mjs`, `conferir-build.test.js`, `ganchos.test.js` e
`instalar-ganchos.mjs`.

**O que fazer.** Renomear os quatro e tudo que aponta para eles: `package.json`, o CI
(`.github/workflows/`), o README e o CONTRIBUTING.

**Pronto quando.** Nenhum nome em português em `scripts/`, e o `verify` e o CI passam.

### E11 · Ligar a ponte no `App.jsx`

**Estado:** a fazer · **Depende de:** E3 (feito), C1, I1, I2 e I4

**Para que serve.** É aqui que o site passa a responder: o ponto e a data escolhidos ficam
guardados no `App.jsx`, que entrega os dois para a cena e para o painel.

**O que fazer.**
1. No `App.jsx`: guardar o ponto e a data escolhidos e entregar os dois para a cena e para o
   painel. O painel recebe o que o `useSiteSky` devolve; a cena, o que o `useSubsolarPoint`
   devolve. Ligar o `onSelect` da lista (I2), o `onChange` da data (I4) e, quando o C3 existir, o
   `onSelect` do clique na cena.
2. Não trocar a data guardada por uma data inválida: o campo do I4 vazio dá `Invalid Date`, o
   motor não tem posição do Sol para ela, e o `useSubsolarPoint` derruba a tela.

**Pronto quando.** Escolher um local na lista mostra o resultado no painel e a luz certa na
cena, e o `verify` passa.

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

**Estado:** a fazer · **Depende de:** C1 e E2 (feito); a direção do Sol já está pronta
(`useSubsolarPoint`, card E3)

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

**Pronto quando.** Em três pontos combinados com o Enzo, numa mesma data, a cena mostra luz onde
o motor diz `visible: true` e sombra onde diz `false`; e o `verify` passa.

### C3 · Escolher um ponto clicando na Lua

**Estado:** a fazer · **Depende de:** C1 e E2 (feito)

**Para que serve.** Além da lista de locais (I2), a pessoa pode clicar em qualquer ponto da área
liberada e ver o resultado dele.

**O que fazer.**
1. `src/scene/coordinates.js`, com duas funções, de latitude e longitude para ponto 3D e de
   volta. A convenção: o eixo y aponta para o polo norte; longitude 0° em +x; longitude 90° leste
   em −z.
   - ida: `x = cos(lat)·cos(lon)`, `y = sin(lat)`, `z = −cos(lat)·sin(lon)`;
   - volta: `lat = asin(y)`, `lon = atan2(−z, x)` (normalize o ponto para tamanho 1 antes).
2. No `onClick` do `<mesh>` da Lua, o ponto atingido chega em `event.point`. Converter e chamar
   `onSelect({ lat, lon })`, que vem do `App.jsx` (E11).
3. Um marcador pequeno no ponto escolhido, também quando ele vem da lista.
4. Clique fora da área liberada não escolhe nada e mostra um aviso curto (texto em
   `src/data/scene.js`). A área liberada vai do polo até 84°S: é o `areaMaxLatDeg` de
   `public/data/relief/manifest.json`, e a conta é `isInsideReliefArea(manifest, lat)`, de
   `src/engine/reliefFiles.js`.

Quem usa teclado escolhe pela lista (I2); a cena não precisa receber foco.

**Como testar** (`src/scene/coordinates.test.js`). Os quatro pontos da convenção: (0°, 0°) → (1,
0, 0); (0°, 90°) → (0, 0, −1); (90°, 0°) → (0, 1, 0); (−90°, 0°) → (0, −1, 0). E a ida e volta de
alguns pontos perto do polo sul dando o mesmo ponto, comparando com `toBeCloseTo`: perto do polo,
arredondar no meio da conta já desloca a longitude.

**Pronto quando.** Os testes passam, o clique escolhe o ponto e o painel mostra o resultado dele,
e o `verify` passa.

### C4 · Quanto o site pesa nos notebooks da equipe

**Estado:** a fazer · **Depende de:** C1 (e de novo depois do C2)

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

---

## I: Miguel

### I1 · Painel com os números do ponto escolhido

**Estado:** a fazer · **Depende de:** nada para começar; o formato em "O que a ponte entrega
para a tela" basta

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

**Estado:** a fazer · **Depende de:** P1 para os dados de verdade; o componente começa antes,
com dados de teste

**Para que serve.** É o caminho mais rápido para ver um resultado: escolher "Apollo 11" numa
lista, em vez de procurar o ponto na Lua. Também é o jeito de escolher pelo teclado.

**O que fazer.**
1. `src/panel/SiteList.jsx`: um `<select>` com `<label>`, com os locais agrupados por agência
   (`<optgroup>`). Por que um `<select>` comum, e não uma lista desenhada: ele já funciona com
   teclado e com leitor de tela sem esforço nenhum. Uma lista mais bonita fica para depois, se
   sobrar tempo.
2. Ao escolher, chamar `onSelect(site)`, que o `App.jsx` liga no E11.
3. Quando o P1 entregar a planilha: `src/data/sites.js`, um objeto por linha, no formato
   `{ id, name, mission, agency, lat, lon, landedAtUtc, sourceUrl }`. Linha sem fonte não entra.

**Como testar.**
- `src/panel/SiteList.test.jsx`: escolher uma opção com `userEvent.selectOptions` chama o
  `onSelect` com o local certo (os locais de teste ficam no próprio arquivo de teste).
- `src/data/sites.test.js`: todo local tem `sourceUrl` começando com `https://`, `lat` entre −90 e
  90, `lon` entre −180 e 180, e nenhum `id` se repete.

**Pronto quando.** Os testes passam, dá para escolher só com o teclado (Tab até a lista, setas,
Enter), e o `verify` passa.

### I3 · Fonte do site

**Estado:** a fazer · **Depende de:** nada; combinar a escolha com o Matheus (V2)

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

**Estado:** a fazer · **Depende de:** nada

**Para que serve.** O resultado muda com a data: o mesmo ponto pode estar no Sol hoje e no escuro
daqui a uma semana. As missões trabalham em UTC, e o site também.

**O que fazer.**
1. `src/panel/DateTimeControl.jsx`: um `<input type="datetime-local">` com o rótulo "Date and
   time (UTC)" e um botão "Now". Os textos em `src/data/panel.js`.
2. **O erro mais provável deste card:** o `datetime-local` não guarda fuso, e
   `new Date(valor)` lê o valor no fuso do computador. Leia como UTC: `new Date(valor + ':00Z')`.
   Para pôr uma data no campo: `data.toISOString().slice(0, 16)`.
3. Ao mudar, chamar `onChange(dateUtc)`, que o `App.jsx` liga no E11.

**Como testar** (`src/panel/DateTimeControl.test.jsx`).
- Digitar `2026-11-14T03:00` resulta num `Date` com `getUTCHours() === 3`. A suíte roda em
  Tóquio: com `new Date(valor)`, sem o `Z`, o resultado seria 18:00 UTC do dia 13, e o teste
  falha. Esse é o erro que ele está ali para pegar (conferido em 29/10/2026).
- O botão "Now" usa a hora atual: fixe a hora no teste com `vi.setSystemTime`.

**Pronto quando.** Os testes passam, funciona só com o teclado, e o `verify` passa.

### I5 · Rodar o script do relevo do zero, seguindo só o README

**Estado:** a fazer · **Depende de:** nada

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

---

<!-- Os cards P e V vão em PDF para quem não usa o GitHub: escreva sem citar arquivo do
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
3. Conferir a licença da música que o Matheus escolher (V3) e da fonte de letra do site, que o
   Miguel escolhe.

**Entrega.** A condição de uso de cada fonte, com a frase e o link, numa planilha ou num
documento; o Enzo leva para o projeto.

**Pronto quando.** Nenhuma fonte fica "a conferir".

### P3 · Confirmação por escrito sobre começar antes de 14/11

**Estado:** a fazer · **Depende de:** nada

**Para que serve.** A FAQ do Space Apps 2026 diz que as equipes não podem começar antes do
hackathon. A equipe começou com base no que os organizadores disseram na faculdade. Com a
resposta por escrito, a equipe tem como mostrar isso se alguém perguntar. O histórico do código,
com as datas, fica público quando o projeto for aberto para os juízes.

**O que fazer.** Um e-mail para a organização do evento local perguntando se a equipe pode
preparar o projeto antes de 14/11. Guardar a resposta na pasta da equipe.

**Pronto quando.** A resposta está guardada, ou o e-mail foi enviado e ficou sem resposta até
13/11 (anotar neste card).

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

## V: Matheus

### V1 · Roteiro e storyboard do vídeo

**Estado:** a fazer · **Depende de:** nada para o roteiro; as gravações dependem de as telas do
site ficarem prontas

**Para que serve.** O vídeo mostra o projeto funcionando para quem não vai abrir o site. Ele é
montado no domingo (15/11), com pouco tempo: com o roteiro pronto antes, ninguém decide na pressa.

**O que fazer**, junto com o Mateus B.:
1. Roteiro em três partes: o problema (por que a luz e a Terra importam para pousar), o UmbraView
   funcionando (escolher um local, ver o Sol e a Terra, ver as janelas de pouso) e o resultado.
2. Storyboard: uma linha por cena, com a duração, o que aparece na tela e a legenda em inglês.
3. A lista das gravações de tela que vão ser necessárias, para quem é de dev gravar quando a tela
   estiver pronta.
4. A duração sai do guia de submissão de 13/11. Monte o roteiro em blocos que dê para cortar,
   para servir tanto a uma versão curta quanto a uma longa.

**Pronto quando.** Roteiro e storyboard na pasta compartilhada, revisados com o Enzo.

### V2 · Identidade visual da equipe e do projeto

**Estado:** a fazer · **Depende de:** nada; combinar a fonte de letra com o Miguel

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
   qualquer janela, para acertar a configuração. O site ainda não está publicado: a gravação dele
   fica para quando o Enzo publicar, ou é feita junto com alguém de dev.
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

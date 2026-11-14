# UmbraView

Site que mostra, para um ponto da Lua, quando o Sol e a Terra ficam acima do horizonte de
verdade, com o relevo medido pela NASA, e ajuda a escolher onde e quando pousar.

Projeto da **Umbra Team** para o desafio *Lunar Landing Site Navigator* do NASA Space Apps
Challenge 2026 (14 e 15/11/2026).

É um site estático: toda conta roda no navegador, sem servidor. Ele é publicado pelo GitHub
Pages quando o repositório ficar público (card E4 do [backlog](docs/backlog.md)).

**Antes de abrir o primeiro PR, leia o [CONTRIBUTING.md](CONTRIBUTING.md).** Ele tem a regra
de branch e a regra do Claude, e as duas não são opcionais.

Primeira vez no projeto? Comece por [`docs/primeiros-passos.md`](docs/primeiros-passos.md): ele
instala tudo no Windows, do zero.

---

## O que já existe

- A tela com as três regiões que o produto vai ter: cabeçalho, a cena da Lua (esquerda, maior)
  e o painel do ponto escolhido (direita).
- A Lua em 3D na região da cena (`src/scene/`), que gira com o mouse e aproxima com a roda
  (card C1). Perto do polo sul, ela mostra o relevo de verdade, na altura real, com a luz do Sol
  da data e a sombra das montanhas (card C2). De perto, onde a máquina aguenta, o relevo fino (dos
  dados de 80 m) cobre a tela, com um vértice a cada 400 m no meio dela e a cada 800 m em volta, e
  a luz dos 80 m em toda parte: as crateras pequenas aparecem (card C6). Um clique perto do polo
  escolhe um ponto e põe um marcador nele (card C3), e o painel da direita mostra o céu desse
  ponto na mesma data (cards I1 e E11): o Sol e a Terra agora, o próximo pôr do Sol, a luz no
  período e as janelas de pouso.
- No painel, a lista de locais de pouso, que também escolhe o ponto, inclusive só pelo teclado
  (card I2): o pouso do IM-2 e o centro de 7 das 9 regiões candidatas do Artemis III (card E16).
  Também no painel, a data e a hora em UTC, que começam na hora em que a página abriu (card
  I4). Os dois mudam a cena e o painel juntos (card E14).
- O motor de cálculo (`src/engine/`): o horizonte de um ponto, o Sol e a Terra hora a hora, o
  próximo pôr do Sol e as janelas de pouso, conferido contra o SPICE do JPL e o pyproj.
- A ponte entre o motor e a tela (`src/hooks/`): `useSiteSky` entrega o céu do ponto escolhido, e
  `useSubsolarPoint`, a direção do Sol. A cena usa o `useSubsolarPoint`; o `App.jsx` chama o
  `useSiteSky` e entrega o resultado ao painel.
- O relevo do polo sul até 84°S (`public/data/relief/`), recortado dos arquivos da NASA por
  `scripts/prepare-data/`, e a comparação do horizonte do motor com o da NASA (números no card
  E1).
- Os tokens de cor, espaço, tipo e movimento (`src/styles/tokens.css`), com o contraste de
  cada par de cor conferido por teste.
- As travas que impedem o Claude de fazer commit ou de assinar um (CONTRIBUTING.md, seção 4).
- O `verify`, que roda lint, testes, build e a conferência do build, e o CI, que roda o mesmo
  `verify` em todo PR.

O que falta, quem faz e como cada peça se encaixa estão no [backlog](docs/backlog.md).

---

## Como rodar

Precisa do Node 24.15 ou mais novo e do Git for Windows. O passo a passo para instalar os dois
está em [`docs/primeiros-passos.md`](docs/primeiros-passos.md).

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
npm install; if ($LASTEXITCODE -eq 0) { npm run dev }
```

- `npm install` baixa as dependências e liga o gancho de commit deste clone. No meio da saída
  tem que aparecer `ganchos: core.hooksPath = .githooks (...)`. Se aparecer `esta pasta não é
  um repositório git`, você está numa cópia sem git (um zip, por exemplo): o site roda, mas o
  gancho fica desligado. Dois avisos do npm aparecem e podem ser ignorados
  ([`docs/primeiros-passos.md`](docs/primeiros-passos.md), passo 6).
- `npm run dev` sobe o site em `http://localhost:5173`. Ele fica rodando; para parar, `Ctrl+C`.

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o site em modo de desenvolvimento, recarregando a cada arquivo salvo. |
| `npm run test` | Roda os testes uma vez. |
| `npm run lint` | Confere o código. Warning conta como erro (`--max-warnings 0`). |
| `npm run build` | Gera o site final em `dist/`. |
| `npm run verify` | Lint, testes, build e a conferência do build, nessa ordem. É o que o CI roda. |

---

## Onde procurar cada coisa

| Pergunta | Onde |
|---|---|
| Como trabalhar no repositório (branch, commit, PR, Claude) | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| O que eu faço agora | [`docs/backlog.md`](docs/backlog.md), procure o seu nome |
| Por que uma biblioteca está numa versão antiga | "Versões fixas", abaixo |
| De onde vem cada dado e cada biblioteca | [`CREDITS.md`](CREDITS.md) |
| Como o projeto declara o uso de IA (o Space Apps exige) | [`docs/uso-de-ia.md`](docs/uso-de-ia.md) |
| O que o Claude da equipe sabe sobre o projeto | [`CLAUDE.md`](CLAUDE.md) |

---

## Três regras que valem para qualquer tela

**Conteúdo não fica dentro do componente.** Título, rótulo, texto de estado vazio e nome de
botão ficam em `src/data/`, e o componente importa. O texto que a pessoa vê é em inglês, porque
o projeto é julgado em inglês; comentário e teste continuam em português. O teste
`src/noHardcodedText.test.js` reprova texto solto num `.jsx` de `src/`, dizendo o arquivo e a
linha.

**Cor, espaço e duração vêm do token.** Nunca `#e9b450`, `16px` ou `200ms` dentro do
componente: use `var(--color-accent)`, `var(--space-4)`, `var(--duration-fast)`. Os tokens moram
em `src/styles/tokens.css`. Cor nova entra lá, com o par de contraste dela no
`src/styles/tokens.test.js`.

**A tela não calcula astronomia.** Posição do Sol e da Terra, horizonte, porcentagem de luz e
janela de pouso saem do motor, em `src/engine/`, que é JavaScript puro, sem React, testado
contra os valores da NASA. A tela recebe o número pronto por um hook de `src/hooks/`. Se você
precisou fazer uma conta dessas num componente, o número está faltando no motor: fale com o
Enzo em vez de calcular ali.

## Nenhum dado inventado

Coordenada de local de pouso, data de missão, número de comparação e nome de cratera saem de
uma fonte, e a fonte fica escrita (no próprio arquivo de `src/data/` e no
[`CREDITS.md`](CREDITS.md)). Os juízes leem o site como resultado: um valor de rascunho
publicado vira afirmação falsa com o nome da equipe.

Enquanto a fonte não chega, escreva `TODO_PREENCHER` no lugar do valor. O
`scripts/check-build.mjs` roda a cada `verify` e reprova o build que tiver esse marcador,
dizendo em qual arquivo ele está.

## Acessibilidade

- O lint inclui o `eslint-plugin-jsx-a11y`: imagem sem `alt`, botão sem nome e clique em
  elemento que não recebe teclado reprovam o `verify`.
- Todo controle funciona pelo teclado e mostra o foco (`:focus-visible` com o
  `--focus-ring`, em `src/styles/global.css`).
- Movimento respeita `prefers-reduced-motion`: com a opção ligada no sistema, a cena 3D não
  anima a câmera sozinha e as transições somem. O `global.css` já desliga as transições; quem
  anima a cena confere a preferência no próprio componente.
- Sem essa opção, a Lua gira devagar sozinha só até a pessoa arrastar ou usar a roda nela, ou até
  um ponto ser escolhido, e não volta a girar (cards C5 e C10): a WCAG 2.2.2 pede um jeito de parar
  o que se move sozinho.

## Testes

Os testes moram ao lado do arquivo que testam, com o mesmo nome e `.test` antes da extensão, e
rodam com o Vitest e o Testing Library. Três coisas sobre eles:

- **A suíte roda no fuso de Tóquio, de propósito** (`vite.config.js`, `test.env`). O app mostra
  horário em UTC, que é a referência das missões. Um formatador que esquecesse o
  `timeZone: 'UTC'` passaria no CI, que roda em UTC, e erraria no computador de quem usa.
- **O bloco "Estrutura" abaixo é conferido por teste** (`src/readmeStructure.test.js`): arquivo
  novo em `src/` fora do bloco, ou arquivo do bloco que não existe mais, reprova o `verify`.
- **Os ganchos de git rodam pelo `sh`** (`scripts/hooks.test.js`). No Windows, o `sh` vem com o
  Git for Windows; se o terminal não achar o `sh`, esses casos são pulados e o motivo aparece na
  saída. No CI eles sempre rodam.

## Versões fixas

Toda versão no `package.json` é exata, sem `^`: todo mundo instala exatamente o mesmo, e
atualizar é uma decisão, não um efeito colateral do `npm install`. Atualizar uma dependência é
um PR próprio, com o `verify` passando e o OK do Enzo.

Três versões não sobem sem conferir antes, porque quebram outra peça:

| O quê | Fica em | Por quê |
|---|---|---|
| `react` e `react-dom` | 19.3 (abaixo da 19.4) | O `@react-three/fiber` 9.8.2 aceita React `>=19 <19.4`. |
| `eslint` e `@eslint/js` | 9 | O `eslint-plugin-jsx-a11y` 6.10.2, que confere acessibilidade, aceita ESLint só até o 9. |
| Node | 24.15 ou mais novo | Na linha 24, o jsdom 30, usado nos testes, exige pelo menos a 24.15. |

## Se der conflito no package-lock.json

Acontece quando duas pessoas adicionam dependência em branches paralelas. **Não resolva na
mão**: o arquivo tem milhares de linhas encadeadas, e um merge manual corrompe a árvore de
dependências de um jeito que só aparece dias depois.

**Máquina: a sua, no Git Bash, na raiz do repositório.**

```bash
git checkout --theirs package-lock.json && npm install && git add package-lock.json
```

Isso fica com a versão da `develop` e regenera o lock a partir do `package.json` já mesclado.
Depois, termine o merge como o Git pedir e rode o `npm run verify` antes do push.

## Estrutura

```
umbraview/
├── .claude/
│   ├── hooks/
│   │   └── block-git-write.sh       recusa git de escrita dentro do Claude Code
│   └── settings.json                configuração do Claude Code da equipe
│
├── .githooks/
│   └── commit-msg                   recusa commit assinado pelo Claude
│
├── .github/
│   ├── workflows/
│   │   ├── pages.yml                publica o site no GitHub Pages
│   │   └── verify.yml               o verify e a conferência de assinatura em todo PR
│   └── pull_request_template.md
│
├── brand/                           o kit do logo da equipe e do projeto, em SVG e PNG (card V2)
│   ├── favicon/                     os ícones de aba e de celular, de onde saem os de public/
│   ├── png/
│   ├── svg/
│   └── LEIA-ME.txt                  as cores, a fonte e onde usar cada versão
│
├── docs/
│   ├── backlog.md
│   ├── primeiros-passos.md
│   └── uso-de-ia.md
│
├── public/
│   ├── data/
│   │   └── relief/                  o relevo do polo sul que o site usa, gerado pelo script (card E2)
│   ├── apple-touch-icon.png         o ícone do site, copiado de brand/favicon/ (card V2)
│   ├── favicon.ico
│   └── favicon.svg
│
├── scripts/
│   ├── prepare-data/                recorta o relevo da NASA para o site e compara com a NASA (card E2)
│   │   ├── README.md                de onde baixar os arquivos e como rodar
│   │   ├── compare-nasa.mjs         o nosso Sol e a nossa Terra contra os mapas da NASA
│   │   ├── nasa-reference.json      os valores da NASA nos pontos de comparação
│   │   ├── nasa_reference.py        gera o nasa-reference.json
│   │   ├── prepare_relief.py        gera public/data/relief/
│   │   ├── requirements.txt
│   │   └── window-lengths.mjs       quanto duram as janelas de pouso, para escolher o mínimo
│   ├── references/                  referências de fora para os testes do motor e da lista de locais
│   │   ├── artemis-regions.geojson  o contorno das regiões candidatas do Artemis III, do USGS (card E16)
│   │   ├── polar_reference.py
│   │   ├── requirements.txt
│   │   └── spice_reference.py
│   ├── check-build.mjs
│   ├── check-build.test.js
│   ├── hooks.test.js
│   └── install-hooks.mjs
│
├── src/
│   ├── data/
│   │   ├── app.js                   textos da tela principal
│   │   ├── panel.js                 textos do painel do ponto (card I1)
│   │   ├── scene.js                 textos da cena 3D (cards C1 a C3)
│   │   └── sites.js                 os locais de pouso da lista, com a fonte de cada um (card I2)
│   ├── engine/                      o motor de cálculo (card E1)
│   │   ├── fixtures/
│   │   │   ├── polarReference.json  posição x/y do pyproj, para o teste da projeção
│   │   │   ├── reliefSamples.json   alturas lidas dos arquivos da NASA, para o teste do relevo do site
│   │   │   └── spiceReference.json  Sol e Terra segundo o SPICE, para o teste das posições
│   │   ├── config.js                os parâmetros do motor, com o motivo de cada um
│   │   ├── ephemeris.js             a posição do Sol e da Terra vistos da Lua, hora a hora
│   │   ├── geometry.js              coordenadas, projeção polar sul e leste/norte/cima
│   │   ├── horizon.js               o horizonte de um ponto, direção por direção
│   │   ├── relief.js                a altura do relevo num ponto: grade polar, cilíndrica ou em ladrilhos
│   │   ├── reliefFiles.js           os arquivos de relevo do site viram as camadas do horizonte
│   │   ├── series.js                Sol e Terra hora a hora, pôr do Sol e janelas de pouso
│   │   ├── siteSky.js               o céu de um ponto no período da tela, com o relevo do site
│   │   └── summary.js               o resultado no formato que a tela espera
│   ├── hooks/                       a ponte entre o motor e a tela (card E3)
│   │   ├── usePrefersReducedMotion.js  se a pessoa pediu ao sistema menos animação
│   │   ├── useFarRelief.js          o relevo grosso do polo, para a malha da cena (card C2)
│   │   ├── useNearTiles.js          os ladrilhos do relevo fino em volta da câmera (card C6)
│   │   ├── useSiteSky.js            o céu do ponto escolhido, com o status da conta
│   │   ├── useSubsolarPoint.js      onde o Sol está a pino na data, para a luz da cena
│   │   └── useTimedNotice.js        um aviso curto que some sozinho (card C3)
│   ├── panel/                       o painel do ponto: os números e a escolha do local e da data (cards I1, I2 e I4)
│   │   ├── DateTimeControl.css
│   │   ├── DateTimeControl.jsx      a data e a hora do cálculo, em UTC (card I4)
│   │   ├── SiteList.css
│   │   ├── SiteList.jsx             a lista de locais de pouso, separando pousos de regiões candidatas (card I2)
│   │   ├── SitePanel.css
│   │   ├── SitePanel.jsx            os números do ponto, um texto para cada status do useSiteSky
│   │   └── format.js                graus, porcentagem e data em UTC, em texto para o painel
│   ├── scene/                       a Lua em 3D (cards C1 a C3, C6 e C8)
│   │   ├── AreaRing.jsx             o anel em 84°S, até onde dá para escolher um ponto (card C8)
│   │   ├── LunarScene.css
│   │   ├── LunarScene.jsx           a Lua, a luz do Sol da data e a câmera que gira com o mouse
│   │   ├── NearRelief.jsx           o relevo fino de perto, só onde a máquina aguenta (card C6)
│   │   ├── ReliefCap.jsx            o relevo do polo sul na cena, com sombra (card C2)
│   │   ├── SiteMarker.jsx           o marcador do ponto escolhido (card C3)
│   │   ├── areaRing.js              os pontos do anel, na altura do relevo (card C8)
│   │   ├── coordinates.js           ponto da Lua para ponto da cena e de volta: a convenção dos eixos
│   │   ├── frameBudget.js           se a máquina aguenta o relevo fino: o tempo entre quadros (card C6)
│   │   ├── nearTiles.js             quais ladrilhos do relevo fino a cena desenha, e a malha deles (card C6)
│   │   ├── picking.js               o clique na Lua e onde fica o marcador (card C3)
│   │   ├── reliefLayers.js          quem aparece por cima entre o relevo fino e o grosso: o estêncil (card C6)
│   │   ├── reliefMesh.js            a malha do relevo, na altura real, a partir do far.bin
│   │   └── sunLight.js              onde fica a luz do Sol, e por que o alvo dela é o polo
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens.css
│   ├── App.css
│   ├── App.jsx
│   ├── main.jsx
│   └── setupTests.js
│
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .nvmrc
├── CLAUDE.md
├── CONTRIBUTING.md
├── CREDITS.md
├── eslint.config.js
├── index.html
├── LICENSE
├── package.json
├── package-lock.json
├── README.md
└── vite.config.js
```

### Organização

- `src/engine/`: o cálculo. JavaScript puro, sem React e sem DOM, para rodar igual no teste, no
  navegador e num script. Recebe coordenada e data, devolve número.
- `src/hooks/`: a ponte entre o motor e a tela. Um hook chama o motor, guarda o resultado e diz
  à tela se está calculando, se deu certo ou se falhou.
- `src/data/`: o texto da tela e os dados pequenos com fonte (a lista de locais de pouso, por
  exemplo). Um arquivo por região da tela.
- `src/styles/`: os tokens e o estilo global. O estilo de cada componente fica num `.css` ao
  lado dele.
- `src/components/`: ainda não existe. Nasce no primeiro trecho de tela que se repete em dois
  lugares, e não antes.
- `scripts/`: o que roda fora do navegador: a instalação do gancho, a conferência do build, a
  preparação dos dados do relevo e as referências dos testes do motor e da lista de locais.
- `.claude/` e `.githooks/`: as travas do Claude e do commit (CONTRIBUTING.md, seção 4).
- Dado bruto da NASA não entra no repositório (`.gitignore`, pasta `data-raw/`): o site usa só
  os recortes pequenos que `scripts/prepare-data/` gera (card E2).

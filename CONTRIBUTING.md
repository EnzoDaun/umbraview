# Como trabalhar neste repositório

Leia esta página inteira antes do primeiro commit. Ela é curta de propósito, e segue as mesmas
regras do projeto UNAERP × EPTV, para ninguém precisar aprender dois jeitos de trabalhar.

---

## 1. A regra das branches

O repositório tem duas branches permanentes:

| Branch | O que é |
|---|---|
| `main` | O que está no ar e o que vai para os juízes. Só recebe código já validado na `develop`. |
| `develop` | Onde o trabalho de todo mundo se junta e é testado. É a branch padrão do repositório. |

**Ninguém envia código direto para a `main` nem para a `develop`.** Código entra nas duas só
por Pull Request.

Todo trabalho nasce numa branch própria, a partir da `develop`, e volta para ela:

```
develop  ──►  feat/nome-da-tarefa  ──►  Pull Request para develop
```

E o caminho até a `main` é só um:

```
develop validada  ──►  Pull Request para main  ──►  Enzo mergeia
```

Seis frases que resumem tudo:

1. **Sua branch volta para a `develop`.** Nunca para a `main`.
2. **O Enzo revisa os PRs do Marco e do Miguel; o Marco revisa os do Enzo.** Não faça merge do
   próprio PR.
3. **Quem mergeia na `main` é o Enzo, e só ele.** Se você está prestes a digitar
   `git push origin main`, pare: o comando está errado.
4. **Sempre `git pull origin develop`** ao criar a branch e de novo antes do `push`. É o que
   evita conflito e mantém a sua base atualizada.
5. **Não apague branch nenhuma**, nem depois do merge. O GitHub oferece um botão
   *Delete branch* na tela do PR: não use.
6. **Um card, um PR.** O PR entrega o card inteiro, em commits atômicos, e a descrição explica
   cada um. Se o card depende de algo que ainda não existe, divida o card em dois antes de
   começar, e não o PR: um card entregue em dois PRs fica marcado como feito sem estar.

Enquanto o repositório for privado no plano gratuito do GitHub, a proteção automática de
branch não existe: tecnicamente, o `git push origin main` funciona se alguém digitar. As regras
acima são o que impede, e por isso elas estão escritas aqui. Quando o repositório ficar
público, o Enzo liga a proteção da `main` e da `develop` no GitHub (card E4 do
[backlog](docs/backlog.md)).

### Começando uma tarefa

**Máquina: a sua, no Git Bash, na raiz do repositório.**

```bash
git checkout develop && git pull origin develop && git checkout -b feat/painel-do-ponto
```

- `git checkout develop` vai para a `develop`.
- `git pull origin develop` traz o que os outros já mergearam. Tem que terminar sem `CONFLICT`.
- `git checkout -b feat/painel-do-ponto` cria a sua branch a partir dali e já entra nela. A
  saída esperada é `Switched to a new branch 'feat/painel-do-ponto'`.

Nome da branch: `feat/` para funcionalidade nova, `fix/` para correção, `docs/` para
documentação. Depois da barra, o assunto em minúsculas separado por hífen. Use o nome do card
quando ajudar: `feat/i1-painel-do-ponto`.

### Terminando uma tarefa

Rode o `npm run verify` antes (seção 3). Depois:

**Máquina: a sua, no Git Bash, na raiz do repositório.**

```bash
git add -A && git status && git commit -m "adiciona painel do ponto com os estados vazios" && git pull origin develop && git push -u origin feat/painel-do-ponto
```

- `git add -A` prepara tudo o que mudou. `git status` mostra a lista: confira que não entrou
  arquivo que não é seu nem nada da seção 5.
- `git commit -m "..."` grava o commit. O gancho `commit-msg` confere a mensagem (seção 4).
- `git pull origin develop` traz o que entrou na `develop` enquanto você trabalhava. Se ele
  apontar conflito, resolva **antes** do push: nunca empurre um merge pela metade.
- `git push -u origin feat/...` manda a sua branch para o GitHub. A saída termina com o link
  para abrir o Pull Request.

Depois abra o Pull Request pelo GitHub e **confira a branch de destino**: `develop`.

---

## 2. Mensagem de commit

Uma linha, em português, no presente do indicativo, dizendo **o que o commit faz**.
Sem prefixo e sem emoji.

A linha precisa ser específica o bastante para que ninguém tenha que abrir o diff para saber o
que mudou. Corpo só quando houver algo que a linha não cabe explicar: o porquê de uma decisão,
um efeito colateral, uma limitação conhecida.

```
adiciona painel do ponto com os estados vazios
corrige o horário do pôr do Sol quando o ponto fica na sombra o dia inteiro
move a lista de locais de pouso para src/data
```

Não serve:

```
ajustes
correções
atualiza arquivos
wip
```

**A mensagem não leva assinatura do Claude.** Nada de `Co-Authored-By: Claude`, de
`Claude-Session:` nem de `Generated with Claude Code`. O commit é de quem roda o comando
(seção 4).

Um commit por etapa. Se você mudou duas coisas sem relação, são dois commits. Ao planejar,
recorte as etapas por arquivo: duas etapas no mesmo arquivo fazem o `git add` levar as duas
para o mesmo commit.

---

## 3. Antes de abrir o PR

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
npm run verify
```

`verify` é lint, testes, build e a conferência do build, nessa ordem. A última linha da saída,
quando passa, é `OK: nenhum TODO_PREENCHER no build.` Warning de lint conta como erro, teste que
falha para tudo, e a conferência reprova se um `TODO_PREENCHER` chegar ao build. Se o comando
falhar, o PR não está pronto.

O CI roda o mesmo `verify` em todo PR, mais a conferência de assinatura do Claude. PR com o CI
vermelho não é revisado.

Preencha o modelo do PR, que o GitHub abre sozinho. Ele é escrito na primeira pessoa
("mudei", "testei"), porque quem responde pelo PR é você.

---

## 4. O Claude no projeto

A equipe inteira usa o Claude, e ele é bem-vindo para ler, explicar, planejar, escrever código
e testes e preparar comandos. **Uma coisa ele não faz: commit.** Nem commit, nem push, nem
merge, nem reset, nem rebase, nem apagar branch, nem abrir PR. Quem roda esses comandos é você,
depois de ler o que vai rodar.

Por quê:

- O histórico é da equipe. Quem faz o commit responde por ele, e um commit assinado pelo Claude
  no repositório público diz aos juízes outra coisa.
- O Space Apps pede que a submissão descreva como a IA foi usada. Essa descrição está em
  [`docs/uso-de-ia.md`](docs/uso-de-ia.md), escrita uma vez pela equipe, e não em linha de
  assinatura espalhada pelos commits.
- Commit publicado não se apaga sem reescrever a branch de todo mundo.

Quatro travas garantem isso, e cada uma cobre um buraco da outra:

| Trava | Onde age | O que faz | Limite |
|---|---|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Todo Claude que abre o repositório, inclusive na nuvem | Diz a regra e como entregar o comando | É instrução, não barreira |
| [`.claude/settings.json`](.claude/settings.json) | O Claude Code no seu computador | Desliga a assinatura, nega os comandos e roda o `block-git-write.sh` antes de todo comando de terminal | Não vale nas sessões do Claude Code na nuvem; no Windows, precisa do Git for Windows |
| [`.githooks/commit-msg`](.githooks/commit-msg) | Todo commit feito no seu clone | Recusa a mensagem com assinatura do Claude | Só existe depois do `npm install`; `--no-verify` pula |
| CI ([`.github/workflows/verify.yml`](.github/workflows/verify.yml)) | Todo PR | Reprova o PR com commit ou descrição assinados pelo Claude | Avisa depois do push; só impede o merge quando o repositório for público (card E4) |

### Se uma trava disparar

**O Claude Code respondeu `Bloqueado pela politica do repositorio`.** Está certo. Peça a ele o
comando completo, leia, e rode você mesmo no Git Bash.

**O commit voltou com `commit-msg: a mensagem contem atribuicao ao Claude`.** O commit não
aconteceu. Rode o `git commit -m "..."` de novo só com a sua linha, sem as linhas de
assinatura. Não use `--no-verify`: o CI reprova do mesmo jeito, depois do push.

**O CI reprovou com `Commits with Claude attribution`.** Um commit da sua branch tem a
assinatura. Chame o Enzo antes de mexer: limpar commit já enviado reescreve a branch, e esse
comando é dele.

---

## 5. Coisas que nunca entram num commit

**Segredo.** Token, chave, senha. O `.gitignore` já barra `.env`; o site é estático e não
precisa de nenhum.

**Dado bruto da NASA.** Os arquivos LOLA têm 189 e 219 MB, e o GitHub recusa arquivo acima de
100 MiB. Eles e os mapas de iluminação ficam na pasta `data-raw/`, que o `.gitignore` barra. O
site usa só os recortes pequenos que `scripts/prepare-data/` gera (card E2).

**Dado sem fonte.** Coordenada, data, número de comparação: com a fonte escrita, ou com
`TODO_PREENCHER` até ela chegar (README, "Nenhum dado inventado").

**Marca da NASA.** O logo redondo da NASA (o *meatball*), o logotipo e o selo só podem ser usados
com autorização dela, nem no site, nem no vídeo, nem no README. Escrever "feito para o NASA
Space Apps Challenge 2026" e "usa dados da NASA (LOLA)" pode.

**Conteúdo de terceiro sem licença.** Imagem, música, fonte e código de outra pessoa entram só
com licença que permita, e com o crédito no [`CREDITS.md`](CREDITS.md). O Space Apps exige que
toda fonte externa seja citada.

---

## 6. Uso de IA

O uso de IA no projeto está descrito uma vez, em [`docs/uso-de-ia.md`](docs/uso-de-ia.md), e é
esse texto que vai para a submissão. Não se registra cada uso. Se a IA for usada para algo que o
texto não cobre (gerar imagem, música ou vídeo, por exemplo), avise o Enzo, para o texto
continuar verdadeiro.

---

## 7. Onde perguntar

Dúvida sobre o que fazer agora: [`docs/backlog.md`](docs/backlog.md), procure o seu nome.
Dúvida sobre como rodar: o [README](README.md) e o [`docs/primeiros-passos.md`](docs/primeiros-passos.md).
Dúvida sobre por que uma biblioteca está numa versão antiga: o [README](README.md), "Versões fixas".
Dúvida que não está em nenhum deles: pergunte ao Enzo antes de decidir sozinho.
Decisão tomada no escuro custa mais caro de desfazer do que uma pergunta.

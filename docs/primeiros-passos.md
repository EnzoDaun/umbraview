# Primeiros passos no Windows

Do computador sem nada até o site rodando e o `verify` passando. Faça na ordem: cada passo
confere o anterior.

**Não vai programar (Mateus B.)?** Este guia não é para você, e você não precisa do
GitHub. As suas tarefas chegam pelo Enzo, num PDF tirado do [backlog](backlog.md), e as entregas
vão para a pasta compartilhada da equipe.

> O que já foi conferido: o `npm install` e o `npm run verify` deste repositório, no Windows
> com o Node 24.18, em 29/10/2026. Os passos de instalação do Git e do Node seguem o instalador
> de cada um e não foram refeitos do zero. Se algum passo der uma saída diferente da descrita,
> pare e mande a saída inteira para o Enzo.

## 1. Git for Windows

Baixe em [git-scm.com/downloads/win](https://git-scm.com/downloads/win) e instale com as opções
padrão. Ele traz o **Git Bash**, o terminal onde todo comando `git` deste projeto roda.

Abra o Git Bash (menu Iniciar, "Git Bash"):

**Máquina: a sua, no Git Bash, em qualquer pasta.**

```bash
git --version
```

Saída esperada: `git version 2.` seguido de mais números e `.windows.`. Sem isso, o Git não
instalou: refaça antes de seguir.

## 2. Node 24

Baixe o Node **24** (LTS) em [nodejs.org](https://nodejs.org) e instale com as opções padrão. O
Node 26 também virou LTS em 28/10/2026, e o site pode oferecer ele primeiro: o projeto usa o 24,
o mesmo do CI (não conferi como o site apresenta as duas versões hoje).

Abra o **Windows PowerShell** (menu Iniciar, "PowerShell"):

**Máquina: a sua · Shell: Windows PowerShell · em qualquer pasta.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
node --version; if ($LASTEXITCODE -eq 0) { npm --version }
```

Saída esperada: `v24.15.0` ou um `v24` mais novo, e embaixo a versão do npm. Um `v24` abaixo
de `24.15` não serve: o jsdom, usado nos testes, exige pelo menos essa.

## 3. Seu nome nos commits

**Máquina: a sua, no Git Bash, em qualquer pasta.**

```bash
git config --global user.name "Seu Nome" && git config --global user.email "o-email-da-sua-conta-do-github" && git config --global --get user.name && git config --global --get user.email
```

Troque o nome e o e-mail antes de colar. Os dois últimos comandos mostram o que ficou gravado: a
saída são duas linhas, o seu nome e o seu e-mail.

## 4. Convite do GitHub

O Enzo convida você para o repositório. O convite chega no e-mail da sua conta do GitHub:
aceite antes do próximo passo, senão o `git clone` responde `Repository not found`.

## 5. Baixar o repositório

**Máquina: a sua, no Git Bash, em qualquer pasta.**

```bash
mkdir -p ~/Documents/GitHub && cd ~/Documents/GitHub && git clone https://github.com/EnzoDaun/umbraview.git && cd umbraview && git status
```

- `mkdir -p` cria a pasta `Documents\GitHub` se ela não existir; `cd` entra nela.
- `git clone` baixa o repositório. Na primeira vez, o Git abre o navegador para você entrar na
  sua conta do GitHub: entre e volte ao terminal.
- `git status` tem que dizer `On branch develop` e `nothing to commit, working tree clean`.

## 6. Instalar e conferir

**Máquina: a sua · Shell: Windows PowerShell · em qualquer pasta.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
Set-Location $HOME\Documents\GitHub\umbraview; if ($?) { npm install; if ($LASTEXITCODE -eq 0) { npm run verify } }
```

- `Set-Location` entra na pasta do repositório. Se ela não existir, para aí.
- `npm install` baixa as dependências. No meio da saída tem que aparecer
  `ganchos: core.hooksPath = .githooks (o commit-msg recusa coautoria do Claude)`, e o fim
  traz `found 0 vulnerabilities`.
- `npm run verify` roda lint, testes, build e a conferência. A última linha tem que ser
  `OK: nenhum TODO_PREENCHER no build.`

Dois avisos do npm aparecem no `npm install` e podem ser ignorados (os números de versão podem
ser outros na sua máquina):

```
npm warn deprecated eslint@9.39.5: This version is no longer supported. Please see https://eslint.org/version-support for other options.
npm notice New major version of npm available! 11.16.0 -> 12.2.1
```

O `verify` passa com os dois (conferido no Windows em 29/10/2026). Não atualize nada por causa
deles: o ESLint fica no 9 de propósito (README, "Versões fixas"), e atualizar o npm deixa o seu
computador diferente do da equipe e do CI. Para atualizar qualquer coisa, fale com o Enzo antes.

Se o `verify` reprovar num computador recém-instalado, o problema não é seu: mande a saída
inteira para o Enzo.

## 7. Ver o site

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
npm run dev
```

Abra `http://localhost:5173` no navegador. O comando fica rodando e recarrega a página a cada
arquivo salvo; para parar, `Ctrl+C` no PowerShell.

## 8. O Claude neste projeto

Antes de usar, leia a seção 4 do [CONTRIBUTING.md](../CONTRIBUTING.md): o Claude não faz commit.

- **Claude Code**, aberto na pasta do repositório: ele lê o `CLAUDE.md` e o
  `.claude/settings.json` sozinho. O gancho que bloqueia o git roda pelo Git Bash, por isso o
  passo 1 é obrigatório também para isso. Para conferir: peça a ele para fazer um commit; ele tem
  que recusar.
- **Chat do claude.ai**: ele não lê o repositório sozinho. Crie um projeto no claude.ai e
  adicione como conhecimento o `CLAUDE.md`, o `README.md`, o `CONTRIBUTING.md` e o
  `docs/backlog.md`. Quando um deles mudar no repositório, troque o arquivo no projeto.

## 9. Pegar o primeiro card

Procure o seu nome no [backlog](backlog.md) e siga "Começando uma tarefa" no
[CONTRIBUTING.md](../CONTRIBUTING.md).

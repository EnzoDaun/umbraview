# First steps on Windows

From a computer with nothing installed to the site running and `verify` passing. Do it in order:
each step checks the previous one.

**Not going to code (Mateus B.)?** This guide is not for you, and you do not need GitHub. Your
tasks come from Enzo, in a PDF taken from the [backlog](backlog.md), and your deliverables go to
the team's shared folder.

> What has been verified: `npm install` and `npm run verify` for this repository, on Windows
> with Node 24.18, on 29/10/2026. The Git and Node installation steps follow each one's installer
> and were not redone from scratch. If any step gives output different from what is described,
> stop and send the full output to Enzo.

## 1. Git for Windows

Download it from [git-scm.com/downloads/win](https://git-scm.com/downloads/win) and install it with
the default options. It includes **Git Bash**, the terminal where every `git` command in this
project runs.

Open Git Bash (Start menu, "Git Bash"):

**Machine: yours, in Git Bash, in any folder.**

```bash
git --version
```

Expected output: `git version 2.` followed by more numbers and `.windows.`. Without that, Git did
not install: redo it before moving on.

## 2. Node 24

Download Node **24** (LTS) from [nodejs.org](https://nodejs.org) and install it with the default
options. Node 26 also became LTS on 28/10/2026, and the site may offer it first: the project uses
24, the same as CI (not verified how the site presents the two versions today).

Open **Windows PowerShell** (Start menu, "PowerShell"):

**Machine: yours · Shell: Windows PowerShell · in any folder.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
node --version; if ($LASTEXITCODE -eq 0) { npm --version }
```

Expected output: `v24.15.0` or a newer `v24`, and below it the npm version. A `v24` below `24.15`
will not do: jsdom, used in the tests, requires at least that one.

## 3. Your name on commits

**Machine: yours, in Git Bash, in any folder.**

```bash
git config --global user.name "Seu Nome" && git config --global user.email "o-email-da-sua-conta-do-github" && git config --global --get user.name && git config --global --get user.email
```

Replace the name and the e-mail before pasting. The last two commands show what was saved: the
output is two lines, your name and your e-mail.

## 4. GitHub invitation

Enzo invites you to the repository. The invitation arrives at your GitHub account's e-mail: accept
it before the next step, otherwise `git clone` answers `Repository not found`.

## 5. Download the repository

**Machine: yours, in Git Bash, in any folder.**

```bash
mkdir -p ~/Documents/GitHub && cd ~/Documents/GitHub && git clone https://github.com/EnzoDaun/umbraview.git && cd umbraview && git status
```

- `mkdir -p` creates the `Documents\GitHub` folder if it does not exist; `cd` enters it.
- `git clone` downloads the repository. The first time, Git opens the browser for you to sign in
  to your GitHub account: sign in and come back to the terminal.
- `git status` must say `On branch develop` and `nothing to commit, working tree clean`.

## 6. Install and check

**Machine: yours · Shell: Windows PowerShell · in any folder.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
Set-Location $HOME\Documents\GitHub\umbraview; if ($?) { npm install; if ($LASTEXITCODE -eq 0) { npm run verify } }
```

- `Set-Location` enters the repository folder. If it does not exist, it stops there.
- `npm install` downloads the dependencies. In the middle of the output this must appear:
  `ganchos: core.hooksPath = .githooks (o commit-msg recusa coautoria do Claude)`, and the end
  shows `found 0 vulnerabilities`.
- `npm run verify` runs lint, tests, build and the check. The last line must be
  `OK: nenhum TODO_PREENCHER no build.`

Two npm warnings show up during `npm install` and can be ignored (the version numbers may be
different on your machine):

```
npm warn deprecated eslint@9.39.5: This version is no longer supported. Please see https://eslint.org/version-support for other options.
npm notice New major version of npm available! 11.16.0 -> 12.2.1
```

`verify` passes with both (verified on Windows on 29/10/2026). Do not update anything because of
them: ESLint stays on 9 on purpose (README, "Pinned versions"), and updating npm makes your
computer different from the team's and from CI. To update anything, talk to Enzo first.

If `verify` fails on a freshly set-up computer, the problem is not yours: send the full output to
Enzo.

## 7. See the site

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
npm run dev
```

Open `http://localhost:5173` in the browser. The command keeps running and reloads the page every
time a file is saved; to stop it, `Ctrl+C` in PowerShell.

## 8. Claude in this project

Before using it, read section 4 of [CONTRIBUTING.md](../CONTRIBUTING.md): Claude does not commit.

- **Claude Code**, opened in the repository folder: it reads `CLAUDE.md` and
  `.claude/settings.json` on its own. The hook that blocks git runs through Git Bash, so step 1
  is required for this too. To check: ask it to make a commit; it must refuse.
- **claude.ai chat**: it does not read the repository on its own. Create a project on claude.ai
  and add `CLAUDE.md`, `README.md`, `CONTRIBUTING.md` and `docs/backlog.md` as knowledge. When
  one of them changes in the repository, replace the file in the project.

## 9. Take your first card

Look for your name in the [backlog](backlog.md) and follow "Starting a task" in
[CONTRIBUTING.md](../CONTRIBUTING.md).

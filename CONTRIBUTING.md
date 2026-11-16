# How to work in this repository

Read this whole page before your first commit. It is short on purpose.

---

## 1. The branch rule

The repository has two permanent branches:

| Branch | What it is |
|---|---|
| `main` | What is live and what goes to the judges. It only receives code already validated on `develop`. |
| `develop` | Where everyone's work comes together and gets tested. It is the repository's default branch. |

**Nobody pushes code directly to `main` or to `develop`.** Code gets into either of them only
through a Pull Request.

All work starts on its own branch, created from `develop`, and goes back to it:

```
develop  ──►  feat/nome-da-tarefa  ──►  Pull Request para develop
```

And there is only one path to `main`:

```
develop validada  ──►  Pull Request para main  ──►  Enzo mergeia
```

Six sentences that sum it all up:

1. **Your branch goes back to `develop`.** Never to `main`.
2. **Enzo reviews the PRs from Marco, Miguel and Rechierli; Marco reviews Enzo's.** Do not
   merge your own PR.
3. **The one who merges into `main` is Enzo, and only him.** If you are about to type
   `git push origin main`, stop: the command is wrong.
4. **Always `git pull origin develop`** when creating the branch and again before the `push`. That
   is what avoids conflicts and keeps your base up to date.
5. **Do not delete any branch**, not even after the merge. GitHub offers a *Delete branch*
   button on the PR screen: do not use it.
6. **One card, one PR.** The PR delivers the whole card, in atomic commits, and the description
   explains each one. If the card depends on something that does not exist yet, split the card in
   two, not the PR: before starting, or as soon as you notice the dependency, and always before
   opening the PR. A card delivered in two PRs gets marked as done without being done.

`main` and `develop` are protected on GitHub. For anyone who is not a repository administrator,
they only change through a PR with one approval and with both CI checks green, and GitHub
rejects direct pushes, force pushes and deleting the branch. The rules above still apply,
because the protection does not check your PR's target branch nor who merges into `main`.

### Starting a task

**Machine: yours, in Git Bash, at the repository root.**

```bash
git checkout develop && git pull origin develop && git checkout -b feat/painel-do-ponto
```

- `git checkout develop` switches to `develop`.
- `git pull origin develop` brings in what the others have already merged. It must finish
  without `CONFLICT`.
- `git checkout -b feat/painel-do-ponto` creates your branch from there and switches to it. The
  expected output is `Switched to a new branch 'feat/painel-do-ponto'`.

Branch name: `feat/` for a new feature, `fix/` for a fix, `docs/` for documentation. After the
slash, the subject in lowercase separated by hyphens. Use the card name when it helps:
`feat/i1-painel-do-ponto`.

### Finishing a task

Run `npm run verify` first (section 3). Then:

**Machine: yours, in Git Bash, at the repository root.**

```bash
git add -A && git status && git commit -m "adiciona painel do ponto com os estados vazios" && git pull origin develop && git push -u origin feat/painel-do-ponto
```

- `git add -A` stages everything that changed. `git status` shows the list: check that no file
  that is not yours got in, nor anything from section 5.
- `git commit -m "..."` records the commit. The `commit-msg` hook checks the message (section 4).
- `git pull origin develop` brings in what reached `develop` while you were working. If it
  reports a conflict, resolve it **before** the push: never push a half-done merge.
- `git push -u origin feat/...` sends your branch to GitHub. The output ends with the link to
  open the Pull Request.

Then open the Pull Request on GitHub and **check the target branch**: `develop`.

---

## 2. Commit message

One line, in Portuguese, in the present tense (indicative), saying **what the commit does**.
No prefix and no emoji.

The line must be specific enough that nobody has to open the diff to know what changed. Add a
body only when there is something the line has no room to explain: the reason for a decision, a
side effect, a known limitation.

```
adiciona painel do ponto com os estados vazios
corrige o horário do pôr do Sol quando o ponto fica na sombra o dia inteiro
move a lista de locais de pouso para src/data
```

Not acceptable:

```
ajustes
correções
atualiza arquivos
wip
```

**The message does not carry Claude's signature.** No `Co-Authored-By: Claude`, no
`Claude-Session:` and no `Generated with Claude Code`. The commit belongs to whoever runs the
command (section 4).

One commit per step. If you changed two unrelated things, that is two commits. When planning,
split the steps by file: two steps in the same file make `git add` take both into the same
commit.

---

## 3. Before opening the PR

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
npm run verify
```

`verify` is lint, tests, build and the build check, in that order. The last line of the output,
when it passes, is `OK: nenhum TODO_PREENCHER no build.` A lint warning counts as an error, a
failing test stops everything, and the check fails if a `TODO_PREENCHER` reaches the build. If the
command fails, the PR is not ready.

CI runs the same `verify` on every PR, plus the Claude signature check. A PR with red CI is not
reviewed.

Fill in the PR template, which GitHub opens automatically. It is written in the first person
("I changed", "I tested"), because you are the one accountable for the PR.

---

## 4. Claude in the project

The whole team uses Claude, and it is welcome to read, explain, plan, write code and tests, and
prepare commands. **One thing it does not do: commit.** No commit, no push, no merge, no reset,
no rebase, no deleting branches, no opening PRs. You are the one who runs these commands, after
reading what you are about to run.

Why:

- The history belongs to the team. Whoever makes the commit is accountable for it, and a commit
  signed by Claude in the public repository tells the judges something else.
- Space Apps asks that the submission describe how AI was used. That description is in
  [`docs/uso-de-ia.md`](docs/uso-de-ia.md), written once by the team, and not in signature lines
  scattered across the commits.
- A published commit cannot be deleted without rewriting everyone's branch.

Four safeguards ensure this, and each one covers a gap in another:

| Safeguard | Where it acts | What it does | Limit |
|---|---|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Every Claude that opens the repository, including in the cloud | States the rule and how to hand over the command | It is an instruction, not a barrier |
| [`.claude/settings.json`](.claude/settings.json) | Claude Code on your computer | Turns off the signature, denies the commands and runs `block-git-write.sh` before every terminal command | Does not apply to Claude Code sessions in the cloud; on Windows, it needs Git for Windows |
| [`.githooks/commit-msg`](.githooks/commit-msg) | Every commit made in your clone | Rejects a message with Claude's signature | Only exists after `npm install`; `--no-verify` skips it |
| CI ([`.github/workflows/verify.yml`](.github/workflows/verify.yml)) | Every PR | Fails the PR if a commit or the description is signed by Claude | Warns after the push; with the protection on `main` and `develop`, the failed PR does not get in |

### If a safeguard fires

**Claude Code answered `Bloqueado pela politica do repositorio`.** That is correct. Ask it for
the complete command, read it, and run it yourself in Git Bash.

**The commit came back with `commit-msg: a mensagem contem atribuicao ao Claude`.** The commit
did not happen. Run `git commit -m "..."` again with only your line, without the signature
lines. Do not use `--no-verify`: CI fails it just the same, after the push.

**CI failed with `Commits with Claude attribution`.** A commit on your branch has the signature.
Call Enzo before touching anything: cleaning up an already pushed commit rewrites the branch, and
that command is his.

---

## 5. Things that never go into a commit

**Secrets.** Tokens, keys, passwords. `.gitignore` already blocks `.env`; the site is static and
does not need any.

**Raw NASA data.** The LOLA files are 189 and 219 MB, and GitHub rejects files above 100 MiB.
They and the illumination maps stay in the `data-raw/` folder, which `.gitignore` blocks. The
site uses only the small cutouts that `scripts/prepare-data/` generates (card E2).

**Data without a source.** Coordinates, dates, comparison numbers: with the source written down,
or with `TODO_PREENCHER` until it arrives (README, "No made-up data").

**NASA branding.** The round NASA logo (the *meatball*), the logotype and the seal may only be
used with NASA's authorization, not on the site, not in the video, not in the README. Writing
"made for the NASA Space Apps Challenge 2026" and "uses NASA data (LOLA)" is fine.

**Third-party content without a license.** Someone else's images, music, fonts and code only get
in with a license that allows it, and with the credit in [`CREDITS.md`](CREDITS.md). Space Apps
requires every external source to be cited.

---

## 6. Use of AI

The use of AI in the project is described once, in [`docs/uso-de-ia.md`](docs/uso-de-ia.md), and
that text is what goes into the submission. Each individual use is not logged. If AI is used for
something the text does not cover (generating images, music or video, for example), tell Enzo,
so the text stays true.

---

## 7. Where to ask

Question about what to do now: [`docs/backlog.md`](docs/backlog.md), look for your name.
Question about how to run it: the [README](README.md) and [`docs/primeiros-passos.md`](docs/primeiros-passos.md).
Question about why a library is on an old version: the [README](README.md), "Pinned versions".
Question that is not in any of them: ask Enzo before deciding on your own.
A decision made in the dark costs more to undo than a question.

# Instructions for Claude in this repository

UmbraView: a static site (React + Vite) that shows when the Sun and the Earth are above the real
horizon of a point on the Moon. Umbra Team, NASA Space Apps Challenge 2026.
The person talking to you is someone on the team; part of the team is just starting to program.

## A rule with no exceptions: you do not commit

- Never run `git commit`, `git push`, `git merge`, `git reset`, `git rebase`, `git cherry-pick`,
  `git revert`, `git tag`, `git branch -d`/`-D`, `gh pr create` or `gh pr merge`, in any form
  (not through `sh -c`, a script, an alias or `git -C`).
- When the time comes, hand the complete command to the person to run in their own Git Bash.
- No commit message or PR description you write carries `Co-Authored-By`,
  `Claude-Session` or `Generated with Claude Code`. This instruction overrides Claude Code's
  default signature.
- If a command is refused with `Bloqueado pela politica do repositorio`, do not look for another
  way: hand the command to the person.

The reason and the other safeguards are in `CONTRIBUTING.md`, section 4.

## Before touching a file

1. Read `README.md`, `CONTRIBUTING.md` and `docs/backlog.md`. They own the rules and the state
   of the project; do not decide by your own habit.
2. Read the whole file before proposing a change to it.
3. Propose the plan and wait for the person's "go ahead": what changes, in which files, how to
   prove it worked and what is left out. Within the approved plan, go all the way without asking
   again; outside it, stop and ask.
4. Anything outside the person's card becomes a suggestion for a new card in `docs/backlog.md`,
   not a detour.
5. A new dependency only with Enzo's OK: it changes everyone's `package-lock.json`.

## How to write code here

- Names of files, variables, functions and components in English. Documentation (Markdown docs,
  README, CONTRIBUTING, CREDITS, backlog, PR template) in English. Code comments and test names
  (`describe`/`it`) stay in Portuguese.
- Follow the style of the existing files: no semicolons, single quotes, 2 spaces.
- Text that appears on screen lives in `src/data/`, in English. Color, spacing and duration come
  from the tokens in `src/styles/tokens.css`. Astronomy math lives in `src/engine/`, never in the
  component. (README, "Three rules for every screen".)
- A comment says why, and what breaks without it, not what the line does.
- Where there is logic, test first: write the test, run it and check that it fails for the right
  reason, then write the minimum to make it pass. If all the tests failed or all passed, the
  test proved nothing.
- Before saying you are done, run `npm run verify` and show the end of the output. Empty output
  is not approval.

## Data

Never make up a coordinate, date, crater name or comparison number. Without a source, write
`TODO_PREENCHER` in its place and tell the person which source is missing. With a source, record
the source in the file and in `CREDITS.md`. A claim about the world that you did not verify is
marked "não conferi" ("not verified" in English documentation).

## How to hand a command to the person to run

- Windows. Git in **Git Bash**; npm and everything else in **Windows PowerShell**.
- Every block starts by saying where it runs, with this label:
  `**Máquina: a sua, no Git Bash, na raiz do repositório.**` or
  `**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**`
- The complete command, in final execution order, that can be pasted all at once. In Git Bash,
  chain with `&&`. PowerShell has no `&&`: use `; if ($LASTEXITCODE -eq 0) { ... }`.
  Never a bare `;`, which runs the next command even after an error.
- After the block, explain what each command does and what output the person should see. Ask for
  the output back and read it before moving on.
- A command that shows a secret does not print it on screen.

## Conversation

- Answer in Brazilian Portuguese, in simple words. Explain the why, including for the
  alternative you discarded: the team is learning together.
- If the person is wrong, say so, with the reason and the alternative.

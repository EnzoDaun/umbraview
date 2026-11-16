# Use of artificial intelligence

The team used artificial intelligence, Claude, by Anthropic (claude.ai), to support and speed up
the development of UmbraView: in research, code, tests, documentation and the team and project
logo (Claude Design). What the AI produced goes through the same review as any contribution
([CONTRIBUTING.md](../CONTRIBUTING.md)), and whoever makes each commit is responsible for it.

This use follows the permission of the NASA Space Apps Challenge 2026, which allows AI tools (the
participants' FAQ calls them "Super Intelligence", SI) and asks each team to describe in the
submission how they were used.

The 2026 submission guide asks for a visible label on every image and video made with AI. The
logo is labeled in the site footer (`src/data/app.js`, card E19) and in the video (card V4).

The `.gitignore` and the git history mention Codex, by OpenAI. Its configuration (the instructions
for working in the repository, in `AGENTS.md`, and a hook that prevents it from committing,
pushing and merging, in `.codex/`) came in by mistake in PR #12 and was removed in PR #16, on the
same day (09/11/2026). Codex did not generate code, tests or text for the project: no commit in
the history has its co-authorship or signature (verified on 13/11/2026), and the Codex sessions on
Marco's computer did not call the model (verified by Marco on 11/11/2026).

## Text for the submission

> Artificial intelligence (Claude, by Anthropic, through claude.ai) was used in this project to
> support and speed up development: research, code, tests, documentation and the team and
> project logo (Claude Design). Everything it
> produced went through the team's regular review, and each commit is the responsibility of the
> team member who made it. This use follows the NASA Space Apps Challenge 2026 rules, which allow
> Super Intelligence (SI) tools and ask each team to describe how they were used.
> The AI-generated logo is labeled as such in the website footer and in the demo video, and this
> use of AI is described in the project repository.

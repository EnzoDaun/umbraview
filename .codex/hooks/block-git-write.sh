#!/bin/sh
# Gancho PreToolUse do Claude Code (.claude/settings.json): antes de o Claude rodar um comando
# de terminal, este script lê o comando e recusa git ou gh que escreve no repositório ou apaga
# branch.
#
# Por que além da lista "deny" do settings.json: a lista compara o texto do comando, e a
# própria documentação do Claude Code diz que ela deixa passar "git -C . commit",
# "/usr/bin/git commit" ou "sh -c 'git push'". Aqui a busca é pelo comando em qualquer
# posição da linha. Continua sendo leitura de texto, não uma barreira: por isso existem
# também o gancho commit-msg e a conferência do CI (CONTRIBUTING.md, seção 4).
#
# Sem jq de propósito: no Windows ele não vem com o Git Bash. O JSON chega pela entrada padrão
# e é lido como texto cru.
cmd=$(cat | sed 's/\\[nrt]/ /g' | tr -d '\\"'"'"'`')
if printf '%s\n' "$cmd" | grep -qiE '(^|[^[:alnum:]_.-])git(\.exe)?([[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|-[^[:space:]]+))*[[:space:]]+(commit|push|merge|rebase|reset|cherry-pick|revert|am|tag|commit-tree|update-ref|branch[[:space:]]+([^;&|]*[[:space:]])?(-[dD]|--delete))([^[:alnum:]_-]|$)|(^|[^[:alnum:]_.-])gh(\.exe)?[[:space:]]+pr[[:space:]]+(create|merge)([^[:alnum:]_-]|$)'; then
  echo "Bloqueado pela politica do repositorio: o Claude nao faz commit, push, merge, reset, rebase, nao apaga branch e nao abre PR. Prepare o comando completo e entregue para a pessoa rodar no Git Bash dela." >&2
  exit 2
fi
exit 0

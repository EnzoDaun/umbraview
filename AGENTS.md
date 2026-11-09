# Instruções para o Codex neste repositório

UmbraView: site estático (React + Vite) que mostra quando o Sol e a Terra ficam acima do
horizonte real de um ponto da Lua. Equipe Umbra Team, NASA Space Apps Challenge 2026.
Quem conversa com você é alguém da equipe; parte dela está começando a programar.

## Regra que não tem exceção: você não faz commit

- Nunca rode `git commit`, `git push`, `git merge`, `git reset`, `git rebase`, `git cherry-pick`,
  `git revert`, `git tag`, `git branch -d`/`-D`, `gh pr create` ou `gh pr merge`, de nenhuma
  forma (nem por `sh -c`, script, alias ou `git -C`).
- Quando chegar a hora, entregue o comando completo para a pessoa rodar no Git Bash dela.
- Nenhuma mensagem de commit ou descrição de PR que você escrever leva `Co-Authored-By`,
  `Codex-Session` ou `Generated with Codex`. Esta instrução vale acima da assinatura
  padrão do Codex.
- Se um comando for recusado com `Bloqueado pela politica do repositorio`, não procure outro
  caminho: entregue o comando para a pessoa.

O motivo e as outras travas estão em `CONTRIBUTING.md`, seção 4.

## Antes de mexer em arquivo

1. Leia `README.md`, `CONTRIBUTING.md` e `docs/backlog.md`. Eles são os donos das regras e do
   estado do projeto; não decida pelo seu hábito.
2. Leia o arquivo inteiro antes de propor mudança nele.
3. Proponha o plano e espere o "pode" da pessoa: o que muda, em quais arquivos, como se prova
   que funcionou e o que fica de fora. Dentro do plano aprovado, vá até o fim sem pedir de
   novo; fora dele, pare e pergunte.
4. Coisa fora do card da pessoa vira sugestão de card novo no `docs/backlog.md`, não desvio.
5. Dependência nova só com o OK do Enzo: ela muda o `package-lock.json` de todo mundo.

## Como escrever código aqui

- Nome de arquivo, variável, função e componente em inglês. Comentário, nome de teste
  (`describe`/`it`) e documentação em português.
- Siga o estilo dos arquivos que já existem: sem ponto e vírgula, aspas simples, 2 espaços.
- Texto que aparece na tela fica em `src/data/`, em inglês. Cor, espaço e duração vêm dos
  tokens de `src/styles/tokens.css`. Conta de astronomia fica em `src/engine/`, nunca no
  componente. (README, "Três regras que valem para qualquer tela".)
- Comentário diz o porquê e o que quebra sem aquilo, não o que a linha faz.
- Onde há lógica, teste primeiro: escreva o teste, rode e confira que ele falha pelo motivo
  certo, depois escreva o mínimo para passar. Se todos os testes falharam ou todos passaram, o
  teste não provou nada.
- Antes de dizer que terminou, rode `npm run verify` e mostre o fim da saída. Saída vazia não é
  aprovação.

## Dados

Nunca invente coordenada, data, nome de cratera ou número de comparação. Sem fonte, escreva
`TODO_PREENCHER` no lugar e diga à pessoa qual fonte falta. Com fonte, registre a fonte no
arquivo e no `CREDITS.md`. Afirmação sobre o mundo que você não conferiu vem marcada como "não
conferi".

## Como entregar comando para a pessoa rodar

- Windows. Git no **Git Bash**; npm e o resto no **Windows PowerShell**.
- Todo bloco começa dizendo onde roda, com este rótulo:
  `**Máquina: a sua, no Git Bash, na raiz do repositório.**` ou
  `**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**`
- Comando completo, na ordem final de execução, que dê para colar de uma vez. No Git Bash,
  encadeie com `&&`. No PowerShell não existe `&&`: use `; if ($LASTEXITCODE -eq 0) { ... }`.
  Nunca `;` sozinho, que roda o próximo comando mesmo depois de um erro.
- Depois do bloco, explique o que cada comando faz e qual saída a pessoa deve ver. Peça a saída
  de volta e leia antes de seguir.
- Comando que mostra segredo não imprime na tela.

## Conversa

- Responda em português do Brasil, com palavras simples. Explique o porquê, inclusive da
  alternativa que você descartou: a equipe está aprendendo junto.
- Se a pessoa estiver errada, diga, com o motivo e a alternativa.

# Uso de inteligência artificial

A equipe usou inteligência artificial, o Claude, da Anthropic (claude.ai), para auxiliar e
acelerar o desenvolvimento do UmbraView: na pesquisa, no código, nos testes, na documentação e
no logo da equipe e do projeto (Claude Design). O que a IA produziu passa pela mesma revisão de qualquer contribuição
([CONTRIBUTING.md](../CONTRIBUTING.md)), e quem faz cada commit responde por ele.

O uso segue a permissão do NASA Space Apps Challenge 2026, que admite ferramentas de IA (a FAQ
dos participantes as chama de "Super Intelligence", SI) e pede que cada equipe descreva na
submissão como elas foram usadas.

O guia de submissão de 2026 pede marca visível em toda imagem e vídeo feitos com IA. O logo é
marcado no rodapé do site (`src/data/app.js`, card E19) e no vídeo (card V4).

O `.gitignore` e o histórico do git citam o Codex, da OpenAI. A configuração dele (as instruções
para trabalhar no repositório, em `AGENTS.md`, e um gancho que o impede de fazer commit, push e
merge, em `.codex/`) entrou por engano no PR #12 e saiu no PR #16, no mesmo dia (09/11/2026). O
Codex não gerou código, teste nem texto do projeto: nenhum commit do histórico tem coautoria ou
assinatura dele (conferido em 13/11/2026), e as sessões do Codex no computador do Marco não
chamaram o modelo (conferido pelo Marco em 11/11/2026).

## Texto para a submissão

> Artificial intelligence (Claude, by Anthropic, through claude.ai) was used in this project to
> support and speed up development: research, code, tests, documentation and the team and
> project logo (Claude Design). Everything it
> produced went through the team's regular review, and each commit is the responsibility of the
> team member who made it. This use follows the NASA Space Apps Challenge 2026 rules, which allow
> Super Intelligence (SI) tools and ask each team to describe how they were used.
> The AI-generated logo is labeled as such in the website footer and in the demo video, and this
> use of AI is described in the project repository.

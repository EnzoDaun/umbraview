# Créditos e licenças

O Space Apps pede que toda fonte externa usada no projeto seja citada, com a licença dela.
Esta página é a lista. Entrou dado, imagem, fonte de letra, música ou biblioteca nova: entra
uma linha aqui, no mesmo PR. O card P2 do [backlog](docs/backlog.md) confere e completa a lista
antes da submissão.

O código do UmbraView é da Umbra Team, sob a licença MIT ([`LICENSE`](LICENSE)).

## Dados

| Dado | Para quê | Fonte | Condição de uso |
|---|---|---|---|
| Relevo do polo sul da Lua, 80 m e 240 m por pixel (LOLA, `LDEM_80S_80MPP_ADJ` e `LDEM_60S_240MPP_ADJ`) | Horizonte de cada ponto perto do polo | NASA GSFC, Barker et al. 2023, [pgda.gsfc.nasa.gov/products/90](https://pgda.gsfc.nasa.gov/products/90) | a conferir (card P2) |
| Relevo da Lua inteira (LOLA GDR) | Horizonte fora do polo | NASA PDS, [imbrium.mit.edu/DATA/LOLA_GDR](https://imbrium.mit.edu/DATA/LOLA_GDR) | a conferir (card P2) |
| Mapas de visibilidade média do Sol e da Terra, polo sul | Comparação do nosso cálculo com o da NASA | NASA GSFC, Mazarico et al. 2011, [pgda.gsfc.nasa.gov/products/69](https://pgda.gsfc.nasa.gov/products/69) | a conferir (card P2) |

Os arquivos brutos ficam fora do repositório (`.gitignore`, `data-raw/`). O que o site usa são
recortes gerados por script a partir deles (card E2).

Este material inclui dados fornecidos pela NASA. Nenhuma conclusão apresentada aqui representa
necessariamente a visão da NASA, e o projeto não é endossado por ela.

## Bibliotecas que vão para o site

Versões fixas no [`package.json`](package.json). Licença conferida no `package.json` de cada uma
em `node_modules`, em 29/10/2026.

| Biblioteca | Versão | Para quê | Licença |
|---|---|---|---|
| [React](https://github.com/react/react) e React DOM | 19.3.1 | A tela | MIT |
| [three.js](https://github.com/mrdoob/three.js) | 0.186.1 | A cena 3D | MIT |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | 9.8.2 | three.js dentro do React | MIT |
| [Drei](https://github.com/pmndrs/drei) | 10.7.9 | Peças prontas para a cena | MIT |
| [Astronomy Engine](https://github.com/cosinekitty/astronomy) | 2.1.19 | Posição do Sol e da Terra vistos da Lua | MIT |

As ferramentas de desenvolvimento (Vite, Vitest, ESLint, Testing Library, jsdom) não vão para o
site publicado; as licenças delas estão no `package-lock.json` e em `node_modules`.

## Referências dos testes do motor

Não vão para o site: servem só para conferir o motor (`src/engine/`) contra fontes de fora. Os
scripts que geram as referências estão em `scripts/references/`.

| O quê | Para quê | Fonte | Licença ou condição de uso |
|---|---|---|---|
| Bases do SPICE: `naif0012.tls`, `pck00011.tpc`, `moon_pa_de440_200625.bpc`, `moon_de440_250416.tf` e `de440s.bsp` | Posição do Sol e da Terra de referência (`spiceReference.json`) | NAIF/JPL, [naif.jpl.nasa.gov/pub/naif/generic_kernels](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/) (links conferidos em 29/10/2026) | a conferir (card P2) |
| [SpiceyPy](https://github.com/AndrewAnnex/SpiceyPy) 8.3.0 | Roda o SPICE no Python | pacote do PyPI | MIT |
| [pyproj](https://github.com/pyproj4/pyproj) 3.8.0 | Projeção polar de referência (`polarReference.json`) | pacote do PyPI | MIT |
| [NumPy](https://numpy.org) 2.5.4 | Contas do script do SPICE | pacote do PyPI | BSD-3-Clause, com partes 0BSD, MIT, Zlib e CC0-1.0 |

Licenças lidas nos metadados de cada pacote instalado, em 29/10/2026.

## Imagem, música e fonte de letra

Nenhuma ainda. O vídeo e a identidade visual entram aqui quando forem escolhidos (cards V2 e
V3).

# Créditos e licenças

O Space Apps pede que toda fonte externa usada no projeto seja citada, com a licença dela.
Esta página é a lista. Entrou dado, imagem, fonte de letra, música ou biblioteca nova: entra
uma linha aqui, no mesmo PR. O card P2 do [backlog](docs/backlog.md) confere e completa a lista
antes da submissão.

O código do UmbraView e o logo da equipe e do projeto são da Umbra Team, sob a licença MIT
([`LICENSE`](LICENSE)).

## Dados

| Dado | Para quê | Fonte | Condição de uso |
|---|---|---|---|
| Relevo do polo sul da Lua, 80 m e 240 m por pixel (LOLA, `LDEM_80S_80MPP_ADJ` e `LDEM_60S_240MPP_ADJ`) | Horizonte de cada ponto perto do polo. Os recortes de `public/data/relief/` saem destes dois arquivos; o relevo grosso, de 960 m por pixel, é a média de 4 × 4 pixels do de 240 m | NASA GSFC, Barker et al. 2023, [pgda.gsfc.nasa.gov/products/90](https://pgda.gsfc.nasa.gov/products/90) | a conferir (card P2) |
| Relevo da Lua inteira (LOLA GDR) | Horizonte fora do polo | NASA PDS, [imbrium.mit.edu/DATA/LOLA_GDR](https://imbrium.mit.edu/DATA/LOLA_GDR) | a conferir (card P2) |
| Local de pouso do IM-2 (Athena): latitude, longitude e hora do pouso | A lista de locais (`src/data/sites.js`, card I2) | Coordenada: LROC, [lroc.im-ldi.com/images/1408](https://lroc.im-ldi.com/images/1408) (página de 10/03/2025). Hora, aproximada ("approximately 11:30 a.m. CST"): NASA, [blog da missão de 06/03/2025](https://www.nasa.gov/blogs/missions/2025/03/06/intuitive-machines-mission-lands-near-south-pole-carrying-nasa-science). Dados conferidos pelo Enzo (card P1) | a conferir (card P2) |
| Contorno das 9 regiões candidatas ao pouso do Artemis III (`A3_9regions-lonlat-simplified`, copiado em `scripts/references/artemis-regions.geojson`) e os nomes delas | O centro de cada região na lista de locais (`src/data/sites.js`, card E16) | Contorno: USGS, McClernan 2024, *Down Selected Artemis III Candidate Landing Site Navigational Grids*, [doi.org/10.5066/P1MEQ6UK](https://doi.org/10.5066/P1MEQ6UK); o USGS tirou as regiões do [LROC QuickMap](https://quickmap.lroc.asu.edu/). Nomes: NASA, George et al., *Artemis III Site Selection Update: Downselection From Thirteen to Nine Candidate Regions*, [NTRS 20250011660](https://ntrs.nasa.gov/citations/20250011660) (conferido em 12/11/2026) | contorno: CC0 1.0 Universal, pela [página do data release no USGS](https://www.usgs.gov/data/down-selected-artemis-iii-candidate-landing-site-navigational-grids) (lida em 13/11/2026) |
| Mapas de visibilidade média do Sol e da Terra, polo sul (`AVGVISIB_85S_060M` e `AVGVISIB_65S_240M`) | Comparação do nosso cálculo com o da NASA (`scripts/prepare-data/nasa-reference.json`) | NASA GSFC, Mazarico et al. 2011, [pgda.gsfc.nasa.gov/products/69](https://pgda.gsfc.nasa.gov/products/69) | a conferir (card P2) |
| Cor e relevo da Lua inteira (*CGI Moon Kit*: `lroc_color_16bit_srgb_4k.tif` e `ldem_16_uint.tif`, de 1/16 de grau por pixel) | O globo da Lua na cena (`public/data/moon/`) e o relevo de fora do polo sul para o horizonte (`public/data/relief/global/`) | NASA's Scientific Visualization Studio, [svs.gsfc.nasa.gov/4720](https://svs.gsfc.nasa.gov/4720), com dados do LRO (câmera LROC e altímetro LOLA); baixado em 15/11/2026 | Domínio público, pela [página de ajuda do SVS](https://svs.gsfc.nasa.gov/help/) ("All of our content is in the public domain"); crédito pedido: *NASA's Scientific Visualization Studio* |
| Estrelas até a magnitude 6,5: direção, magnitude e índice de cor (HYG 4.4, `hyg_v44.csv.gz`; o recorte está em `public/data/stars/stars.bin`) | O céu de estrelas da cena, na posição real da data | David Nash, *HYG Stellar database*, [codeberg.org/astronexus/hyg](https://codeberg.org/astronexus/hyg) (baixado em 15/11/2026) | CC BY-SA 4.0. O `stars.bin` é um recorte do HYG e continua sob a CC BY-SA 4.0 (`public/data/stars/LICENSE.txt`); o resto do repositório é MIT |

Os arquivos brutos ficam fora do repositório (`.gitignore`, `data-raw/`). O que o site usa são
recortes gerados a partir deles por `scripts/prepare-data/` (card E2).

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

## Ferramentas e referências que não vão para o site

Rodam fora do navegador, ou só embasam uma escolha: preparam os recortes do relevo
(`scripts/prepare-data/`), conferem o motor (`src/engine/`) contra fontes de fora
(`scripts/references/`) e justificam a área do relevo (card E2).

| O quê | Para quê | Fonte | Licença ou condição de uso |
|---|---|---|---|
| Bases do SPICE: `naif0012.tls`, `pck00011.tpc`, `moon_pa_de440_200625.bpc`, `moon_de440_250416.tf` e `de440s.bsp` | Posição do Sol e da Terra de referência (`spiceReference.json`) | NAIF/JPL, [naif.jpl.nasa.gov/pub/naif/generic_kernels](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/) (links conferidos em 29/10/2026) | a conferir (card P2) |
| [SpiceyPy](https://github.com/AndrewAnnex/SpiceyPy) 8.3.0 | Roda o SPICE no Python | pacote do PyPI | MIT |
| [pyproj](https://github.com/pyproj4/pyproj) 3.8.0 | Projeção polar de referência (`polarReference.json`) | pacote do PyPI | MIT |
| [NumPy](https://numpy.org) 2.5.4 | Contas dos scripts de Python | pacote do PyPI | BSD-3-Clause, com partes 0BSD, MIT, Zlib e CC0-1.0 |
| [rasterio](https://github.com/rasterio/rasterio) 1.5.2 | Lê os arquivos da NASA nos scripts de `scripts/prepare-data/` | pacote do PyPI | BSD-3-Clause |
| Comunicado da NASA com as 13 regiões candidatas ao pouso do Artemis III (RELEASE 22-089, 19/08/2022) | Justifica a área do relevo até 84°S (card E2 e `scripts/prepare-data/prepare_relief.py`) | NASA, [NASA Identifies Candidate Regions for Landing Next Americans on Moon](https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-Moon/) (link conferido em 04/11/2026) | a conferir (card P2) |

Licenças lidas nos metadados de cada pacote instalado, em 29/10/2026.

## Imagem, música e fonte de letra

A fonte do texto do site: Fira Sans, pelo pacote
[`@fontsource/fira-sans`](https://www.npmjs.com/package/@fontsource/fira-sans) 5.3.0, licença
OFL-1.1 (conferida no npm e no `package.json` do pacote em `node_modules`, em 11/11/2026). O
vídeo entra aqui quando for escolhido (card V3).

O logo da Umbra Team e do UmbraView (`brand/`, e o ícone do site em `public/`) foi feito pela
equipe com o Claude Design, da Anthropic, em 14/11/2026, e aprovado pelo Enzo (card V2).

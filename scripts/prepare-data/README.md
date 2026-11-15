# Dados do relevo para o site

O relevo medido pela NASA (LOLA) vem em arquivos de 189 e 219 MB, grandes demais para o site e
para o GitHub. O script `prepare_relief.py` recorta só o que o site usa e grava em
`public/data/relief/`:

- `near/`: o relevo fino, 80 m por pixel, em ladrilhos de 20 × 20 km. O site baixa só os
  ladrilhos em volta do ponto escolhido (cerca de 0,5 MB por ponto).
- `far.bin`: o relevo grosso, 960 m por pixel, num arquivo só (1,3 MB), para as montanhas até
  200 km do ponto.
- `manifest.json`: onde fica cada grade e até que latitude a pessoa pode escolher um ponto.

Ele grava também `src/engine/fixtures/reliefSamples.json`, as alturas que o teste do site confere.

Na mesma pasta ficam a comparação do nosso horizonte com o da NASA (seções 5 e 6) e a medição
das janelas de pouso (seção 7).

Os recortes já estão no repositório. Rode o script só quando mudar a área, a resolução ou o
alcance do horizonte (`src/engine/config.js`), ou para conferir que ele gera os mesmos arquivos.

## Antes de começar

- Python 3.12, 3.13, 3.14 ou 3.15, instalado pelo [python.org](https://www.python.org/downloads/windows/)
  (o instalador traz o comando `py`). Os pacotes do script têm versão pronta para Windows nessas
  quatro (conferido em 29/10/2026).
- Uns 410 MB livres para os dois arquivos da NASA, fora o ambiente do Python.

Todos os comandos rodam na raiz do repositório. As pastas `data-raw/` e `.venv/` ficam fora do
git (`.gitignore`).

## 1. Baixar os dois arquivos da NASA

Fonte: Barker et al. 2023, [pgda.gsfc.nasa.gov/products/90](https://pgda.gsfc.nasa.gov/products/90)
(links conferidos em 29/10/2026).

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
New-Item -ItemType Directory -Force data-raw | Out-Null; if ($?) {
  curl.exe -fL -o data-raw\LDEM_80S_80MPP_ADJ.TIF https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF
  if ($?) {
    curl.exe -fL -o data-raw\LDEM_60S_240MPP_ADJ.TIF https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF
  }
}
```

O `curl.exe` mostra o progresso de cada download (189 e 219 MB). Não precisa conferir os arquivos
à mão: o script confere o SHA-256 de cada um antes de recortar.

Os blocos usam `if ($?)`, e não `if ($LASTEXITCODE -eq 0)`: o `$?` também fica falso quando o
comando nem existe (um `py` que não está instalado, por exemplo), e aí o `$LASTEXITCODE` ainda
guarda o resultado do comando anterior.

## 2. Instalar o Python do script

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
py -3 --version; if ($?) {
  py -3 -m venv .venv
  if ($?) { .venv\Scripts\python.exe -m pip install -r scripts\prepare-data\requirements.txt }
}
```

A primeira linha da saída é a versão: tem que ser 3.12, 3.13, 3.14 ou 3.15. A última termina em
`Successfully installed`, com `numpy-2.5.4` e `rasterio-1.5.2` na lista.

## 3. Gerar os recortes

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
.venv\Scripts\python.exe scripts\prepare-data\prepare_relief.py
```

Saída esperada:

```
OK: LDEM_80S_80MPP_ADJ.TIF confere
OK: LDEM_60S_240MPP_ADJ.TIF confere
OK: 332 ladrilhos, 334 arquivos, 43.5 MB em public/data/relief; maior arquivo far.bin, 1.29 MB
```

## 4. Conferir com o repositório

**Máquina: a sua, no Git Bash, na raiz do repositório.**

```bash
mudou=$(git status --porcelain --untracked-files=all public/data/relief src/engine/fixtures/reliefSamples.json) && { test -z "$mudou" && echo "OK: os recortes gerados são idênticos aos do repositório" || echo "$mudou"; }
```

Sem mudar nada no script, a saída é a linha `OK`. Se você mudou a área ou o alcance de propósito,
a saída lista os arquivos que mudaram: eles entram no mesmo commit da mudança. Se o próprio
`git status` falhar, a saída é o erro dele, e não a linha `OK`.

## 5. Comparar com a NASA

É a prova de que os recortes e os números de `src/engine/config.js` estão certos: o horizonte
calculado com os arquivos de `public/data/relief/` contra o Sol e a Terra que a NASA calculou
(Mazarico et al. 2011, valores em `nasa-reference.json`). Rode depois de gerar recortes novos ou
de mudar o `config.js`, e anote o resultado no card E1 do backlog.

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
node scripts/prepare-data/compare-nasa.mjs
```

Leva cerca de 1 minuto. A saída traz os 10 pontos mais iluminados do mapa da NASA, um por linha,
com a porcentagem da NASA e a nossa; depois o erro médio de cada sorteio; e termina com
`OK: comparação com a NASA feita em 382 pontos`.

Para conferir uma escolha do `config.js` sem mudar o arquivo, acrescente `--mast=0` (altura do
observador, em metros) ou `--directions=720` (direções do horizonte) ao comando. A primeira
linha da saída diz qual configuração rodou. As medições que justificam os valores atuais estão
nos comentários do `config.js`.

## 6. Refazer os pontos de comparação (só se eles mudarem)

`nasa-reference.json` já está no repositório. Ele sai de `nasa_reference.py`, que lê quatro mapas
da NASA ([pgda.gsfc.nasa.gov/products/69](https://pgda.gsfc.nasa.gov/products/69), links
conferidos em 29/10/2026) e confere o SHA-256 de cada um, como o outro script.

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
curl.exe -fL -o data-raw\AVGVISIB_85S_060M_201608.TIF https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_85S_060M_201608.TIF
if ($?) {
  curl.exe -fL -o data-raw\AVGVISIB_85S_060M_201608_EARTH.TIF https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_85S_060M_201608_EARTH.TIF
  if ($?) {
    curl.exe -fL -o data-raw\AVGVISIB_65S_240M_201608.TIF https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_65S_240M_201608.TIF
    if ($?) {
      curl.exe -fL -o data-raw\AVGVISIB_65S_240M_201608_EARTH.TIF https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_65S_240M_201608_EARTH.TIF
      if ($?) {
        .venv\Scripts\python.exe scripts\prepare-data\nasa_reference.py
      }
    }
  }
}
```

Saída esperada, na última linha:
`OK: 382 pontos em scripts/prepare-data/nasa-reference.json ({'top': 10, '85-90': 259, '84-85': 113})`.

## 7. Medir as janelas de pouso

Quanto duram as janelas de pouso (Sol e Terra à vista ao mesmo tempo) nos pontos de comparação, em
30 e em 365 dias a partir de 14/11/2026. Serve para escolher a janela mínima do painel
(`MIN_LANDING_WINDOW_HOURS`, em `src/engine/config.js`).

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
node scripts/prepare-data/window-lengths.mjs
```

Leva menos de 1 minuto. A saída traz, para cada grupo de pontos e cada período, a porcentagem de
pontos com janela de pelo menos 24, 72 e 144 h, e termina com `OK: janelas medidas em 382 pontos`.

## 8. A Lua inteira e as estrelas

O globo da Lua da cena (`public/data/moon/`), o relevo de fora do polo sul
(`public/data/relief/global/`) e o céu de estrelas (`public/data/stars/`) saem de três arquivos,
também guardados em `data-raw/`: dois do *CGI Moon Kit* da NASA (59 e 32 MB) e o catálogo de
estrelas HYG 4.4 (14 MB). As fontes e as licenças estão no [CREDITS.md](../../CREDITS.md).

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
New-Item -ItemType Directory -Force data-raw | Out-Null; if ($?) {
  curl.exe -fL -o data-raw\lroc_color_16bit_srgb_4k.tif https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_4k.tif
  if ($LASTEXITCODE -eq 0) {
    curl.exe -fL -o data-raw\ldem_16_uint.tif https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16_uint.tif
    if ($LASTEXITCODE -eq 0) {
      curl.exe -fL -o data-raw\hyg_v44.csv.gz https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz
      if ($LASTEXITCODE -eq 0) {
        .venv\Scripts\python.exe scripts\prepare-data\prepare_moon_global.py
        if ($LASTEXITCODE -eq 0) { .venv\Scripts\python.exe scripts\prepare-data\prepare_stars.py }
      }
    }
  }
}
```

Os três `curl.exe` baixam os arquivos; os dois scripts geram o que o site usa. Saída esperada, no
fim, medida em 15/11/2026:

```
OK: color.jpg, 1.45 MB
OK: normal.jpg, 0.90 MB
OK: color-south.jpg, 0.06 MB
OK: 648 ladrilhos do relevo da Lua inteira, 33.2 MB em public/data/relief/global
OK: 8920 estrelas de 119613 do catálogo (magnitude até 6.5), 40 sem B-V, 178400 bytes em public/data/stars/stars.bin
```

O endereço do HYG tem `media` no caminho, e não `raw`: o arquivo fica no Git LFS do Codeberg, e
pelo `raw` chega só um ponteiro de 133 bytes. O `prepare_stars.py` confere o arquivo e para se ele
não for o HYG 4.4 esperado.

## 9. As grades do mapa das áreas de pouso

O mapa das áreas com janela de pouso usa o horizonte, já calculado, de duas grades de pontos
(`public/data/landing-grid/`): a do polo sul, de 5 km, com o relevo fino, e a da Lua inteira, de 2°,
com o relevo de `public/data/relief/global/`. Elas só precisam ser refeitas se o relevo ou os
parâmetros do horizonte (`src/engine/config.js`) mudarem. Não usa Python: roda com o Node do projeto.

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
node scripts\prepare-data\prepare-landing-grid.mjs
```

Leva uns 15 minutos (3 da grade do polo e o resto da grade da Lua inteira) e mostra o andamento.
Saída esperada, no fim, medida em 15/11/2026:

```
OK: 4152 pontos, 1.49 MB em public/data/landing-grid/polar.bin
OK: em 14/11/2026, 1540 pontos têm janela de pouso (37.1%)
OK: o mapa e as janelas com o horizonte inteiro concordam em 166 de 167 pontos da amostra
OK: Lua inteira, 10284 pontos, 3.70 MB em public/data/landing-grid/global.bin
OK: em 14/11/2026, 5105 pontos da Lua inteira têm janela de pouso (49.6%)
```

A terceira linha é a conferência: o horizonte de cada ponto é guardado em passos de 0,2°, e um ponto
no limite pode trocar de lado por causa do arredondamento.

## 10. A imagem da Terra

A Terra da vista do sistema usa o Blue Marble da NASA
([svs.gsfc.nasa.gov/2915](https://svs.gsfc.nasa.gov/2915), domínio público, link conferido em
15/11/2026). O `prepare_earth.py` lê a imagem da Terra inteira (2048 × 1024, em latitude e longitude,
com Greenwich no meio) e grava `public/data/earth/color.jpg`. Usa o ambiente da seção 2.

**Máquina: a sua · Shell: Windows PowerShell · pasta: raiz do repositório.**

```powershell
# COLE NO WINDOWS POWERSHELL, NÃO NO GIT BASH
New-Item -ItemType Directory -Force data-raw | Out-Null; if ($?) {
  curl.exe -fL -o data-raw\bluemarble-2048.png https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png
  if ($?) { .venv\Scripts\python.exe scripts\prepare-data\prepare_earth.py }
}
```

O download tem 1,5 MB, e o script confere o SHA-256 dele. Saída esperada:

```
OK: bluemarble-2048.png confere
OK: color.jpg, 0.25 MB em public/data/earth
```

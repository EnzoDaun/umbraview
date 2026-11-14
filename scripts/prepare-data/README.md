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

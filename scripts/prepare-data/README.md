# Relief data for the site

The terrain measured by NASA (LOLA) comes in files of 189 and 219 MB, too large for the site and
for GitHub. The `prepare_relief.py` script cuts out only what the site uses and writes it to
`public/data/relief/`:

- `near/`: the fine terrain, 80 m per pixel, in tiles of 20 × 20 km. The site downloads only the
  tiles around the chosen site (about 0.5 MB per site).
- `far.bin`: the coarse terrain, 960 m per pixel, in a single file (1.3 MB), for the mountains up
  to 200 km from the site.
- `manifest.json`: where each grid is and down to which latitude a person can choose a site.

It also writes `src/engine/fixtures/reliefSamples.json`, the heights that the site's test checks.

The same folder holds the comparison of our horizon with NASA's (sections 5 and 6) and the
measurement of the landing windows (section 7).

The cutouts are already in the repository. Run the script only when you change the area, the
resolution or the horizon range (`src/engine/config.js`), or to check that it generates the same
files.

## Before you start

- Python 3.12, 3.13, 3.14 or 3.15, installed from [python.org](https://www.python.org/downloads/windows/)
  (the installer brings the `py` command). The script's packages have a ready-made Windows build
  for these four (checked on 29/10/2026).
- About 410 MB free for the two NASA files, not counting the Python environment.

All commands run at the repository root. The `data-raw/` and `.venv/` folders stay out of git
(`.gitignore`).

## 1. Download the two NASA files

Source: Barker et al. 2023, [pgda.gsfc.nasa.gov/products/90](https://pgda.gsfc.nasa.gov/products/90)
(links checked on 29/10/2026).

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
New-Item -ItemType Directory -Force data-raw | Out-Null; if ($?) {
  curl.exe -fL -o data-raw\LDEM_80S_80MPP_ADJ.TIF https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF
  if ($?) {
    curl.exe -fL -o data-raw\LDEM_60S_240MPP_ADJ.TIF https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF
  }
}
```

`curl.exe` shows the progress of each download (189 and 219 MB). You don't need to check the files
by hand: the script checks the SHA-256 of each one before cutting.

The blocks use `if ($?)`, and not `if ($LASTEXITCODE -eq 0)`: `$?` is also false when the command
doesn't even exist (a `py` that isn't installed, for example), and in that case `$LASTEXITCODE`
still holds the result of the previous command.

## 2. Install the script's Python

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
py -3 --version; if ($?) {
  py -3 -m venv .venv
  if ($?) { .venv\Scripts\python.exe -m pip install -r scripts\prepare-data\requirements.txt }
}
```

The first line of the output is the version: it must be 3.12, 3.13, 3.14 or 3.15. The last one
ends in `Successfully installed`, with `numpy-2.5.4` and `rasterio-1.5.2` in the list.

## 3. Generate the cutouts

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
.venv\Scripts\python.exe scripts\prepare-data\prepare_relief.py
```

Expected output:

```
OK: LDEM_80S_80MPP_ADJ.TIF confere
OK: LDEM_60S_240MPP_ADJ.TIF confere
OK: 332 ladrilhos, 334 arquivos, 43.5 MB em public/data/relief; maior arquivo far.bin, 1.29 MB
```

## 4. Check against the repository

**Machine: yours, in Git Bash, at the repository root.**

```bash
mudou=$(git status --porcelain --untracked-files=all public/data/relief src/engine/fixtures/reliefSamples.json) && { test -z "$mudou" && echo "OK: os recortes gerados são idênticos aos do repositório" || echo "$mudou"; }
```

Without changing anything in the script, the output is the `OK` line. If you changed the area or
the range on purpose, the output lists the files that changed: they go into the same commit as the
change. If `git status` itself fails, the output is its error, and not the `OK` line.

## 5. Compare with NASA

This is the proof that the cutouts and the numbers in `src/engine/config.js` are right: the horizon
computed with the files in `public/data/relief/` against the Sun and Earth that NASA computed
(Mazarico et al. 2011, values in `nasa-reference.json`). Run it after generating new cutouts or
changing `config.js`, and note the result in card E1 of the backlog.

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
node scripts/prepare-data/compare-nasa.mjs
```

It takes about 1 minute. The output shows the 10 most illuminated points on the NASA map, one per
line, with NASA's percentage and ours; then the mean error of each random draw; and it ends with
`OK: comparação com a NASA feita em 382 pontos`.

To check a `config.js` choice without changing the file, add `--mast=0` (observer height, in
meters) or `--directions=720` (horizon directions) to the command. The first line of the output
says which configuration ran. The measurements that justify the current values are in the comments
of `config.js`.

## 6. Redo the comparison points (only if they change)

`nasa-reference.json` is already in the repository. It comes from `nasa_reference.py`, which reads
four NASA maps ([pgda.gsfc.nasa.gov/products/69](https://pgda.gsfc.nasa.gov/products/69), links
checked on 29/10/2026) and checks the SHA-256 of each one, like the other script.

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
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

Expected output, on the last line:
`OK: 382 pontos em scripts/prepare-data/nasa-reference.json ({'top': 10, '85-90': 259, '84-85': 113})`.

## 7. Measure the landing windows

How long the landing windows (Sun and Earth in view at the same time) last at the comparison
points, over 30 and over 365 days starting on 14/11/2026. It is used to choose the panel's minimum
window (`MIN_LANDING_WINDOW_HOURS`, in `src/engine/config.js`).

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
node scripts/prepare-data/window-lengths.mjs
```

It takes less than 1 minute. For each group of points and each period, the output shows the
percentage of points with a window of at least 24, 72 and 144 h, and it ends with
`OK: janelas medidas em 382 pontos`.

## 8. The whole Moon and the stars

The scene's Moon globe (`public/data/moon/`), the terrain outside the south pole
(`public/data/relief/global/`) and the star sky (`public/data/stars/`) come from three files, also
kept in `data-raw/`: two from NASA's *CGI Moon Kit* (59 and 32 MB) and the HYG 4.4 star catalog
(14 MB). The sources and licenses are in [CREDITS.md](../../CREDITS.md).

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
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

The three `curl.exe` calls download the files; the two scripts generate what the site uses.
Expected output, at the end, measured on 15/11/2026:

```
OK: color.jpg, 1.45 MB
OK: normal.jpg, 0.90 MB
OK: color-south.jpg, 0.06 MB
OK: 648 ladrilhos do relevo da Lua inteira, 33.2 MB em public/data/relief/global
OK: 8920 estrelas de 119613 do catálogo (magnitude até 6.5), 40 sem B-V, 178400 bytes em public/data/stars/stars.bin
```

The HYG address has `media` in the path, and not `raw`: the file lives in Codeberg's Git LFS, and
through `raw` you only get a 133-byte pointer. `prepare_stars.py` checks the file and stops if it
isn't the expected HYG 4.4.

## 9. The grids for the landing area map

The map of areas with a landing window uses the precomputed horizon of two grids of points
(`public/data/landing-grid/`): the south pole one, at 5 km, with the fine terrain, and the whole
Moon one, at 2°, with the terrain from `public/data/relief/global/`. They only need to be redone if
the terrain or the horizon parameters (`src/engine/config.js`) change. It doesn't use Python: it
runs with the project's Node.

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
node scripts\prepare-data\prepare-landing-grid.mjs
```

It takes about 15 minutes (3 for the pole grid and the rest for the whole Moon grid) and shows its
progress. Expected output, at the end, measured on 15/11/2026:

```
OK: 4152 pontos, 1.49 MB em public/data/landing-grid/polar.bin
OK: em 14/11/2026, 1540 pontos têm janela de pouso (37.1%)
OK: o mapa e as janelas com o horizonte inteiro concordam em 166 de 167 pontos da amostra
OK: Lua inteira, 10284 pontos, 3.70 MB em public/data/landing-grid/global.bin
OK: em 14/11/2026, 5105 pontos da Lua inteira têm janela de pouso (49.6%)
```

The third line is the cross-check: each point's horizon is stored in steps of 0.2°, and a point on
the edge can switch sides because of rounding.

## 10. The Earth image

The Earth in the system view uses NASA's Blue Marble
([svs.gsfc.nasa.gov/2915](https://svs.gsfc.nasa.gov/2915), public domain, link checked on
15/11/2026). `prepare_earth.py` reads the image of the whole Earth (2048 × 1024, in latitude and
longitude, with Greenwich in the middle) and writes `public/data/earth/color.jpg`. It uses the
environment from section 2.

**Machine: yours · Shell: Windows PowerShell · folder: repository root.**

```powershell
# PASTE INTO WINDOWS POWERSHELL, NOT GIT BASH
New-Item -ItemType Directory -Force data-raw | Out-Null; if ($?) {
  curl.exe -fL -o data-raw\bluemarble-2048.png https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png
  if ($?) { .venv\Scripts\python.exe scripts\prepare-data\prepare_earth.py }
}
```

The download is 1.5 MB, and the script checks its SHA-256. Expected output:

```
OK: bluemarble-2048.png confere
OK: color.jpg, 0.25 MB em public/data/earth
```

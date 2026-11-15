"""Gera a imagem da Terra da vista do sistema: public/data/earth/color.jpg.

Fonte: NASA/Goddard Space Flight Center Scientific Visualization Studio, "Blue Marble - A Seamless
Image Mosaic of the Earth (WMS)", https://svs.gsfc.nasa.gov/2915 (lida em 15/11/2026). Os dados do
Blue Marble são de Reto Stockli (NASA/GSFC). A imagem é a da Terra inteira, em latitude e
longitude: a borda esquerda em 180° oeste, o meio em 0° (Greenwich), o topo no polo norte. É a
mesma disposição das imagens da Lua (prepare_moon_global.py), e a esfera do three a usa sem
conta nenhuma.

Como rodar, na raiz do repositório, com o ambiente de scripts/prepare-data/README.md:

    curl.exe -fL -o data-raw\\bluemarble-2048.png https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png
    .venv\\Scripts\\python.exe scripts\\prepare-data\\prepare_earth.py

O arquivo bruto fica em data-raw/, fora do git. O script confere o SHA-256 dele antes de gravar:
um download cortado, ou uma página de erro no lugar da imagem, viraria a Terra do site.
"""
import hashlib
import os
import sys
from pathlib import Path

# o GDAL grava um .aux.xml ao lado do JPEG se isto não estiver desligado, e ele iria para o site
os.environ["GDAL_PAM_ENABLED"] = "NO"

import rasterio  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data-raw" / "bluemarble-2048.png"
SHA256 = "ae6214b078ed0864c96f74bcb10ae3021f6eb116f8059797efe0fa9ea8b89d35"
OUTPUT = ROOT / "public" / "data" / "earth" / "color.jpg"
WIDTH = 2048
HEIGHT = 1024
JPEG_QUALITY = 85


def main():
    if not SOURCE.exists():
        sys.exit(f"ERRO: falta {SOURCE.relative_to(ROOT)}. O comando do download está no começo deste arquivo.")
    digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if digest != SHA256:
        sys.exit(f"ERRO: {SOURCE.name} não confere (SHA-256 {digest}). Baixe de novo.")
    print(f"OK: {SOURCE.name} confere")

    with rasterio.open(SOURCE) as source:
        if (source.width, source.height) != (WIDTH, HEIGHT):
            sys.exit(f"ERRO: {SOURCE.name} tem {source.width}x{source.height}, e não {WIDTH}x{HEIGHT}.")
        # só os três canais de cor: o PNG da fonte pode trazer um quarto, de transparência
        bands = source.read([1, 2, 3])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(
        OUTPUT, "w", driver="JPEG", width=WIDTH, height=HEIGHT, count=3, dtype="uint8", quality=JPEG_QUALITY
    ) as target:
        target.write(bands)
    print(f"OK: color.jpg, {OUTPUT.stat().st_size / 1e6:.2f} MB em {OUTPUT.parent.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()

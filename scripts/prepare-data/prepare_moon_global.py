"""A Lua inteira para a cena (C3): a cor e o sombreado do globo.

Fonte: NASA's Scientific Visualization Studio, "CGI Moon Kit" (SVS 4720,
https://svs.gsfc.nasa.gov/4720), feito com os dados do LRO (LROC e LOLA). Domínio público.
Crédito no CREDITS.md.

Entrada, em data-raw/svs4720/ (baixe com o comando do README desta pasta):
- lroc_color_16bit_srgb_4k.tif: a cor, 4096 x 2048, 16 bits sRGB;
- ldem_4_uint.tif: o relevo, 1440 x 720 (4 pontos por grau), em meios-metros acima de
  1.727.400 m.

Saída, em public/data/moon/:
- color.jpg: a cor em 8 bits, 4096 x 2048, qualidade 85;
- normal.png: a normal da superfície, no espaço do objeto da cena (y para o polo norte,
  longitude 0 em +x e 90 graus leste em -z, src/scene/coordinates.js), como cor (n x 0,5 + 0,5).

As duas imagens são equirretangulares centradas na longitude 0: a coluna 0 é a longitude
-180 graus e a linha 0 é o polo norte. É a mesma convenção do uv da SphereGeometry do three, e o
teste src/scene/moonSurface.test.js confere isso contra latLonToScene.

Uma normal no espaço do objeto, e não no da tangente: a esfera não precisa de tangentes, e o
relevo fino já usa o mesmo tipo de mapa (reliefLayers.js).
"""
import hashlib
import os
import sys
from pathlib import Path

import numpy as np
import rasterio
import rasterio.shutil
from rasterio.io import MemoryFile

# O GDAL gravaria um .aux.xml do lado de cada imagem, e ele iria parar no site.
os.environ['GDAL_PAM_ENABLED'] = 'NO'

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'data-raw' / 'svs4720'
OUT = ROOT / 'public' / 'data' / 'moon'

# SHA-256 dos arquivos baixados em 15/11/2026: o script recusa outro arquivo com o mesmo nome.
SHA256 = {
    'lroc_color_16bit_srgb_4k.tif': '9731fa8af425b6c2f88f277ecca82bf8c603f3743894f64ed7b25c5bfefa22ff',
    'ldem_4_uint.tif': 'e6668bec27fc9b8fbb02d198c7ddfb08eedeeb790167b494f95e6b34201da05e',
}

# O raio de referência da Lua do motor (src/engine/geometry.js, MOON_RADIUS_M).
MOON_RADIUS_M = 1737400.0

# O relevo do globo é de 7,5 km por pixel: as encostas de verdade ficam quase planas nessa escala,
# e o globo pareceria liso. O exagero é só no sombreado do globo visto de longe; o relevo do polo,
# que a cena desenha por cima, e toda conta do motor seguem na altura real.
SHADING_EXAGGERATION = 3.0


def read_checked(name):
    path = RAW / name
    if not path.exists():
        sys.exit(f'ERRO: falta {path}. Baixe com o comando do scripts/prepare-data/README.md.')
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != SHA256[name]:
        sys.exit(f'ERRO: {name} tem SHA-256 {digest}, e o esperado era {SHA256[name]}.')
    with rasterio.open(path) as src:
        return src.read()


def write_image(path, bands, driver, **options):
    count, height, width = bands.shape
    with MemoryFile() as memory:
        with memory.open(driver='GTiff', width=width, height=height, count=count, dtype='uint8') as dataset:
            dataset.write(bands)
            rasterio.shutil.copy(dataset, path, driver=driver, **options)


def color_texture():
    rgb16 = read_checked('lroc_color_16bit_srgb_4k.tif')[:3]
    assert rgb16.shape == (3, 2048, 4096), rgb16.shape
    # 16 bits para 8 sem mudar a curva sRGB: 65535 / 255 = 257
    rgb8 = np.clip(np.round(rgb16.astype(np.float64) / 257.0), 0, 255).astype(np.uint8)
    write_image(OUT / 'color.jpg', rgb8, 'JPEG', QUALITY=85)


def normal_texture():
    raw = read_checked('ldem_4_uint.tif')[0].astype(np.float64)
    height, width = raw.shape
    assert (height, width) == (720, 1440), raw.shape
    # meios-metros acima de 1.727.400 m; a derivada não depende da origem
    h = raw / 2.0 * SHADING_EXAGGERATION
    step = np.radians(360.0 / width)
    lat = np.radians(90.0 - (np.arange(height) + 0.5) * 180.0 / height)[:, None]
    lon = np.radians(-180.0 + (np.arange(width) + 0.5) * 360.0 / width)[None, :]

    # leste: a longitude cresce para a direita, e a imagem dá a volta (np.roll)
    dh_east = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) / (2 * step * MOON_RADIUS_M * np.maximum(np.cos(lat), 0.02))
    # norte: a linha 0 é o polo norte, então o norte é a linha de cima
    dh_north = np.zeros_like(h)
    dh_north[1:-1] = (h[:-2] - h[2:]) / (2 * step * MOON_RADIUS_M)

    # as direções do ponto na cena (coordinates.js): x = cos(lat)cos(lon), y = sin(lat),
    # z = -cos(lat)sin(lon)
    up = np.stack([np.cos(lat) * np.cos(lon), np.sin(lat) * np.ones_like(lon), -np.cos(lat) * np.sin(lon)])
    east = np.stack([-np.sin(lon) * np.ones_like(lat), np.zeros_like(lat * lon), -np.cos(lon) * np.ones_like(lat)])
    north = np.stack([-np.sin(lat) * np.cos(lon), np.cos(lat) * np.ones_like(lon), np.sin(lat) * np.sin(lon)])
    n = up - east * dh_east - north * dh_north
    n /= np.linalg.norm(n, axis=0)
    encoded = np.clip(np.round((n * 0.5 + 0.5) * 255.0), 0, 255).astype(np.uint8)
    write_image(OUT / 'normal.png', encoded, 'PNG', ZLEVEL=9)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    color_texture()
    normal_texture()
    for name in ('color.jpg', 'normal.png'):
        print(f'{name}: {(OUT / name).stat().st_size / 1e6:.2f} MB')
    print('OK: public/data/moon/ gerado.')


if __name__ == '__main__':
    main()

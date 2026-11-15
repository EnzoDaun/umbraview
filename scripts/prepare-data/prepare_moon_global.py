"""Prepara a Lua inteira para o site: a aparência do globo e o relevo de fora do polo.

Lê dois arquivos do "CGI Moon Kit" da NASA (SVS 4720) baixados em data-raw/ e grava:

- public/data/moon/color.jpg: a cor da superfície, na projeção de latitude e longitude (a longitude
  0° no meio da imagem, o norte em cima), para a esfera da cena.
- public/data/moon/normal.jpg: para onde cada trecho do chão está virado (mapa de normais), feito do
  relevo. É o que faz as crateras do globo clarearem de um lado e escurecerem do outro com a luz da
  data. Vermelho: inclinação para o leste; verde: para o norte; azul: para cima.
- public/data/moon/color-south.jpg: a mesma cor na projeção polar do relevo do polo sul, cobrindo
  exatamente a grade do far.bin (public/data/relief/manifest.json). A malha do relevo do polo usa
  esta, porque na projeção de latitude e longitude o polo é um ponto esticado numa linha inteira.
- public/data/relief/global/: o relevo da Lua inteira em ladrilhos de 10° x 10°, em metros acima do
  raio de 1.737.400 m (inteiro de 16 bits, little-endian, o norte em cima), com um manifest.json. O
  motor usa para o horizonte dos pontos ao norte de 84°S (src/engine/reliefFiles.js). Cada pixel
  tem 1/16 de grau, 1,9 km no equador: bem mais grosso que o relevo do polo sul.

Fonte: NASA's Scientific Visualization Studio, CGI Moon Kit (https://svs.gsfc.nasa.gov/4720), com
dados do LRO (câmera LROC e altímetro LOLA). Domínio público.

Como rodar: scripts/prepare-data/README.md.
"""
import json
import math
import shutil
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'data-raw'
COLOR_SOURCE = RAW / 'lroc_color_16bit_srgb_4k.tif'
HEIGHT_SOURCE = RAW / 'ldem_16_uint.tif'
MOON = ROOT / 'public' / 'data' / 'moon'
GLOBAL_RELIEF = ROOT / 'public' / 'data' / 'relief' / 'global'
POLAR_MANIFEST = ROOT / 'public' / 'data' / 'relief' / 'manifest.json'

MOON_RADIUS_M = 1737400
# O ldem_16_uint.tif guarda a altura em meios metros acima de um raio de 1.727.400 m (página do
# SVS 4720): em metros acima do raio de referência do motor, é valor / 2 − 10.000.
HEIGHT_SCALE_M = 0.5
HEIGHT_OFFSET_M = 1727400 - MOON_RADIUS_M
PIXELS_PER_DEGREE = 16
TILE_DEGREES = 10

JPEG_QUALITY = 85
# O mapa de normais em JPEG, e não em PNG: em PNG ele passa de 5 MB, que a página baixaria antes de
# mostrar o relevo do globo. Com esta qualidade, o erro na direção fica abaixo do que se vê de longe.
NORMAL_JPEG_QUALITY = 92
# O mapa de normais sai com metade dos pixels do relevo em cada direção (1/8 de grau): no globo
# visto de longe não se vê a diferença, e o arquivo fica com um quarto do tamanho.
NORMAL_MAP_SIZE = (2880, 1440)
# O lado, em pixels, da cor na projeção polar. A grade do far.bin tem uns 770 km de lado, e a cor de
# origem tem 2,7 km por pixel: mais que isto não traria detalhe novo.
SOUTH_COLOR_SIZE = 1024


def read_color():
    """A cor de origem em 8 bits, como linhas x colunas x 3."""
    with rasterio.open(COLOR_SOURCE) as source:
        if (source.width, source.height, source.count) != (4096, 2048, 3):
            raise SystemExit(f'ERRO: {COLOR_SOURCE.name} não tem 4096 x 2048 pixels em 3 cores.')
        color = source.read()
    # de 16 para 8 bits, arredondando: 65535 / 255 = 257
    return np.moveaxis(np.round(color / 257).astype(np.uint8), 0, -1)


def read_heights_m():
    """A altura da Lua inteira, em metros acima do raio de referência, linhas x colunas."""
    with rasterio.open(HEIGHT_SOURCE) as source:
        if (source.width, source.height) != (360 * PIXELS_PER_DEGREE, 180 * PIXELS_PER_DEGREE):
            raise SystemExit(f'ERRO: {HEIGHT_SOURCE.name} não tem {PIXELS_PER_DEGREE} pixels por grau.')
        raw = source.read(1)
    return raw.astype(np.float64) * HEIGHT_SCALE_M + HEIGHT_OFFSET_M


def write_image(path, array, driver, **options):
    """array: linhas x colunas x 3, em 8 bits."""
    profile = {'driver': driver, 'width': array.shape[1], 'height': array.shape[0], 'count': 3, 'dtype': 'uint8'}
    with rasterio.open(path, 'w', **profile, **options) as target:
        target.write(np.moveaxis(array, -1, 0))
    # o rasterio grava um .aux.xml de metadados ao lado do JPEG e do PNG, que o site não usa
    Path(str(path) + '.aux.xml').unlink(missing_ok=True)


def build_normal_map(heights_m):
    width, height = NORMAL_MAP_SIZE
    factor = heights_m.shape[1] // width
    # a média de cada bloco de pixels, e não um pixel a cada tantos: sem serrilhado nas crateras
    coarse = heights_m.reshape(height, factor, width, factor).mean(axis=(1, 3))
    degrees_per_pixel = 360 / width
    latitude = 90 - (np.arange(height) + 0.5) * degrees_per_pixel
    meters_per_pixel_north = MOON_RADIUS_M * math.radians(degrees_per_pixel)
    meters_per_pixel_east = meters_per_pixel_north * np.cos(np.radians(latitude))[:, None]
    # a diferença entre os vizinhos; no sentido leste-oeste a imagem dá a volta
    to_east = (np.roll(coarse, -1, axis=1) - np.roll(coarse, 1, axis=1)) / (2 * meters_per_pixel_east)
    to_north = np.empty_like(coarse)
    to_north[1:-1] = (coarse[:-2] - coarse[2:]) / (2 * meters_per_pixel_north)
    to_north[0] = to_north[1]
    to_north[-1] = to_north[-2]
    normal = np.stack([-to_east, -to_north, np.ones_like(coarse)], axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    return np.round((normal * 0.5 + 0.5) * 255).astype(np.uint8)


def build_south_color(color, far):
    """A cor na grade polar do far.bin: para cada pixel da saída, o pixel da cor naquela latitude e
    longitude. A projeção é a de src/engine/geometry.js (unitToPolarXY)."""
    side_m = far['columns'] * far['resolutionM']
    step = side_m / SOUTH_COLOR_SIZE
    px = far['x0'] + (np.arange(SOUTH_COLOR_SIZE) + 0.5) * step
    py = far['y0'] - (np.arange(SOUTH_COLOR_SIZE) + 0.5) * step
    px, py = np.meshgrid(px, py)
    rho2 = px * px + py * py
    k = 4 * MOON_RADIUS_M * MOON_RADIUS_M
    z = (rho2 - k) / (rho2 + k)
    f = (1 - z) / (2 * MOON_RADIUS_M)
    x, y = py * f, px * f
    latitude = np.degrees(np.arcsin(z))
    longitude = np.degrees(np.arctan2(y, x))
    rows, columns = color.shape[:2]
    row = np.clip(((90 - latitude) / 180 * rows).astype(int), 0, rows - 1)
    column = ((longitude + 180) / 360 * columns).astype(int) % columns
    return color[row, column]


def write_global_relief(heights_m):
    if GLOBAL_RELIEF.exists():
        shutil.rmtree(GLOBAL_RELIEF)
    GLOBAL_RELIEF.mkdir(parents=True)
    low, high = heights_m.min(), heights_m.max()
    if low < -32768 or high > 32767:
        raise SystemExit('ERRO: a altura não cabe em 16 bits.')
    meters = np.round(heights_m).astype('<i2')
    # o arquivo vem com a longitude 0° no meio; os ladrilhos saem de 0° a 360° leste, a convenção
    # do motor (cylindricalGridRelief, em relief.js)
    meters = np.roll(meters, -meters.shape[1] // 2, axis=1)
    tile_px = TILE_DEGREES * PIXELS_PER_DEGREE
    tile_rows, tile_columns = 180 // TILE_DEGREES, 360 // TILE_DEGREES
    total = 0
    for r in range(tile_rows):
        for c in range(tile_columns):
            tile = meters[r * tile_px:(r + 1) * tile_px, c * tile_px:(c + 1) * tile_px]
            path = GLOBAL_RELIEF / f'r{r:02d}c{c:02d}.bin'
            path.write_bytes(tile.tobytes())
            total += path.stat().st_size
    manifest = {
        'source': 'LOLA, pelo CGI Moon Kit da NASA (SVS 4720): ldem_16_uint.tif; gerado por '
                  'scripts/prepare-data/prepare_moon_global.py',
        'pixelsPerDegree': PIXELS_PER_DEGREE,
        'tileDegrees': TILE_DEGREES,
        'tilePx': tile_px,
        'tileRows': tile_rows,
        'tileColumns': tile_columns,
        'rows': meters.shape[0],
        'columns': meters.shape[1],
        'heightScale': 1,
        'minHeightM': int(meters.min()),
        'maxHeightM': int(meters.max()),
    }
    (GLOBAL_RELIEF / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return tile_rows * tile_columns, total


def main():
    MOON.mkdir(parents=True, exist_ok=True)
    color = read_color()
    write_image(MOON / 'color.jpg', color, 'JPEG', quality=JPEG_QUALITY)

    heights_m = read_heights_m()
    write_image(MOON / 'normal.jpg', build_normal_map(heights_m), 'JPEG', quality=NORMAL_JPEG_QUALITY)

    far = json.loads(POLAR_MANIFEST.read_text(encoding='utf-8'))['far']
    write_image(MOON / 'color-south.jpg', build_south_color(color, far), 'JPEG', quality=JPEG_QUALITY)

    tiles, total = write_global_relief(heights_m)
    for name in ('color.jpg', 'normal.jpg', 'color-south.jpg'):
        print(f'OK: {name}, {(MOON / name).stat().st_size / 1e6:.2f} MB')
    print(f'OK: {tiles} ladrilhos do relevo da Lua inteira, {total / 1e6:.1f} MB em '
          f'{GLOBAL_RELIEF.relative_to(ROOT)}')


if __name__ == '__main__':
    main()

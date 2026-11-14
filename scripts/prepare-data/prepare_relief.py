"""Prepara o relevo do polo sul para o site.

Lê os dois arquivos LOLA baixados em data-raw/ e grava em public/data/relief/:
- near/: o relevo fino (80 m), em ladrilhos de 20 x 20 km. O site baixa só os ladrilhos em volta
  do ponto escolhido, porque a área inteira em 80 m passa de 40 MB.
- far.bin: o relevo grosso (960 m), num arquivo só, que cobre as montanhas até 200 km de
  qualquer ponto da área.
- manifest.json: onde fica cada grade, para o site montar as camadas (src/engine/reliefFiles.js).

Grava também src/engine/fixtures/reliefSamples.json: alturas lidas direto dos arquivos da NASA
pelo rasterio, por outro caminho que não o dos ladrilhos. O teste de reliefFiles.js confere que o
site lê a mesma altura nesses pontos; um ladrilho deslocado de um pixel ou de cabeça para baixo
não passa.

Como rodar: scripts/prepare-data/README.md.
"""
import hashlib
import json
import math
import shutil
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.windows import Window

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'data-raw'
OUT = ROOT / 'public' / 'data' / 'relief'
FIXTURE = ROOT / 'src' / 'engine' / 'fixtures' / 'reliefSamples.json'

# Os arquivos de entrada, com o SHA-256 dos baixados em 29/10/2026. Um download pela metade ou um
# arquivo trocado no servidor muda o SHA-256, e o script para antes de gerar recorte errado.
NEAR_SOURCE = 'LDEM_80S_80MPP_ADJ.TIF'
FAR_SOURCE = 'LDEM_60S_240MPP_ADJ.TIF'
SHA256 = {
    NEAR_SOURCE: '82030dcbdd7c4bb0c7d858e9b4b293b9f2cda5a543ba31ec0f42784bd6beee5a',
    FAR_SOURCE: '3f9663257b63022f2b0d5a623482ff3cadddceb91594a4e4ca14a94d8cec8b34',
}

MOON_RADIUS_M = 1737400.0
# A projeção dos dois arquivos, a mesma de scripts/references/polar_reference.py. O script confere
# que os arquivos baixados estão nela antes de recortar.
POLAR = '+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs'

# A área em que a pessoa pode escolher um ponto: do polo até esta latitude. A NASA disse em
# 19/08/2022 que as 13 regiões candidatas do Artemis III ficavam "within six degrees of latitude
# of the lunar South Pole" (fonte no CREDITS.md). Das 9 que sobraram depois, o centro de 7 fica
# dentro de 84°S; Peak near Cabeus B e Nobile Rim 2 ficam fora até o card E8 (card E16).
AREA_MAX_LAT_DEG = -84.0

# Até onde cada camada precisa chegar a partir de um ponto da área. Os donos destes números são
# NEAR_LAYER_UP_TO_M e HORIZON.maxDistanceM, em src/engine/config.js; o teste de reliefFiles.js
# falha se eles crescerem sem os recortes serem gerados de novo.
NEAR_UP_TO_M = 10_000.0
FAR_UP_TO_M = 200_000.0

TILE_M = 20_000.0
MARGIN_PX = 1  # um pixel de borda repetido do vizinho: a interpolação na emenda não precisa de outro ladrilho
FAR_BLOCK = 4  # 4 x 4 pixels de 240 m viram um de 960 m
HEIGHT_SCALE = 0.5  # altura gravada em inteiros de meio metro
SAMPLE_SEED = 20261029


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def check_sources():
    for name, expected in SHA256.items():
        path = RAW / name
        if not path.exists():
            raise SystemExit(f'ERRO: falta {path}. O README desta pasta diz de onde baixar.')
        got = sha256(path)
        if got != expected:
            raise SystemExit(f'ERRO: {name} não é o arquivo esperado (SHA-256 {got}). Baixe de novo.')
        print(f'OK: {name} confere')


def polar_radius(colatitude_rad):
    """Distância ao polo, em metros, na projeção polar dos arquivos LOLA."""
    return 2 * MOON_RADIUS_M * math.tan(colatitude_rad / 2)


def reach(up_to_m):
    """Até que distância do polo, na projeção, uma camada precisa ter dado: o ponto mais longe do
    polo que um ponto da área enxerga a up_to_m de distância pelo chão."""
    return polar_radius(math.radians(90 + AREA_MAX_LAT_DEG) + up_to_m / MOON_RADIUS_M)


def to_half_meters(heights):
    doubled = np.round(heights.astype(np.float64) * 2)
    if np.isnan(doubled).any() or np.abs(doubled).max() > 32767:
        raise SystemExit('ERRO: altura sem dado ou fora da faixa do int16 no recorte')
    return doubled.astype('<i2')


def read_window(ds, x_left, y_top, columns, rows):
    col = (x_left - ds.transform.c) / ds.transform.a
    row = (ds.transform.f - y_top) / ds.transform.a
    if col != round(col) or row != round(row):
        raise SystemExit('ERRO: a janela não cai na borda de um pixel da fonte')
    col, row = int(round(col)), int(round(row))
    if col < 0 or row < 0 or col + columns > ds.width or row + rows > ds.height:
        raise SystemExit('ERRO: a janela passa da borda do arquivo da NASA')
    return ds.read(1, window=Window(col, row, columns, rows))


def write_near(ds):
    res = ds.transform.a
    tile_px = int(TILE_M / res) + 2 * MARGIN_PX
    near_reach = reach(NEAR_UP_TO_M)
    n = math.ceil(near_reach / TILE_M)
    origin_x, origin_y = -n * TILE_M, n * TILE_M
    (OUT / 'near').mkdir(parents=True)
    names = []
    for r in range(2 * n):
        for c in range(2 * n):
            left, top = origin_x + c * TILE_M, origin_y - r * TILE_M
            # ponto do ladrilho mais perto do polo: se ele está fora do alcance, o ladrilho não serve
            dx = max(left, 0.0, -(left + TILE_M))
            dy = max(top - TILE_M, 0.0, -top)
            if math.hypot(dx, dy) > near_reach:
                continue
            heights = read_window(ds, left - MARGIN_PX * res, top + MARGIN_PX * res, tile_px, tile_px)
            name = f'r{r:02d}c{c:02d}'
            (OUT / 'near' / f'{name}.bin').write_bytes(to_half_meters(heights).tobytes())
            names.append(name)
    return {
        'resolutionM': res,
        'upToM': NEAR_UP_TO_M,
        'reachM': round(near_reach, 3),
        'tileM': TILE_M,
        'tilePx': tile_px,
        'marginPx': MARGIN_PX,
        'originX': origin_x,
        'originY': origin_y,
        'tileColumns': 2 * n,
        'tileRows': 2 * n,
        'tiles': names,
    }


def write_far(ds):
    res = ds.transform.a * FAR_BLOCK
    far_reach = reach(FAR_UP_TO_M)
    half = (math.ceil(far_reach / res) + 1) * res  # mais um pixel de borda para a interpolação
    size = int(2 * half / res)
    source = read_window(ds, -half, half, size * FAR_BLOCK, size * FAR_BLOCK).astype(np.float64)
    # média dos 16 pixels somada sempre na mesma ordem, para o resultado sair igual em qualquer
    # computador e o recorte gerado de novo bater byte a byte com o do repositório
    total = np.zeros((size, size))
    for i in range(FAR_BLOCK):
        for j in range(FAR_BLOCK):
            total += source[i::FAR_BLOCK, j::FAR_BLOCK]
    (OUT / 'far.bin').write_bytes(to_half_meters(total / FAR_BLOCK**2).tobytes())
    return {
        'file': 'far.bin',
        'resolutionM': res,
        'upToM': FAR_UP_TO_M,
        'reachM': round(far_reach, 3),
        'x0': -half,
        'y0': half,
        'columns': size,
        'rows': size,
    }


def steep_pixels(heights, min_step_m):
    """Pixels em que os quatro vizinhos diferem dele mais de min_step_m: num deles, ler o pixel
    ao lado muda a altura o bastante para o teste perceber."""
    h = heights.astype(np.float64)
    center = h[1:-1, 1:-1]
    ok = np.ones(center.shape, dtype=bool)
    for neighbor in (h[:-2, 1:-1], h[2:, 1:-1], h[1:-1, :-2], h[1:-1, 2:]):
        ok &= np.abs(center - neighbor) > min_step_m
    rows, cols = np.nonzero(ok)
    return rows + 1, cols + 1


def near_samples(ds, near, rng):
    """Alturas de 80 m lidas pelo rasterio: num sorteio da área, no pixel da beira de um ladrilho e
    atravessando a emenda entre dois ladrilhos."""
    res = ds.transform.a
    area = polar_radius(math.radians(90 + AREA_MAX_LAT_DEG))
    half = math.ceil(area / res) * res
    size = int(2 * half / res)
    heights = read_window(ds, -half, half, size, size)
    rows, cols = steep_pixels(heights, 5.0)
    x = -half + (cols + 0.5) * res
    y = half - (rows + 0.5) * res
    inside = np.hypot(x, y) <= area
    x, y = x[inside], y[inside]
    # o pixel é o primeiro ou o último do miolo de um ladrilho
    offset_x = np.mod(x - near['originX'], TILE_M)
    offset_y = np.mod(near['originY'] - y, TILE_M)
    edge = (offset_x < res) | (offset_x > TILE_M - res) | (offset_y < res) | (offset_y > TILE_M - res)
    chosen = np.concatenate([rng.choice(np.nonzero(~edge)[0], 40, replace=False),
                             rng.choice(np.nonzero(edge)[0], 20, replace=False)])
    points = [(float(x[i]), float(y[i])) for i in chosen]
    values = [float(v[0]) for v in ds.sample(points)]
    out = [{'x': px, 'y': py, 'heightM': round(v, 4)} for (px, py), v in zip(points, values)]
    return out + seam_samples(ds, near, rng, area)


def seam_samples(ds, near, rng, area):
    """Pontos a 1 cm da emenda, entre o último pixel de um ladrilho e o primeiro do vizinho. Ali a
    interpolação usa a borda que o script copiou do vizinho: se a borda estiver errada, a altura
    sai da média dos dois pixels. Só emendas em que os dois pixels diferem mais de 5 m."""
    res = ds.transform.a
    weight = 0.5 + 0.01 / res  # o ponto fica 1 cm do lado do primeiro pixel
    n = near['tileColumns']
    out = []
    for vertical in (True, False):
        found = 0
        while found < 10:
            k = int(rng.integers(1, n))
            # posição ao longo da emenda, no centro de um pixel (a grade é simétrica em volta do polo)
            center = near['originX'] + (int(rng.integers(0, int(2 * n * TILE_M / res))) + 0.5) * res
            if vertical:  # emenda em x: pixel da esquerda e da direita
                seam = near['originX'] + k * TILE_M
                a, b, point = (seam - res / 2, center), (seam + res / 2, center), (seam - 0.01, center)
            else:  # emenda em y: pixel de cima e de baixo
                seam = near['originY'] - k * TILE_M
                a, b, point = (center, seam + res / 2), (center, seam - res / 2), (center, seam + 0.01)
            if math.hypot(*point) > area:
                continue
            va, vb = (float(v[0]) for v in ds.sample([a, b]))
            if abs(va - vb) <= 5.0:
                continue
            found += 1
            out.append({'x': point[0], 'y': point[1], 'heightM': round(va * weight + vb * (1 - weight), 4)})
    return out


def far_samples(far, rng):
    """Alturas de 960 m calculadas pelo GDAL (média dos pixels de 240 m), sem passar pela conta de
    write_far. far.bin só serve para escolher pontos em encosta, como em near_samples.

    OVERVIEW_LEVEL=NONE: o arquivo da NASA traz reduções prontas (de 2, 4, 8 e 16 vezes), e sem
    isto o GDAL lê a de 4 vezes, que não é a média dos 16 pixels (passa de meio metro de diferença
    em encosta)."""
    res = far['resolutionM']
    size = far['columns']
    grid = np.frombuffer((OUT / far['file']).read_bytes(), dtype='<i2').reshape(size, size) * HEIGHT_SCALE
    rows, cols = steep_pixels(grid, 5.0)
    x = far['x0'] + (cols + 0.5) * res
    y = far['y0'] - (rows + 0.5) * res
    inside = np.nonzero(np.hypot(x, y) <= far['reachM'])[0]
    out = []
    ds = rasterio.open(RAW / FAR_SOURCE, OVERVIEW_LEVEL='NONE')
    for i in rng.choice(inside, 20, replace=False):
        left, top = x[i] - res / 2, y[i] + res / 2
        col = int(round((left - ds.transform.c) / ds.transform.a))
        row = int(round((ds.transform.f - top) / ds.transform.a))
        value = ds.read(1, window=Window(col, row, FAR_BLOCK, FAR_BLOCK), out_shape=(1, 1),
                        resampling=Resampling.average)[0, 0]
        out.append({'x': float(x[i]), 'y': float(y[i]), 'heightM': round(float(value), 4)})
    ds.close()
    return out


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    # newline='\n': no Windows o padrão seria \r\n, e o arquivo sairia diferente do repositório
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')


def main():
    check_sources()
    rng = np.random.default_rng(SAMPLE_SEED)
    with rasterio.open(RAW / NEAR_SOURCE) as near_ds, rasterio.open(RAW / FAR_SOURCE) as far_ds:
        for ds in (near_ds, far_ds):
            if ds.crs != CRS.from_proj4(POLAR):
                raise SystemExit(f'ERRO: {Path(ds.name).name} não está na projeção polar esperada')
        # só depois de conferir as entradas: um erro antes daqui deixa os recortes antigos no lugar
        if OUT.exists():
            shutil.rmtree(OUT)  # sem sobra de ladrilho de uma área antiga
        OUT.mkdir(parents=True)
        near = write_near(near_ds)
        far = write_far(far_ds)
        write_json(OUT / 'manifest.json', {
            'source': 'LOLA, Barker et al. 2023 (NASA PGDA, produto 90): LDEM_80S_80MPP_ADJ e '
                      'LDEM_60S_240MPP_ADJ; gerado por scripts/prepare-data/prepare_relief.py',
            'projection': POLAR,
            'areaMaxLatDeg': AREA_MAX_LAT_DEG,
            'heightScale': HEIGHT_SCALE,
            'near': near,
            'far': far,
        })
        write_json(FIXTURE, {
            'source': 'alturas lidas pelo rasterio direto de LDEM_80S_80MPP_ADJ (near; na emenda, a '
                      'média ponderada dos dois pixels vizinhos) e de LDEM_60S_240MPP_ADJ com média do '
                      'GDAL (far); gerado por scripts/prepare-data/prepare_relief.py',
            'near': near_samples(near_ds, near, rng),
            'far': far_samples(far, rng),
        })

    files = sorted(p for p in OUT.rglob('*') if p.is_file())
    total = sum(p.stat().st_size for p in files)
    largest = max(files, key=lambda p: p.stat().st_size)
    print(f'OK: {len(near["tiles"])} ladrilhos, {len(files)} arquivos, {total / 1e6:.1f} MB em '
          f'{OUT.relative_to(ROOT).as_posix()}; maior arquivo {largest.name}, '
          f'{largest.stat().st_size / 1e6:.2f} MB')


if __name__ == '__main__':
    main()

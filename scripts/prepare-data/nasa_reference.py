"""Gera scripts/prepare-data/nasa-reference.json: o Sol e a Terra que a NASA calculou em pontos do
polo sul, para comparar com o nosso horizonte (compare-nasa.mjs).

Os valores vêm dos mapas de visibilidade média de Mazarico et al. 2011 (NASA PGDA, produto 69):
a fração do disco do Sol à vista e a fração do tempo com alguma parte da Terra à vista, em 18,6
anos hora a hora. Três grupos de pontos:
- top: os 10 pontos mais iluminados do mapa de 60 m, a pelo menos 2 km um do outro;
- 85-90: sorteio no mapa de 60 m, até 30 pontos por faixa de 10% de Sol (sem as faixas, o sorteio
  cairia quase todo no escuro, que é a maior parte do polo);
- 84-85: o mesmo no mapa de 240 m, o único que cobre essa faixa, até 15 por faixa.

O JSON gerado fica no repositório: refazer a comparação não precisa destes mapas. Este script só
roda de novo se os pontos mudarem. Como rodar: scripts/prepare-data/README.md.
"""
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window

from prepare_relief import RAW, ROOT, polar_radius, sha256, write_json

OUT = ROOT / 'scripts' / 'prepare-data' / 'nasa-reference.json'

MAPS = {
    '060m': ('AVGVISIB_85S_060M_201608.TIF', 'AVGVISIB_85S_060M_201608_EARTH.TIF'),
    '240m': ('AVGVISIB_65S_240M_201608.TIF', 'AVGVISIB_65S_240M_201608_EARTH.TIF'),
}
# SHA-256 dos mapas baixados em 22 e 23/10/2026
SHA256 = {
    'AVGVISIB_85S_060M_201608.TIF': 'ccf67d4f39e0a970c111196da7d6551ffcf50d075470b93067fb3904c0b05806',
    'AVGVISIB_85S_060M_201608_EARTH.TIF': 'd71dc5adfff653e0e924e0a4cbf03795b996caa30b4ace3d5843a70a5ab2f3d2',
    'AVGVISIB_65S_240M_201608.TIF': '822fbf4618852311d4f494012e74e9cfb0147807a54ecb3302293c4266d2068d',
    'AVGVISIB_65S_240M_201608_EARTH.TIF': '8a6d5fa8079c83e2159adf58ce33cd1cd9c09be6c19023bf5b6cc304f51568b7',
}
SEED = 20261029
TOP_COUNT = 10
TOP_SPACING_M = 2000.0


def read_map(name, half_m):
    """O mapa recortado no quadrado de ±half_m em volta do polo, com NaN onde não há valor, e o x
    e o y do centro de cada coluna e de cada linha."""
    path = RAW / name
    if not path.exists():
        raise SystemExit(f'ERRO: falta {path}. O README desta pasta diz de onde baixar.')
    if sha256(path) != SHA256[name]:
        raise SystemExit(f'ERRO: {name} não é o arquivo esperado. Baixe de novo.')
    with rasterio.open(path) as ds:
        res = ds.transform.a
        first = max(0, int((ds.transform.f - half_m) // res))
        count = min(ds.height - first, int(math.ceil(2 * half_m / res)) + 1)
        raw = ds.read(1, window=Window(first, first, count, count))
        values = np.where(raw == ds.nodata, np.nan, raw * ds.scales[0])
        centers = np.arange(count) + first + 0.5
        x = ds.transform.c + centers * res
        y = ds.transform.f - centers * res
    return values, x, y


def load(resolution, half_m):
    sun_name, earth_name = MAPS[resolution]
    sun, x, y = read_map(sun_name, half_m)
    earth, _, _ = read_map(earth_name, half_m)
    return sun, earth, x, y


def point(group, x, y, sun, earth):
    return {'group': group, 'x': float(x), 'y': float(y), 'sun': round(float(sun), 5), 'earth': round(float(earth), 5)}


def top_points(sun, earth, x, y):
    order = np.argsort(np.nan_to_num(sun, nan=-1).ravel(), kind='stable')[::-1]
    chosen = []
    for i in order:
        r, c = divmod(int(i), sun.shape[1])
        if all(math.hypot(x[c] - qx, y[r] - qy) >= TOP_SPACING_M for qx, qy in chosen):
            chosen.append((x[c], y[r]))
            yield point('top', x[c], y[r], sun[r, c], earth[r, c])
            if len(chosen) == TOP_COUNT:
                return


def stratified(group, sun, earth, x, y, inside, per_band, rng):
    out = []
    for band in range(10):
        low, high = band / 10, (band + 1) / 10
        ok = inside & (sun >= low) & ((sun < high) if band < 9 else (sun <= high)) & ~np.isnan(earth)
        candidates = np.flatnonzero(ok)
        for i in rng.choice(candidates, min(per_band, candidates.size), replace=False):
            r, c = divmod(int(i), sun.shape[1])
            out.append(point(group, x[c], y[r], sun[r, c], earth[r, c]))
    return out


def main():
    rng = np.random.default_rng(SEED)
    rho_85 = polar_radius(math.radians(5))
    rho_84 = polar_radius(math.radians(6))

    sun, earth, x, y = load('060m', rho_85)
    points = list(top_points(sun, earth, x, y))
    points += stratified('85-90', sun, earth, x, y, np.hypot(x[None, :], y[:, None]) <= rho_85, 30, rng)

    sun, earth, x, y = load('240m', rho_84)
    rho = np.hypot(x[None, :], y[:, None])
    points += stratified('84-85', sun, earth, x, y, (rho > rho_85) & (rho <= rho_84), 15, rng)

    write_json(OUT, {
        'source': 'Mazarico et al. 2011, mapas AVGVISIB_85S_060M e AVGVISIB_65S_240M (NASA PGDA, '
                  'produto 69); gerado por scripts/prepare-data/nasa_reference.py',
        'points': points,
    })
    groups = {g: sum(p['group'] == g for p in points) for g in ('top', '85-90', '84-85')}
    print(f'OK: {len(points)} pontos em {OUT.relative_to(ROOT).as_posix()} ({groups})')


if __name__ == '__main__':
    main()

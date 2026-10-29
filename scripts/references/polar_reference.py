"""Gera src/engine/fixtures/polarReference.json: pontos perto do polo sul com a posição x/y
calculada pelo pyproj, na mesma projeção dos arquivos LOLA do polo.

O teste de src/engine/geometry.js compara a fórmula do motor com esses valores. Sem uma
referência de fora, um erro de convenção (x trocado com y, sinal da longitude) passaria na ida
e volta, porque a fórmula errada desfaz o próprio erro.

Rodar da raiz do repositório:
    python -m pip install -r scripts/references/requirements.txt
    python scripts/references/polar_reference.py
"""
import json
from pathlib import Path

from pyproj import Transformer

# A projeção declarada nos arquivos LOLA do polo sul (LDEM_80S_80MPP_ADJ e AVGVISIB_85S_060M),
# lida dos próprios arquivos com o rasterio em 29/10/2026.
POLAR = '+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs'
LONLAT = '+proj=longlat +R=1737400 +no_defs'

LATITUDES = [-89.999, -89.475, -88.0, -85.0, -80.0, -70.0, -60.0]
LONGITUDES = [-137.44, 0.0, 77.0, 179.9]

OUT = Path(__file__).resolve().parents[2] / 'src' / 'engine' / 'fixtures' / 'polarReference.json'


def main():
    to_polar = Transformer.from_crs(LONLAT, POLAR, always_xy=True)
    points = []
    for lat in LATITUDES:
        for lon in LONGITUDES:
            x, y = to_polar.transform(lon, lat)
            points.append({'lat': lat, 'lon': lon, 'x': round(x, 6), 'y': round(y, 6)})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        'source': 'pyproj, projecao dos arquivos LOLA do polo sul; gerado por scripts/references/polar_reference.py',
        'projection': POLAR,
        'points': points,
    }, indent=1) + '\n', encoding='utf-8')
    print(f'{OUT}: {len(points)} pontos')


if __name__ == '__main__':
    main()

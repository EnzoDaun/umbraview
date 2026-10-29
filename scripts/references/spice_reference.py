"""Gera src/engine/fixtures/spiceReference.json: azimute e elevação do Sol e da Terra vistos de
três pontos da Lua, calculados pelo SPICE, o sistema do JPL/NASA para geometria de missões.

O teste de src/engine/ephemeris.js compara o motor com esses valores. O motor usa o
astronomy-engine, que cabe no navegador; o SPICE é a referência, e não cabe.

Antes de rodar, baixe as cinco bases do SPICE para uma pasta (links conferidos em 29/10/2026):
    https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls
    https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc
    https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc
    https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf
    https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp

Rodar da raiz do repositório, com o caminho da pasta das bases:
    python -m pip install -r scripts/references/requirements.txt
    python scripts/references/spice_reference.py caminho/da/pasta/das/bases
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
import spiceypy as sp

KERNELS = ['naif0012.tls', 'pck00011.tpc', 'moon_pa_de440_200625.bpc', 'moon_de440_250416.tf', 'de440s.bsp']

# Raio de referência dos produtos LOLA, em km: o mesmo de MOON_RADIUS_M em geometry.js.
MOON_RADIUS_KM = 1737.4

# Nome, latitude, longitude e altura do observador acima do raio de referência (km).
SITES = [
    ('Connecting Ridge', -89.475, -137.44, 1.9),
    ('Malapert', -86.0, 2.06, 4.9),
    ('Polo', -89.999, 0.0, 0.0),
]

# Um instante a cada 5 dias durante um ano, a partir de 01/11/2026: o ano inteiro de posições
# da Lua em relação ao Sol, num arquivo pequeno o bastante para ficar no repositório.
START = '2026-11-01 00:00:00 UTC'
STEP_SECONDS = 5 * 86400
COUNT = 73

OUT = Path(__file__).resolve().parents[2] / 'src' / 'engine' / 'fixtures' / 'spiceReference.json'


def main():
    kernels = Path(sys.argv[1])
    for name in KERNELS:
        sp.furnsh(str(kernels / name))

    rows = []
    et0 = sp.str2et(START)
    for name, lat, lon, alt_km in SITES:
        observer = np.array(sp.georec(math.radians(lon), math.radians(lat), alt_km, MOON_RADIUS_KM, 0.0))
        for i in range(COUNT):
            et = et0 + i * STEP_SECONDS
            row = {'site': name, 'lat': lat, 'lon': lon, 'altKm': alt_km, 'utc': sp.et2utc(et, 'ISOC', 3)}
            for body in ['SUN', 'EARTH']:
                # Azimute a partir do norte, crescendo para o leste; elevação positiva para cima;
                # correção de tempo de luz e aberração, como um observador de verdade veria.
                state, _ = sp.azlcpo('ELLIPSOID', body, et, 'CN+S', False, True, observer, 'MOON', 'MOON_ME')
                row[body] = [math.degrees(state[1]), math.degrees(state[2])]
            rows.append(row)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        'source': 'SPICE (NAIF/JPL), referencial MOON_ME; gerado por scripts/references/spice_reference.py',
        'kernels': KERNELS,
        'rows': rows,
    }) + '\n', encoding='utf-8')
    print(f'{OUT}: {len(rows)} linhas')


if __name__ == '__main__':
    main()

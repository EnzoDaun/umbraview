"""As estrelas de verdade para o céu da cena (C5).

Fonte: catálogo HYG v4.4, de David Nash (astronexus), https://codeberg.org/astronexus/hyg,
arquivo hyg/CURRENT/hyg_v44.csv.gz. Licença CC BY-SA 4.0: o arquivo gerado mantém a mesma
licença (public/data/stars/LICENSE.txt e CREDITS.md).

Entrada: data-raw/hyg/hyg_v44.csv.gz. Baixe com (Git Bash, na raiz do repositório):
  mkdir -p data-raw/hyg && curl -fL -o data-raw/hyg/hyg_v44.csv.gz \
    https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz

Saída: public/data/stars/stars.bin, Float32 little-endian, 5 números por estrela: x, y, z da
direção (tamanho 1, referencial equatorial J2000, o mesmo do astronomy-engine), a magnitude
visual e o índice de cor B-V. Sem B-V no catálogo, grava NaN, e a cena pinta a estrela de branco.

Só até a magnitude 6,5, o limite do olho humano num céu escuro: mais que isso pesaria o arquivo
sem aparecer na tela. O Sol (id 0) fica de fora: a cena já tem a luz dele.
"""
import csv
import gzip
import hashlib
import io
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'data-raw' / 'hyg' / 'hyg_v44.csv.gz'
OUT = ROOT / 'public' / 'data' / 'stars' / 'stars.bin'

# SHA-256 do arquivo baixado em 15/11/2026 (o mesmo do ponteiro do Git LFS do Codeberg)
SHA256 = '00b349893b9a53106dd488d8371e8d2fa586043e500bb3cdb8bff3931682197d'
MAX_MAGNITUDE = 6.5


def main():
    if not SOURCE.exists():
        sys.exit(f'ERRO: falta {SOURCE}. O comando de download está no começo deste script.')
    raw = SOURCE.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != SHA256:
        sys.exit(f'ERRO: o hyg_v44.csv.gz tem SHA-256 {digest}, e o esperado era {SHA256}.')

    values = []
    with gzip.open(io.BytesIO(raw), 'rt', encoding='utf8', newline='') as text:
        for row in csv.DictReader(text):
            if row['id'] == '0' or not row['mag']:
                continue
            mag = float(row['mag'])
            if mag > MAX_MAGNITUDE:
                continue
            ra = float(row['rarad'])
            dec = float(row['decrad'])
            ci = float(row['ci']) if row['ci'] else math.nan
            values += [math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec), mag, ci]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(struct.pack(f'<{len(values)}f', *values))
    print(f'stars.bin: {len(values) // 5} estrelas, {OUT.stat().st_size / 1e3:.0f} kB')


if __name__ == '__main__':
    main()

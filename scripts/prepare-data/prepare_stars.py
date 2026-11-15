"""Prepara as estrelas do céu da cena.

Lê o catálogo HYG baixado em data-raw/ e grava public/data/stars/stars.bin: as estrelas que o olho
vê num céu escuro (até a magnitude 6,5), cada uma com cinco números de 32 bits (float,
little-endian):

    x, y, z   a direção da estrela, de tamanho 1, no referencial equatorial J2000 (o mesmo do
              astronomy-engine): x aponta para o ponto vernal, z para o polo norte celeste
    mag       a magnitude aparente (quanto menor, mais brilhante)
    ci        o índice de cor B−V (azul perto de −0,3, branca perto de 0, vermelha perto de 2)

A cena gira essas direções para o referencial da Lua com o giro do motor (ephemeris.js), então a
posição das estrelas na tela é a de verdade na data escolhida.

Fonte: HYG 4.4, de David Nash (https://codeberg.org/astronexus/hyg), licença CC BY-SA 4.0. O
arquivo gerado é um recorte dele e continua sob a mesma licença (public/data/stars/LICENSE.txt).

Como rodar: scripts/prepare-data/README.md.
"""
import csv
import gzip
import hashlib
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'data-raw' / 'hyg_v44.csv.gz'
# o arquivo do HYG 4.4 de 15/11/2026: outro arquivo com o mesmo nome daria outras estrelas
SOURCE_SHA256 = '00b349893b9a53106dd488d8371e8d2fa586043e500bb3cdb8bff3931682197d'
OUT = ROOT / 'public' / 'data' / 'stars' / 'stars.bin'

# Até onde o olho vê num céu escuro, sem atmosfera para atrapalhar.
MAX_MAGNITUDE = 6.5
# Estrela sem índice de cor no catálogo entra como branco-amarelada, a cor do Sol.
DEFAULT_COLOR_INDEX = 0.65


def main():
    digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        raise SystemExit(f'ERRO: {SOURCE.name} não é o HYG 4.4 esperado (sha256 {digest}).')

    stars = []
    with gzip.open(SOURCE, 'rt', encoding='utf-8', newline='') as source:
        for row in csv.DictReader(source):
            # a linha 0 do catálogo é o Sol, que a cena já tem como luz
            if row['id'] == '0' or row['mag'] == '':
                continue
            magnitude = float(row['mag'])
            if magnitude > MAX_MAGNITUDE:
                continue
            ra = float(row['ra']) * 15 * math.pi / 180  # o catálogo dá a ascensão reta em horas
            dec = float(row['dec']) * math.pi / 180
            color_index = float(row['ci']) if row['ci'] != '' else DEFAULT_COLOR_INDEX
            stars.append((
                math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec),
                magnitude, color_index,
            ))

    # da mais brilhante para a mais fraca: quem quiser desenhar menos estrelas corta o fim do arquivo
    stars.sort(key=lambda star: star[3])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(b''.join(struct.pack('<5f', *star) for star in stars))
    print(f'OK: {len(stars)} estrelas até a magnitude {MAX_MAGNITUDE}, {OUT.stat().st_size / 1e3:.0f} kB em '
          f'{OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()

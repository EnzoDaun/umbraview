"""Prepara as estrelas reais para o céu da cena.

Lê o catálogo HYG v4.4 baixado em data-raw/ e grava public/data/stars/stars.bin: as estrelas até
a magnitude 6,5 (o limite do olho nu num céu escuro), da mais brilhante para a mais fraca. Cada
estrela são 5 números Float32 little-endian:

  x, y, z    a direção da estrela, vetor de tamanho 1 no referencial equatorial J2000
             (x = cos(dec)·cos(ra), y = cos(dec)·sin(ra), z = sin(dec): +X no equinócio vernal
             de 2000, +Y em ascensão reta 6 h, +Z no polo norte celeste)
  magnitude  a magnitude visual aparente (coluna mag)
  B−V        o índice de cor (coluna ci); NaN quando o catálogo não traz, e a cena pinta de branco

Fonte: HYG v4.4, de David Nash (astronexus), https://codeberg.org/astronexus/hyg, arquivo
data/hyg/CURRENT/hyg_v44.csv.gz, licença CC BY-SA 4.0. O arquivo gerado é obra derivada e segue
na mesma licença (public/data/stars/LICENSE.txt e CREDITS.md).

As colunas, pela documentação do catálogo (data/hyg/README.md, lida em 15/11/2026): "ra, dec: The
star's right ascension and declination, for epoch and equinox 2000.0"; "mag: The star's apparent
visual magnitude"; "ci: The star's color index (blue magnitude - visual magnitude), where known".
A documentação não diz a unidade de ra; o próprio catálogo mostra que são horas: a coluna rarad
(em radianos) é ra·π/12, e o script confere isso em Sirius antes de gravar.

Só a biblioteca padrão do Python: não precisa do .venv do prepare_relief.py.

Como rodar, na raiz do repositório (Windows PowerShell):

  curl.exe -fL -o data-raw\\hyg_v44.csv.gz https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz
  python scripts\\prepare-data\\prepare_stars.py

O endereço é o /media/, e não o /raw/: o arquivo fica no Git LFS do Codeberg, e o /raw/ devolve
só o ponteiro de 133 bytes.
"""
import csv
import gzip
import hashlib
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'data-raw'
OUT = ROOT / 'public' / 'data' / 'stars' / 'stars.bin'

# O arquivo de entrada, com o SHA-256 do baixado em 15/11/2026 (13.636.362 bytes; é o mesmo
# SHA-256 que o ponteiro do Git LFS do repositório do catálogo declara). Um download pela metade
# ou uma versão nova do catálogo muda o SHA-256, e o script para antes de gravar um céu diferente.
SOURCE = 'hyg_v44.csv.gz'
SHA256 = '00b349893b9a53106dd488d8371e8d2fa586043e500bb3cdb8bff3931682197d'

# Magnitude 6,5: o limite que o contrato da cena pede (C5). Acima disso são mais de 100 mil
# estrelas que o olho não vê, e o arquivo passaria de 2 MB.
MAX_MAGNITUDE = 6.5

COLUMNS = ('id', 'proper', 'ra', 'dec', 'mag', 'ci', 'rarad')
STAR = struct.Struct('<5f')  # x, y, z, magnitude, B−V


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def check_source():
    path = RAW / SOURCE
    if not path.exists():
        raise SystemExit(f'ERRO: falta {path}. O começo deste script diz de onde baixar.')
    got = sha256(path)
    if got != SHA256:
        raise SystemExit(f'ERRO: {SOURCE} não é o arquivo esperado (SHA-256 {got}). Baixe de novo.')
    print(f'OK: {SOURCE} confere')
    return path


def read_catalog(path):
    # newline='': é o que o módulo csv pede para ler campo entre aspas com quebra de linha
    with gzip.open(path, 'rt', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        missing = [c for c in COLUMNS if c not in reader.fieldnames]
        if missing:
            raise SystemExit(f'ERRO: o catálogo não tem a coluna {", ".join(missing)}')
        return list(reader)


def without_sun(rows):
    """O catálogo começa pelo Sol (id 0, magnitude -26,7, na direção ra = dec = 0, que não é onde
    o Sol está). Na cena o Sol vem do motor, na posição da data; esta linha poria um segundo Sol
    fixo no céu."""
    first = rows[0]
    if first['id'] != '0' or first['proper'] != 'Sol':
        raise SystemExit('ERRO: a primeira linha do catálogo não é o Sol; confira o arquivo antes de tirar a linha')
    return rows[1:]


def check_units(rows):
    """Prova, em Sirius, que ra está em horas: a coluna rarad do catálogo é a mesma ascensão reta
    em radianos. Se ra estivesse em graus, todas as estrelas sairiam no lugar errado sem aviso."""
    sirius = next((r for r in rows if r['proper'] == 'Sirius'), None)
    if sirius is None:
        raise SystemExit('ERRO: o catálogo não tem a linha de Sirius')
    if abs(math.radians(float(sirius['ra']) * 15) - float(sirius['rarad'])) > 1e-6:
        raise SystemExit('ERRO: ra de Sirius não bate com rarad; a unidade de ra não é hora')
    print('OK: ra em horas (ra de Sirius bate com rarad)')


def direction(ra_hours, dec_deg):
    ra = math.radians(ra_hours * 15)  # 24 h de ascensão reta = 360°
    dec = math.radians(dec_deg)
    return math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)


def visible_stars(rows):
    stars = []
    for row in rows:
        if row['mag'] == '':  # sem magnitude não dá para saber se a estrela passa no filtro
            continue
        magnitude = float(row['mag'])
        if magnitude > MAX_MAGNITUDE:
            continue
        # sem B−V no catálogo fica NaN: inventar uma cor seria dado sem fonte
        color_index = float(row['ci']) if row['ci'] != '' else math.nan
        stars.append((magnitude, int(row['id']), direction(float(row['ra']), float(row['dec'])), color_index))
    # empate de magnitude desfeito pelo id do catálogo: o arquivo gerado de novo sai igual, byte a byte
    stars.sort(key=lambda s: (s[0], s[1]))
    return stars


def main():
    rows = without_sun(read_catalog(check_source()))
    check_units(rows)
    stars = visible_stars(rows)
    data = b''.join(STAR.pack(*xyz, magnitude, color_index) for magnitude, _, xyz, color_index in stars)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(data)
    no_color = sum(1 for s in stars if math.isnan(s[3]))
    # "B-V" com hífen comum: o console do Windows (cp1252) não tem o sinal de menos tipográfico
    print(f'OK: {len(stars)} estrelas de {len(rows)} do catálogo (magnitude até {MAX_MAGNITUDE}), '
          f'{no_color} sem B-V, {len(data)} bytes em {OUT.relative_to(ROOT).as_posix()}')


if __name__ == '__main__':
    main()

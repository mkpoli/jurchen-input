# /// script
# requires-python = ">=3.11"
# ///
"""Build app/data/jurchen.json.gz from the pinned sources under data/.

Radical, strokes, source, reading and numeric value come from Unicode's JurchenSources.txt; stroke
codes, with the variant sequences they name, come from Alari's Rime table; references to the older
encodings come from data/encodings/characters.tsv; character origins come from
data/etymology/origins.tsv. A sequence the table lists and the font does not draw stops the build.
"""
import csv
import gzip
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UCD = ROOT / 'data/unicode/JurchenSources-18.0.0.txt'
TABLE = ROOT / 'data/alari/Alari_jurc.dict.yaml'
ENCODINGS = ROOT / 'data/encodings/characters.tsv'
ORIGINS = ROOT / 'data/etymology/origins.tsv'
OUT = ROOT / 'app/data/jurchen.json.gz'
CHARS = range(0x18E00, 0x19192)
RADICALS = range(0x191A0, 0x191D3)
SELECTORS = range(0xFE00, 0xFE05)


def records():
    found = {}
    for line in UCD.read_text(encoding='utf-8').splitlines():
        if not line.startswith('U+'):
            continue
        code, tag, value = line.split('\t')
        found.setdefault(int(code[2:], 16), {})[tag] = value
    return found


def table():
    """The table's rows as (sequence, code). Its placeholder row for U+25A1 is dropped, and the one
    code that carries a stray variation selector (U+18FF3 U+FE01) is read as its letters."""
    body = TABLE.read_text(encoding='utf-8').replace('\r', '').split('...\n', 1)[1]
    rows = []
    for line in body.splitlines():
        if not line.strip():
            continue
        text, code = line.split('\t')
        points = [ord(c) for c in text]
        if points[0] not in CHARS and points[0] not in RADICALS:
            assert text == '□', text
            continue
        assert len(points) == 1 or (len(points) == 2 and points[1] in SELECTORS), text
        letters = re.sub(r'[^a-z]', '', code)
        assert re.fullmatch(r'[hspdz]+b?', letters), line
        rows.append((text, letters))
    return rows


def main():
    source = records()
    assert set(source) == set(CHARS), 'the file should cover the 914 characters'
    rows = []
    for point in CHARS:
        entry = source[point]
        radical, strokes = entry['kJURC_RSUnicode'].split('.')
        numeric = entry.get('kJURC_Numeric')
        rows.append([chr(point), int(radical), int(strokes), entry['kJURC_Src'],
                     entry.get('kJURC_NCReading'), int(numeric) if numeric else None])
    codes = table()
    assert len(codes) == 1502 and len({text for text, _ in codes}) == 1502
    assert {ord(text[0]) for text, _ in codes} == set(CHARS) | set(RADICALS)
    with ENCODINGS.open(encoding='utf-8', newline='') as source_file:
        encodings = [[chr(int(row['unicode'], 16)), row['jin1984'], row['xrefs'], row['babelstone'], row['zhzk'], row['ccamc'], row['n5207_draft']]
                     for row in csv.DictReader(source_file, delimiter='\t')]
    assert len(encodings) == 914
    with ORIGINS.open(encoding='utf-8', newline='') as source_file:
        origins = [[chr(int(row['unicode'], 16)), row['relation'], row['source_char'], row['work']]
                   for row in csv.DictReader(source_file, delimiter='\t')]
    assert all(0x18E00 <= ord(char) <= 0x19191 for char, *_ in origins)
    document = {
        'unicode': '18.0.0',
        'table': {'name': 'Alari_jurc', 'version': '2026.05.29', 'sha256': hashlib.sha256(TABLE.read_bytes()).hexdigest()},
        'rows': rows,
        'radicals': [chr(point) for point in RADICALS],
        'codes': codes,
        'encodings': encodings,
        'origins': origins,
    }
    raw = json.dumps(document, ensure_ascii=False, separators=(',', ':')).encode()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.GzipFile(OUT, 'wb', mtime=0) as out:
        out.write(raw)
    print(f'{len(rows)} characters, {len(document["radicals"])} radicals, {len(codes)} codes, '
          f'{OUT.stat().st_size} bytes -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()

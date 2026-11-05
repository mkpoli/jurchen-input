# /// script
# requires-python = ">=3.11"
# dependencies = ["pymupdf==1.27.2", "fonttools==4.68.0", "numpy==2.4.1", "pillow==13.0.0"]
# ///
"""Tabulate the encodings Jurchen text used before Unicode 18, from the encoding proposals.

Two tables come out, under data/encodings/:

- legacy-map.tsv, one row for each private-use code point: which character it stands for and how
  that is known.
- characters.tsv, one row for each of the 914 characters: every reference the proposals give it.

The links, all from the two proposals:

- WG2 N5207, Table 7: X-reference to Zhonghua Ziku PUA, and to the draft code point of its Table 6.
- WG2 N5261R, Table 4: Unicode code point to X-references and Jin 1984 entries.
- N5261R, Table 4, columns Berlin, Tokyo, Beijing and TYG: glyphs drawn with BabelStone's four scan
  fonts. The PDF holds them as images, so each is matched against every glyph of its font. A match
  under MATCH is not accepted. N5207, Table 6 keeps some of the same glyphs as text in private-use
  code points, an independent reading of the same link, and the build reports where the two differ.

The PDFs and fonts are downloaded to cache/ and must match the digests in data/encodings/SOURCES.txt.
`--update-sources` records new digests instead, for a deliberate change of source.
"""
import collections
import csv
import hashlib
import re
import sys
import urllib.request
from pathlib import Path

import numpy as np
import pymupdf
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'cache'
OUT = ROOT / 'data/encodings'
UCD = ROOT / 'data/unicode/JurchenSources-18.0.0.txt'
DOCS = {
    'n5207': 'https://www.unicode.org/wg2/docs/n5207-Jurchen.pdf',
    'n5261r': 'https://www.unicode.org/L2/L2024/24139-n5261r-jurchen-ideographs.pdf',
}
FONTS = {
    'berlin': ('Berlin', 'https://www.babelstone.co.uk/Fonts/Download/JurchenBerlin.ttf'),
    'toyo': ('Tokyo', 'https://www.babelstone.co.uk/Fonts/Download/JurchenToyoBunko.ttf'),
    'beijing': ('Beijing', 'https://www.babelstone.co.uk/Fonts/Download/JurchenBeijing.ttf'),
    'tianyige': ('TYG', 'https://www.babelstone.co.uk/Fonts/Download/JurchenTianyige.ttf'),
}
COLUMN = {column: key for key, (column, _) in FONTS.items()}
SIZE = 40
DPI = 300
MATCH = 0.8
CP = re.compile(r'1[89][0-9A-F]{3}')
XREF = re.compile(r'X-\d{4}')
ENTRY = re.compile(r'\d{3}-\d{2}\*?')


def fetch(url):
    path = CACHE / url.rsplit('/', 1)[1]
    if not path.exists():
        CACHE.mkdir(exist_ok=True)
        request = urllib.request.Request(url, headers={'User-Agent': 'jurchen-input'})
        path.write_bytes(urllib.request.urlopen(request, timeout=300).read())
    return path


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_sources():
    """Stop if a downloaded file is not the one the tables were built from."""
    urls = {**DOCS, **{key: url for key, (_, url) in FONTS.items()}}
    current = {key: (url, digest(fetch(url))) for key, url in urls.items()}
    record = OUT / 'SOURCES.txt'
    if '--update-sources' not in sys.argv and record.exists():
        pinned = dict(line.split('\t')[0::2] for line in record.read_text(encoding='utf-8').splitlines())
        changed = [key for key, (_, sha) in current.items() if pinned.get(key) != sha]
        if changed:
            raise SystemExit(f'{changed} differ from data/encodings/SOURCES.txt; rerun with --update-sources to accept them')
    OUT.mkdir(parents=True, exist_ok=True)
    record.write_text(''.join(f'{key}\t{url}\t{sha}\n' for key, (url, sha) in current.items()), encoding='utf-8')


def spans(page):
    return [s for block in page.get_text('dict')['blocks'] for line in block.get('lines', []) for s in line['spans']]


def table7(document):
    """X-reference to Zhonghua Ziku PUA and draft code point."""
    rows = {}
    for page in document:
        found = spans(page)
        if not any('Glyph Ref.' in s['text'] for s in found):
            continue
        current = None
        for s in found:
            text = s['text'].strip()
            if XREF.fullmatch(text):
                current = rows.setdefault(text, {'zhzk': '', 'draft': ''})
            elif current is not None and re.fullmatch(r'U\+F[0-9A-F]{4}', text):
                current['zhzk'] = text[2:]
            elif current is not None and re.fullmatch(r'[0-9A-F]{5}\*?', text):
                current['draft'] = text.rstrip('*')
    return rows


def table6_text(document):
    """The private-use code points N5207's Table 6 holds as text, by draft code point."""
    rows = collections.defaultdict(set)
    for page in document:
        found = spans(page)
        if not any(s['text'].strip() == 'Hua' for s in found) or not any('C/P' in s['text'] for s in found):
            continue
        current = None
        for s in found:
            text = s['text'].strip()
            if CP.fullmatch(text) and s['origin'][0] < 100:
                current = text
            elif current:
                rows[current] |= {f'{ord(c):04X}' for c in s['text'] if 0xE000 <= ord(c) <= 0xF8FF}
    return rows


def table4(document):
    """Each character's references, read in the PDF's own cell order."""
    rows = {}
    for page in document:
        found = spans(page)
        if not any('X-References' in s['text'] for s in found) or not any('C/P' in s['text'] for s in found):
            continue
        current = None
        for s in found:
            text = s['text'].strip()
            if CP.fullmatch(text) and s['origin'][0] < 90:
                current = rows.setdefault(text, {'entries': [], 'xrefs': []})
            elif current is not None and ENTRY.fullmatch(text):
                current['entries'].append(text)
            elif current is not None and XREF.fullmatch(text):
                current['xrefs'].append(text)
    return rows


def normal(ink):
    """Ink cropped and fitted to a square, as a unit vector, so glyphs compare by shape."""
    if ink.size == 0:
        return None
    ys, xs = np.where(ink > 0.35)
    if not len(xs):
        return None
    cropped = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    image = Image.fromarray((cropped * 255).astype('uint8'))
    scale = (SIZE - 2) / max(image.size)
    image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    square = Image.new('L', (SIZE, SIZE), 0)
    square.paste(image, ((SIZE - image.width) // 2, (SIZE - image.height) // 2))
    vector = np.asarray(square, dtype='float32').ravel()
    vector = vector - vector.mean()
    length = np.linalg.norm(vector)
    return vector / length if length else None


def font_bank(path):
    codes = sorted(k for k in TTFont(path).getBestCmap() if 0xE000 <= k <= 0xF8FF)
    face = ImageFont.truetype(path, 160)
    vectors, kept = [], []
    for code in codes:
        canvas = Image.new('L', (320, 320), 0)
        ImageDraw.Draw(canvas).text((60, 40), chr(code), font=face, fill=255)
        vector = normal(np.asarray(canvas, dtype='float32') / 255)
        if vector is not None:
            vectors.append(vector)
            kept.append(f'{code:04X}')
    return np.stack(vectors), kept


def match_glyphs(document, banks):
    """Every scan-font glyph image in Table 4, with the character whose row it stands in."""
    hits = []
    for page in document:
        found = spans(page)
        if not any('X-References' in s['text'] for s in found) or not any('C/P' in s['text'] for s in found):
            continue
        heads = {}
        for word in page.get_text('words'):
            if word[1] < 130 and word[4] in ('Berlin', 'Tokyo', 'Beijing', 'TYG', 'Jin') and word[4] not in heads:
                heads[word[4]] = word[0]
        columns = [('Berlin', heads['Berlin'] - 6, heads['Tokyo'] - 6), ('Tokyo', heads['Tokyo'] - 6, heads['Beijing'] - 6),
                   ('Beijing', heads['Beijing'] - 6, heads['TYG'] - 6), ('TYG', heads['TYG'] - 6, heads['Jin'] - 4)]
        points = sorted((s['origin'][1], s['text'].strip()) for s in found if CP.fullmatch(s['text'].strip()) and s['origin'][0] < 90)
        drawings = page.get_drawings()
        rules = sorted({round(g['rect'].y0, 1) for g in drawings if g['rect'].x0 < 90 and g['rect'].x1 <= 130 and g['rect'].width >= 20 and g['rect'].height < 2})
        pixmap = page.get_pixmap(dpi=DPI, colorspace=pymupdf.csGRAY)
        ink = 1 - np.frombuffer(pixmap.samples, dtype='uint8').reshape(pixmap.h, pixmap.w).astype('float32') / 255
        scale = DPI / 72
        # The table's ruled lines would otherwise be read as strokes of any glyph they cross.
        for drawing in drawings:
            r = drawing['rect']
            if min(r.width, r.height) < 2:
                ink[max(0, int((r.y0 - 1) * scale)):int((r.y1 + 1) * scale) + 1, max(0, int((r.x0 - 1) * scale)):int((r.x1 + 1) * scale) + 1] = 0
        for info in page.get_image_info():
            box = info['bbox']
            x, y = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
            column = next((name for name, low, high in columns if low <= x < high), None)
            if not column:
                continue
            above = max((r for r in rules if r <= y), default=None)
            below = min((r for r in rules if r > y), default=None)
            row = [cp for at, cp in points if above is not None and below is not None and above <= at < below]
            vector = normal(ink[int(box[1] * scale):int(box[3] * scale) + 1, int(box[0] * scale):int(box[2] * scale) + 1])
            if vector is None or len(row) != 1:
                continue
            matrix, codes = banks[column]
            similarity = matrix @ vector
            best = int(similarity.argmax())
            hits.append((codes[best], row[0], COLUMN[column], float(similarity[best])))
    return hits


def ucd_records():
    found = {}
    for line in UCD.read_text(encoding='utf-8').splitlines():
        if line.startswith('U+'):
            code, tag, value = line.split('\t')
            found.setdefault(code[2:], {})[tag] = value
    return found


def write(path, header, rows):
    with path.open('w', encoding='utf-8', newline='') as out:
        writer = csv.writer(out, delimiter='\t', lineterminator='\n')
        writer.writerow(header)
        writer.writerows(rows)


def main():
    check_sources()
    n5207 = pymupdf.open(fetch(DOCS['n5207']))
    n5261r = pymupdf.open(fetch(DOCS['n5261r']))
    paths = {key: fetch(url) for key, (_, url) in FONTS.items()}
    x_table = table7(n5207)
    characters = table4(n5261r)
    ucd = ucd_records()
    assert set(characters) == set(ucd), 'Table 4 and Unicode list different characters'
    for code, row in characters.items():
        source = ucd[code]['kJURC_Src']
        if source.startswith('NC:'):
            wanted = [entry.replace('.', '-') for entry in source[3:].split(',')]
            assert all(entry in [e.rstrip('*') for e in row['entries']] for entry in wanted), (code, source, row['entries'])

    x_to_chars = collections.defaultdict(list)
    for code, row in characters.items():
        for x in row['xrefs']:
            x_to_chars[x].append(code)

    # BabelStone's code points, read from images in Table 4.
    banks = {FONTS[key][0]: font_bank(str(path)) for key, path in paths.items()}
    votes = collections.defaultdict(lambda: collections.defaultdict(list))
    for code, char, font, score in match_glyphs(n5261r, banks):
        if score >= MATCH:
            votes[code][char].append((font, score))

    # The same link read from text in Table 6, through the X-references that share a draft code point.
    by_draft = collections.defaultdict(list)
    for x, row in x_table.items():
        if row['draft']:
            by_draft[row['draft']].append(x)
    text_links = collections.defaultdict(set)
    for draft, codes in table6_text(n5207).items():
        for code in codes:
            for x in by_draft.get(draft, []):
                text_links[code] |= set(x_to_chars.get(x, []))
    agreed, differing = 0, []
    for code, chars in text_links.items():
        seen = set(votes.get(code, {}))
        if chars and seen:
            # A code point can name two characters by font, so the text has to agree with one of them.
            if seen & chars:
                agreed += 1
            else:
                differing.append((code, sorted(chars), sorted(seen)))
    print(f'text and image agree on {agreed}, differ on {len(differing)}: {differing}')

    every_code = sorted({code for _, codes in banks.values() for code in codes})
    fonts_of = {code: [key for key, (column, _) in FONTS.items() if code in banks[column][1]] for code in every_code}

    legacy = []
    babelstone = collections.defaultdict(list)
    for code in every_code:
        voted = votes.get(code, {})
        text = sorted(text_links.get(code, ()))
        fonts = ' '.join(fonts_of[code])
        if len(voted) > 1:
            # One code point, two drawings: which character it means depends on the font.
            each = ' '.join(f'{font}={char}' for char, hits in sorted(voted.items()) for font, _ in hits)
            legacy.append(('babelstone', code, '', fonts, 'font-specific', '', each))
            for char, hits in voted.items():
                babelstone[char].append(f'{code}({hits[0][0]})')
        elif voted:
            char, hits = next(iter(voted.items()))
            score = max(s for _, s in hits)
            evidence = 'image+text' if char in text else 'image'
            note = f'draft row in N5207 Table 6 leads to {" ".join(text)}' if text and char not in text else ''
            legacy.append(('babelstone', code, char, fonts, evidence, f'{score:.3f}', note))
            babelstone[char].append(code)
        elif len(text) == 1:
            legacy.append(('babelstone', code, text[0], fonts, 'text', '', ''))
            babelstone[text[0]].append(code)
        else:
            note = 'no glyph in Table 4 clears the match' + (f'; Table 6 text allows {" ".join(text)}' if text else '')
            legacy.append(('babelstone', code, '', fonts, 'unmapped', '', note))

    # N5207 lists three pairs of X-references under one code point: the font draws them alike.
    by_zhzk = collections.defaultdict(list)
    for x, row in sorted(x_table.items()):
        if row['zhzk']:
            by_zhzk[row['zhzk']].append(x)
    zhzk = collections.defaultdict(list)
    for code, xs in sorted(by_zhzk.items()):
        chars = sorted({char for x in xs for char in x_to_chars.get(x, [])})
        refs = ' '.join(xs)
        if len(chars) == 1:
            legacy.append(('zhzk', code, chars[0], '', 'x-reference', '', refs))
            zhzk[chars[0]].append(code)
        elif chars:
            legacy.append(('zhzk', code, '', '', 'ambiguous', '', f'{refs} are listed under {" ".join(chars)}'))
            for char in chars:
                zhzk[char].append(code)
        else:
            legacy.append(('zhzk', code, '', '', 'unmapped', '', f'{refs} not in Table 4'))

    OUT.mkdir(parents=True, exist_ok=True)
    write(OUT / 'legacy-map.tsv', ('encoding', 'legacy', 'unicode', 'fonts', 'evidence', 'score', 'note'), legacy)
    rows = []
    for code in sorted(characters, key=lambda c: int(c, 16)):
        row = characters[code]
        drafts = sorted({x_table[x]['draft'] for x in row['xrefs'] if x in x_table and x_table[x]['draft']})
        rows.append((code, ' '.join(e.rstrip('*') for e in row['entries']), ' '.join(row['xrefs']),
                     ' '.join(babelstone.get(code, [])), ' '.join(zhzk.get(code, [])), ' '.join(drafts)))
    write(OUT / 'characters.tsv', ('unicode', 'jin1984', 'xrefs', 'babelstone', 'zhzk', 'n5207_draft'), rows)
    counts = collections.Counter((row[0], row[4]) for row in legacy)
    print(sorted(counts.items()))
    print('characters with a BabelStone code', len(babelstone), 'with a Zhonghua Ziku code', len(zhzk))


if __name__ == '__main__':
    main()

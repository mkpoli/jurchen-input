# /// script
# requires-python = ">=3.11"
# ///
"""Build data/variants/sources.tsv from Table 4 of WG2 N5261R.

Table 4 gives each attested glyph form of a character its own source cell. The Alari font's
variation sequences follow the order of those forms, so this file carries one row for the base
form (selector 0) and one for each variant (selector 1 to 5).

The proposal is not in the repository. Pass its path:

    uv run scripts/build_variant_sources.py --proposal ../references/jurchen/West・Sun（2024）「Proposal to Encode the Jurchen Script」WG2 N5261R.pdf

Requires pdftotext and pdftohtml from Poppler.
"""
import argparse
import html
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/variants/sources.tsv'
SIGLA = ROOT / 'data/variants/sigla.tsv'


def words(page, path):
    text = subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-bbox', str(path), '-'],
                          check=True, capture_output=True, text=True).stdout
    return [(float(x), float(y), float(x1), float(y1), html.unescape(t))
            for x, y, x1, y1, t in re.findall(
                r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', text)]


def images(page, path):
    """Glyph images in the Glyphs column, as (top, left) in PDF points."""
    # pdftohtml writes the page's images beside the output file even with -stdout. Keep them in a
    # temporary directory so a read-only proposal directory is enough to read the PDF.
    with tempfile.TemporaryDirectory() as temp:
        prefix = Path(temp) / f'page-{page}'
        text = subprocess.run(['pdftohtml', '-f', str(page), '-l', str(page), '-xml', '-hidden', '-stdout',
                               str(path), str(prefix)], check=True, capture_output=True, text=True).stdout
    found = []
    for top, left, width, height in re.findall(
            r'<image top="([\d.]+)" left="([\d.]+)" width="([\d.]+)" height="([\d.]+)"', text):
        # The form images in the Glyphs column sit at left ≈ 265 with a width of 50–85 and a height of
        # 25–55; smaller images elsewhere on the page are inline glyphs in notes.
        if 250 < float(left) < 350 and 50 < float(width) < 90 and 25 < float(height) < 55:
            found.append(float(top) / 1.5)
    return sorted(found)


def expand(token):
    """J¹⁴ is J¹ and J⁴; L¹² is L¹ and L²."""
    match = re.fullmatch(r'([JL])([¹²³⁴]+)', token)
    return [match.group(1) + digit for digit in match.group(2)] if match else [token]


def table_rows(path):
    info = subprocess.run(['pdfinfo', str(path)], check=True, capture_output=True, text=True).stdout
    page_count = int(re.search(r'^Pages:\s+(\d+)$', info, re.M).group(1))
    rows = {}
    for page in range(1, page_count + 1):
        word_list = words(page, path)
        headers = {t: (x, y) for x, y, _x1, _y1, t in word_list}
        if 'Sources' not in headers or 'Berlin' not in headers or 'Glyphs' not in headers:
            continue
        source_x, source_y = headers['Sources']
        berlin_x = headers['Berlin'][0]
        codes = sorted((y, t) for x, y, _x1, _y1, t in word_list
                       if re.fullmatch(r'(18[EF]|19[01])[0-9A-F]{2}', t) and x < source_x - 5 and source_y < y < 560)
        if not codes:
            continue
        tops = images(page, path)
        for index, (y, code) in enumerate(codes):
            end = codes[index + 1][0] if index + 1 < len(codes) else 560
            forms = [top for top in tops if y - 12 < top < end - 12]
            if not forms:
                continue  # a code in a footnote, not a table row
            start, stop = forms[0] - 5, min(forms[-1] + 26, end - 14, 556)
            lines = []
            for yy, xx, text in sorted((y, x, t) for x, y, _x1, _y1, t in word_list
                                       if source_x - 3 < x < berlin_x - 3 and start < y < stop):
                if lines and abs(lines[-1][0] - yy) < 2:
                    lines[-1][1].append((xx, text))
                else:
                    lines.append([yy, [(xx, text)]])
            groups = [[] for _ in forms]
            for yy, parts in lines:
                nearest = min(range(len(forms)), key=lambda i: abs(forms[i] - yy))
                if abs(forms[nearest] - yy) > 15:
                    raise SystemExit(f'{code} on p. {page}: source line {yy:.1f} is far from every form')
                groups[nearest].append(' '.join(text for _x, text in sorted(parts)))
            rows[code] = (page, [' '.join(group) for group in groups])
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--proposal', type=Path, required=True)
    args = parser.parse_args()
    rows = table_rows(args.proposal)
    assert len(rows) == 914, f'{len(rows)} characters in Table 4'
    known = {line.split('\t')[0] for line in SIGLA.read_text(encoding='utf-8').splitlines()[1:]}
    out = []
    for code in sorted(rows):
        page, forms = rows[code]
        for selector, cell in enumerate(forms):
            sigla = []
            for token in re.split(r'[,\s]+', cell.strip()):
                if token:
                    sigla += expand(token)
            assert set(sigla) <= known, f'{code} names an unknown siglum: {sigla}'
            out.append((code, selector, ' '.join(sigla), page))
    assert len(out) == 1451, f'{len(out)} forms in Table 4'
    with OUT.open('w', encoding='utf-8') as file:
        file.write('unicode\tselector\tsources\tpage\n')
        for code, selector, sigla, page in out:
            file.write(f'{code}\t{selector}\t{sigla}\t{page}\n')
    print(f'{len(rows)} characters, {len(out)} forms -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()

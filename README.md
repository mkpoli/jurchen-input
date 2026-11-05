# Jurchen Input

A site for entering Jurchen, encoded in Unicode 18.0: name a character in whatever form you have,
check its record, and put it into your text.

## Finding a character

- **Find**: one box for anything. Pasted Jurchen is listed character by character with its readings;
  Latin letters are tried as a stroke code and as a reading at once; a number finds the numeral with
  that value; `U+18E…` lists code points.
- **Strokes**: an input method over Alari's five-stroke codes, the first four strokes and the last.
  `h s p d z` name the strokes and `b` closes a radical. Candidates are numbered; `Space` or a digit
  adds one to the text. Variant forms are listed beside their base forms.
- **Draw**: a drawing pad ranked by glyph shape against the Alari face. It is rough, and the page
  says so.
- **Radicals**: Unicode's 51 radicals, each with its characters by stroke count.
- **Reading**: the readings of Jin Qizong's dictionary, with phonetic letters or plain ones.
- **Transcribe**: the text with the reading of each character under it.

The card of a character shows its code points, stroke code, variant forms, reading, numeric value
and source reference. The text stays in the browser and copies as text, code points, stroke codes,
or with every variant put back to its base form.

## Data

Every source, with what it gives and its terms, is in [`docs/materials.md`](docs/materials.md).

- `app/data/jurchen.json.gz`, built by `bun run build:data` from
  `data/unicode/JurchenSources-18.0.0.txt` and `data/alari/Alari_jurc.dict.yaml`.
- `app/data/jurchen-shapes.bin.gz`, pen lines for the drawing pad, built by `bun run build:shapes`.
- `app/public/fonts/AlariXuwasunJurchen-Regular.woff2`, built by `bun run build:font` from the OFL
  font in `data/alari/`.

No data from CCAMC (ccamc.org, ccamc.co) is used, and neither is the reference font of the Unicode
code charts.

## Development

```sh
bun install
bun run dev        # the site
bun run verify     # unit tests, type check, messages
bun run build      # the static site into dist/
bunx vite preview app --port 5198 &
SITE_URL=http://localhost:5198 bun run check:site   # every page and flow in Chromium, shots in shots/
```

The added code is MIT; see `LICENSE`. The design system is in `design/`.

## Sponsor

I build jurchen-input on my own, with no funding behind it, and it's free for everyone. If it's useful to you, a tip on [Ko-fi](https://ko-fi.com/mkpoli) or [OFUSE](https://ofuse.me/mkpoli) gives me time to keep improving it. Companies interested in sponsoring can write to mkpoli@mkpo.li.

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/mkpoli)

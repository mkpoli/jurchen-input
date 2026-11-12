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
- **Code chart**: every character and radical by code point, with the blocks' occupancy and the
  characters each radical holds.
- **Reading**: the readings of Jin Qizong's dictionary, with phonetic letters or plain ones.
- **Syllables**: the one-syllable readings laid out like a kana chart, by initial and rime.
- **Transcribe**: the text with the reading of each character under it.
- **Convert**: text in an older font's Private Use codes, turned into Unicode 18, and back.

The card of a character shows its code points, stroke code, variant forms, reading, numeric value
and source reference. A numeral's card also gives the Manchu word for the same number, in letters and
in the Manchu script. The text stays in the browser and copies as text, code points, stroke codes,
or with every variant put back to its base form.

## Data

Every source, with what it gives and its terms, is in [`docs/materials.md`](docs/materials.md).

- `app/data/jurchen.json.gz`, built by `bun run build:data` from
  `data/unicode/JurchenSources-18.0.0.txt`, `data/alari/Alari_jurc.dict.yaml` and
  `data/manchu/numerals.tsv`.
- `app/data/jurchen-shapes.bin.gz`, pen lines for the drawing pad, built by `bun run build:shapes`.
- `app/public/fonts/AlariXuwasunJurchen-Regular.woff2`, built by `bun run build:font` from the OFL
  font in `data/alari/`.
- `app/public/fonts/NotoSansMongolian-Regular.woff2`, built by `bun run build:font:manchu` from the
  OFL font in `data/manchu/`.

The reference font of the Unicode code charts is not used.

## Converting older text

Jurchen text from before Unicode 18 sits in the Private Use codes of its font. `src/index.js` reads two of those encodings; nothing else in the repository needs a build to use it.

```js
import { analyze, fromBabelStone, toUnicode, toZhonghuaZiku } from './src/index.js'

toUnicode('\u{F1C72}')                      // '\u{18E01}', from the Zhonghua Ziku font
toUnicode('\uE004', { babelstone: true })   // '\u{18E01}', from BabelStone's scan fonts
fromBabelStone('\uE6F4', { font: 'toyo' })  // '\u{1905C}': this code differs by font
toZhonghuaZiku('\u{18E01}')                 // '\u{F1C72}', back
analyze(text)                               // what the text uses, and the codes it cannot read
```

| Function | Does |
|---|---|
| `toUnicode` | Reads Zhonghua Ziku codes always, and BabelStone's with `{ babelstone: true }` |
| `fromBabelStone`, `fromZhonghuaZiku` | Reads one encoding, changing nothing else |
| `toBabelStone`, `toZhonghuaZiku` | Writes one encoding. A variant selector goes with its character, and a character with no code stays whole |
| `stripVariants` | Removes Alari's variant selectors |
| `analyze` | Counts each encoding, and lists Private Use characters with no table entry |

Limits:

- **U+E000–U+F8FF is shared.** Other fonts use it too, among them BabelStone's Jurchen Small, so `toUnicode` reads it only when asked.
- **Some codes stay.** Four BabelStone codes have no link, U+E6F4 needs its font, and two Zhonghua Ziku codes name two characters each.
- **Forms are lost.** An older code names a drawn form, and the result keeps the character.
- **Writing is one-way for shared characters.** A character with several older codes writes the first.

The tables, and how each link was made, are in `data/encodings/` and [`docs/materials.md`](docs/materials.md). `bun run build:encodings` rebuilds them from the proposals, and `bun run build:legacy-map` generates `src/legacy-map.js`.

## Development

```sh
bun install
bun run dev        # the site
bun run verify     # unit tests, type check, messages
bun run build      # the static site into dist/
bunx vite preview app --port 5198 &
SITE_URL=http://localhost:5198 bun run check:site   # every page and flow in Chromium, shots in shots/
```

A push to `main` runs the tests, type check and build, then deploys to <https://jurchen.mkpo.li/>. It needs the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

The added code is MIT; see `LICENSE`. The design system is in `design/`.

## Sponsor

I build jurchen-input on my own, with no funding behind it, and it's free for everyone. If it's useful to you, a tip on [Ko-fi](https://ko-fi.com/mkpoli) or [OFUSE](https://ofuse.me/mkpoli) gives me time to keep improving it. Companies interested in sponsoring can write to mkpoli@mkpo.li.

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/mkpoli)

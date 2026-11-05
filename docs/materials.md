# Materials

Every source this site draws on, every one found while looking for more, and what is still missing.
Retrieved 2026-11-05 unless noted.

## In use

| Source | Gives | Terms | Built by |
| --- | --- | --- | --- |
| [JurchenSources.txt](https://www.unicode.org/Public/18.0.0/ucd/JurchenSources.txt), Unicode 18.0 | radical and total strokes of 914 characters, source reference, 806 readings from Jin Qizong 1984, 30 numeric values | [Unicode Terms of Use](https://www.unicode.org/terms_of_use.html) | `scripts/build_jurchen_data.py` |
| Alari Jurchen Rime table, `Alari_jurc.dict.yaml` version 2026.05.29, schema version 2026.05.28, by Yehenara Ayasala, Sulfa and Tunggiya Uju, [朝花·夕拾 電子藏書閣](https://dorontu.com/#/cloud) folder 女真文资料/女真文rime输入法 | 1,502 stroke codes: 914 characters, 51 radicals, 537 variant sequences | none stated; published for readers to download and use | `scripts/build_jurchen_data.py` |
| Alari Xuwasun Jurchen, `AlariXuwasunJurchen-Regular（公测版）.otf`, name table version 0.000 of 2026-10-12, by Sulfa, Dooran and Raxon7, same site, folder 女真文资料/女真文字体 | glyphs for 914 + 51 code points, 537 variants through VS1–VS5 and ss01–ss05 | SIL OFL 1.1, stated in the font's name table | `scripts/build_jurchen_font.py`, `scripts/build_jurchen_shapes.py` |
| Alari (Sulfa & Ayasala), 「没人给女真文做字体和输入法？那我们自己来」, [WeChat article](https://mp.weixin.qq.com/s/YaUP6bq4xt_18ywlRxCQpA), read from a copy of its text, since the page refuses automated fetches; its date was not seen | the stroke definitions on the Strokes page, the account of how the font and variants were made | cited | `app/pages/Strokes.svelte` |
| 柳突破, 「Alari 仿宋女真文字体快闪，庆祝女真文正式入U」, [Bilibili](https://www.bilibili.com/video/BV1odec6pEqp/), 2026-09-16 | points to the download site | cited | none |

| [WG2 N5261R](https://www.unicode.org/L2/L2024/24139-n5261r-jurchen-ideographs.pdf), Andrew West, Sun Bojun and the Zhonghua Ziku project, 2024-06-12, Table 3 | four characters written as the Chinese character of the same meaning in Jin inscriptions | cited | `data/etymology/origins.tsv` |
| Kiyose Gizaburō Norifu 清瀬義三郎則府, 「女真文字」, [地球ことば村](https://www.chikyukotobamura.org/muse/wr_easia_9.html), updated 2022-06-18 | figures of characters imitating Chinese regular script and of Jurchen beside Khitan large script; the statement on numerals | cited | `data/etymology/origins.tsv` |
| Andrew West, [One to Twenty in Jurchen, Khitan and Lute](https://www.babelstone.co.uk/Blog/2012/12/one-to-twenty-in-jurchen-khitan-and-lute.html), BabelStone blog, 2012-12-18 | the contrary view on numerals | cited | card text |
| Andrew West, [Index to Jin Qizong's dictionary](https://www.babelstone.co.uk/Jurchen/JQZ1984_Index.html) | gloss and page, used to tie Kiyose's figures to code points | used as a lookup, not redistributed | `data/etymology/origins.tsv` |

SHA-256 of the files as downloaded:

- `Alari_jurc.dict.yaml`: `16952da9ea874bf2418fef63febdc8fca3e9322adab97c4a38181b0dd684bca4`
- `Alari_jurc.schema.yaml`: `5d53d3fd926b80bedfba7bbec5b9d7bdaf3c0104432f31039526f436fcfc1451`
- `AlariXuwasunJurchen-Regular.otf`: `41c71fc276e80044034e9719779c7cbcb2ec9f4329e49eae9e37d27b06469df7`

Unicode's text says the chart's representative glyphs are not prescriptive, and the article says the
font is a mechanical restyling of the forms in the encoding proposal: its forms are the proposal's
reading of the sources, in a Fangsong dress, and neither claims to reproduce an inscription or
manuscript. The article also says the table "continues" the five-stroke method of an earlier Rime
scheme attributed to 中华字库; the table's own header says its three authors compiled it. Whether any
of its codes were copied from that scheme could not be checked here.

Corrections made in the build, both in `scripts/build_jurchen_data.py`:

- The table's row for U+18FF3 U+FE01 has a stray U+FE00 at the end of its code `phhsz`; it is removed.
- The table's row `□ szh` is the font's placeholder glyph, and is dropped.

Variant sequences: `StandardizedVariants.txt` of Unicode 18.0 has no Jurchen entries, and §18.13 of
the core specification does not mention them. The sequences here are Alari's convention. In the font,
each of the 537 agrees with the matching style set (`ss01`–`ss05`); this was checked on the font's own
tables.

## Character origins

`data/etymology/origins.tsv` holds only what a source states of a named character: 13 characters. Everything else on the card says no source is available, which says nothing about whether one exists in print.

- **Table 3 of N5261R** names its four characters by code point.
- **Kiyose's figures** print glyphs with a Chinese gloss and no code point. Each was tied to a code point through West's index of Jin 1984, gloss and page leading to a reading, and the glyph then compared by eye with the Alari form. The tie is this site's work. U+18E16 differs most: the figure has the semi-cursive Ming form N5261R describes.
- **Left out of Kiyose's figures:** 金 and 枝, where the index leads to a character with another shape, and 生, 未, 蒙 and 太, where it leads to none. His 春夏秋冬, 東西南北 and bun/bitxə examples are also out, for lack of a reliable tie to a code point.
- **Numerals.** Kiyose says all are modified Chinese characters, naming none. West (2012) says the forms are not obviously from Khitan and that some follow the Chinese number. Kane 1989, Table 6 sets them side by side ([scan on BabelStone](https://www.babelstone.co.uk/Jurchen/Kane_21.jpg)). The card reports the disagreement and assigns no individual source.
- **Not available here:** Kane 1989, pp. 21–24, which Wikipedia cites on derivation, and Jin Guangping and Jin Qizong 1980, ch. 3, which a Zhihu answer (seen only as a search summary; the page refuses automated fetches) points to for examples. A character-by-character table would have to come from these.

## Found, not used

- [CCAMC](http://ccamc.org/) (also ccamc.co): not used, by this site's policy. Its font pages list a Jurchen Kaiti face and Cangjie and stroke schemes.
- Unicode code charts [U18E00](https://www.unicode.org/charts/PDF/U18E00.pdf), [U191A0](https://www.unicode.org/charts/PDF/U191A0.pdf): the embedded font is `ZHZKCHINjurcunicode`. [Unicode's font page](https://www.unicode.org/charts/fonts.html) says chart fonts may not be extracted or reused without the owner's licence.
- [Xebec33/jurchen_wubi](https://github.com/Xebec33/jurchen_wubi), GPL-3.0, 2026-08-17: a Wubi 86 scheme, encoded entirely in the Private Use Area of the CCAMC font, whose README thanks CCAMC for information and fonts.
- [BabelStone Jurchen Small](https://www.babelstone.co.uk/Fonts/JurchenSmall.html), v1.000 of 2023-04-25: nine Private Use glyphs of the Jurchen small script. A third-party [issue](https://github.com/tyohDeveloper/Unicode-Explorer/issues/11) (tyohDeveloper, 2026-10-09) reports the Berlin, Beijing, Toyo Bunko and Tianyige faces are Private Use too; those pages could not be reached to confirm.
- GNU Unifont: the same issue reports draft glyphs in 17.0.05 removed in 18.0.01. Not checked directly.
- Noto: the same issue found no Noto face mapping these code points as of 2026-10-09.
- [English Wiktionary, Jurchen lemmas](https://en.wiktionary.org/wiki/Category:Jurchen_lemmas): about twenty entries, in Latin letters with images of the script. Tying them to code points through a shared reading would be guesswork, so they are left out.

## Missing

- **Meanings.** Glosses exist in print (Jin Qizong 1984, Kiyose 1977, Kane 1989) and no open table ties them to these code points. Only Unicode's numeric values are shown.
- **Attested lines.** Alari announces work on the extant texts. No open transcription at these code points was found.
- **Other faces.** Alari announces a Song face and others. The site has one face until they exist.
- **Measured drawing search.** Only one face exists, so a drawing cannot be tested against a second design, and no real handwriting has been collected.

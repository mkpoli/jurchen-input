import { describe, expect, test, beforeAll } from 'bun:test'
import { gunzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { fill, ix, radicalNumber } from '../app/lib/index.js'
import { baseOf, clusters, codePoint, fromParam, lastCluster, readSource, toParam, variantOf } from '../app/lib/script.js'
import { byCode, byCodePoint, byNumber, byReference, jurchenIn, nextLetters } from '../app/lib/search.js'
import { foldQuery, foldReading, searchReadings } from '../app/lib/reading.js'
import { buildChart, cellKey, rimeGroup, syllablesOf } from '../app/lib/syllables.js'
import { indexShapes, parseShapes, rankShapes, SIZE } from '../app/lib/shape.js'

const records = JSON.parse(gunzipSync(readFileSync('app/data/jurchen.json.gz')).toString())
const shapes = new Uint8Array(gunzipSync(readFileSync('app/data/jurchen-shapes.bin.gz')))

beforeAll(() => fill(records))

describe('records', () => {
  test('cover the blocks of Unicode 18.0', () => {
    expect(ix.entries.size).toBe(914)
    expect(ix.radicals.length).toBe(51)
    expect(ix.codes.size).toBe(1502)
    expect(ix.readings.length).toBe(806)
    expect(ix.numerals.size).toBe(30)
    expect(ix.manchu.size).toBe(30)
    expect(ix.byRadical.size).toBe(51)
  })
  test('hold the values of JurchenSources.txt', () => {
    const entry = ix.entries.get('\u{18E01}')
    expect(entry).toMatchObject({ radical: 1, strokes: 3, reading: 'tumən', numeric: 10000 })
    expect(ix.numerals.get(3)).toBe('\u{19129}')
    expect(ix.manchu.get('\u{18E01}')).toMatchObject({ latin: 'tumen', work: 'mollendorff1892' })
    expect(ix.manchu.get('\u{19129}')).toMatchObject({ latin: 'ilan' })
  })
  test('give each radical its number', () => {
    expect(radicalNumber('\u{191A0}')).toBe(1)
    expect(radicalNumber('\u{191D2}')).toBe(51)
    expect(radicalNumber('\u{18E01}')).toBe(0)
  })
})

describe('sequences', () => {
  test('a variant is one character in text', () => {
    expect(clusters('a\u{18E01}\uFE00\u{18E02}')).toEqual(['\u{18E01}\uFE00', '\u{18E02}'])
    expect(lastCluster('\u{18E01}\uFE00')).toBe('\u{18E01}\uFE00')
    expect(variantOf('\u{18E01}\uFE00')).toBe(1)
    expect(variantOf('\u{18E01}')).toBe(0)
    expect(baseOf('\u{18E01}\uFE00')).toBe('\u{18E01}')
    expect(codePoint('\u{18E01}\uFE00')).toBe('U+18E01 U+FE00')
    expect(jurchenIn('\u{18E01}\u{18E01}x')).toEqual(['\u{18E01}'])
  })
  test('an address round-trips, and names only Jurchen', () => {
    expect(fromParam(toParam('\u{18E01}\uFE00'))).toBe('\u{18E01}\uFE00')
    expect(fromParam('17000')).toBe('')
    expect(fromParam('18E01-FE10')).toBe('')
  })
  test('source references are read in each of their forms', () => {
    expect(readSource('NC:002.02')).toEqual({ key: 'nc', params: { page: '2', entry: '2' } })
    expect(readSource('NC:043.09,044.01')).toEqual({ key: 'ncRun', params: { page: '43', entry: '9', endPage: '44', endEntry: '1' } })
    expect(readSource('SJ-B:007A.1')).toEqual({ key: 'sj', params: { folio: '7A', position: '1' } })
    expect(readSource('JJ:363')).toEqual({ key: 'jj', params: { page: '363' } })
    expect(readSource('N5131:X-1378')).toEqual({ key: 'n5131', params: { entry: 'X-1378' } })
  })
  test('every source reference in the records has a known form', () => {
    for (const entry of ix.entries.values()) expect(entry.source).toMatch(/^(NC:\d+\.\d+(,\d+\.\d+)?|SJ-B:\w+\.\d+|JJ:\d+|N5131:X-\d+)$/)
  })
})

describe('stroke codes', () => {
  test('the exact code comes first and every hit begins with the letters', () => {
    const hits = byCode('hhz')
    expect(hits[0].code).toBe('hhz')
    expect(hits[0].char).toBe('\u{18E00}')
    for (const hit of hits) expect(hit.code.startsWith('hhz')).toBe(true)
  })
  test('a radical is reached with b', () => {
    expect(byCode('hb').map(hit => hit.char)).toContain('\u{191A0}')
  })
  test('variants can be kept out', () => {
    const all = byCode('h'), base = byCode('h', { variants: false })
    expect(all.length).toBeGreaterThan(base.length)
    for (const hit of base) expect(variantOf(hit.char)).toBe(0)
  })
  test('the keys that can follow are counted', () => {
    const next = nextLetters('')
    expect([...next.keys()].sort()).toEqual(['d', 'h', 'p', 's', 'z'])
    expect(nextLetters('hhz').size).toBeGreaterThan(0)
  })
  test('other finders', () => {
    expect(byNumber('10000')).toEqual(['\u{18E01}'])
    expect(byNumber('12345')).toEqual([])
    expect(byCodePoint('U+18E01')).toEqual(['\u{18E01}'])
    expect(byCodePoint('U+1700')).toEqual([])
  })
})

describe('references from before Unicode 18', () => {
  test('every character has a record and the proposals\' links hold', () => {
    expect(ix.encodings.size).toBe(914)
    const tumen = ix.encodings.get('\u{18E01}')
    expect(tumen).toEqual({ jin1984: ['002-04', '146-03', '270-02'], xrefs: ['X-0005', 'X-0668', 'X-1235'], babelstone: ['E004'], zhzk: ['F1C72', 'F1F02', 'F2134'], draft: ['18E03'] })
  })
  test('every form of a reference finds the character', () => {
    for (const query of ['X-0005', 'x0005', '002-04', 'NC:002.04', 'U+E004', 'e004', 'U+F1C72']) expect(byReference(query)).toEqual(['\u{18E01}'])
    expect(byReference('18E03')).toEqual([])
  })
  test('a code point that means two characters names both', () => {
    expect(byReference('E6F4').sort()).toEqual(['\u{18F70}', '\u{1905C}'])
    expect(ix.encodings.get('\u{18F70}')?.babelstone).toContain('E6F4(tianyige)')
  })
})

describe('syllable chart', () => {
  test('a reading splits into initial and rime', () => {
    expect(syllablesOf('nie')).toEqual([{ initial: 'n', rime: 'ie' }])
    expect(syllablesOf('dʒuan')).toEqual([{ initial: 'dʒ', rime: 'uan' }])
    expect(syllablesOf('ŋgai')).toEqual([{ initial: 'ŋg', rime: 'ai' }])
    expect(syllablesOf('a')).toEqual([{ initial: '', rime: 'a' }])
    expect(syllablesOf('(g)an')).toEqual([{ initial: 'g', rime: 'an' }])
    expect(syllablesOf('ŋi, gi')).toEqual([{ initial: 'ŋ', rime: 'i' }, { initial: 'g', rime: 'i' }])
    expect(syllablesOf('r')).toEqual([{ initial: '', rime: 'r' }])
    expect(syllablesOf('in ku')).toEqual([{ initial: '', rime: 'in' }, { initial: 'k', rime: 'u' }])
    expect(syllablesOf('fai muta')).toEqual([{ initial: 'f', rime: 'ai' }])
    expect(syllablesOf('ku duman')).toEqual([{ initial: 'k', rime: 'u' }])
    expect(syllablesOf('xodiwo o')).toEqual([{ initial: '', rime: 'o' }])
  })
  test('a word of two syllables or more has none', () => {
    for (const raw of ['tumən', 'ania', 'giaxu.un', 'bandi']) expect(syllablesOf(raw)).toEqual([])
  })
  test('rimes fall into their groups', () => {
    expect(['a', 'ie', 'an', 'aŋ', 'ar', 'r'].map(rimeGroup)).toEqual(['open', 'glide', 'n', 'ng', 'other', 'other'])
  })
  test('every reading is either charted or counted as longer', () => {
    const chart = buildChart(ix.readings)
    expect(chart.charted + chart.consonants + chart.longer).toBe(806)
    expect(chart.consonants).toBe(3)
    expect(chart.cells.get(cellKey('n', 'ie'))?.map(cell => cell.char)).toContain('\u{18E00}')
    expect(chart.initials[0]).toBe('')
    for (const cells of chart.cells.values()) for (const cell of cells) expect(syllablesOf(cell.raw).length).toBeGreaterThan(0)
    expect(chart.cells.get(cellKey('f', 'ai'))?.map(cell => cell.raw)).toContain('fai muta')
  })
})

describe('character origins', () => {
  test('hold only cited statements about characters with these readings', () => {
    expect(ix.origins.get('\u{19049}')).toEqual([{ relation: 'jin-identical', source: '一', work: 'n5261r' }, { relation: 'chinese-meaning', source: '一', work: 'jinjin1980' }])
    expect(ix.origins.get('\u{18F7A}')?.map(origin => origin.work)).toEqual(['n5261r', 'kiyose', 'kiyose', 'jinjin1980'])
    expect(ix.origins.get('\u{190BD}')).toEqual([{ relation: 'chinese-sound', source: '舍', work: 'jinjin1980' }])
    const readings = { '18F7A': 'inəŋgi', '190FA': 'bia', 19049: 'əmu', '1904A': 'dʒo', '18E16': 'abxa', 19012: 'ania', 19171: 'tasxa', '18EDB': 'bəje', '18F65': 'mudu', '1906F': 'nialma', '1907C': 'dondi', '190FB': 'duli', 19182: 'xutu' }
    expect(ix.origins.size).toBe(37)
    // The book's numerals agree with Unicode's numeric values.
    for (const [source, value] of [['三', 3], ['六', 6], ['九', 9], ['十', 10], ['百', 100], ['萬', 10000]]) {
      const char = ix.numerals.get(value)
      expect(ix.origins.get(char ?? '')?.map(origin => origin.source)).toContain(source)
    }
    for (const [code, reading] of Object.entries(readings)) {
      const char = String.fromCodePoint(parseInt(code, 16))
      expect(ix.entries.get(char)?.reading).toBe(reading)
      expect(ix.origins.has(char)).toBe(true)
    }
  })
})

describe('readings', () => {
  test('fold phonetic letters and plain ones alike', () => {
    expect(foldReading('tumən')).toBe(foldQuery('tumen'))
    expect(foldReading('ədʒən')).toBe(foldQuery('ejen'))
    expect(foldReading('ədʒən')).toBe(foldQuery('ezhen'))
    expect(foldReading('ʃan')).toBe(foldQuery('shan'))
  })
  test('fold the ǰ, š and č of Yoshiike and Nakamura with the dictionary letters', () => {
    expect(foldReading('ədʒən')).toBe(foldQuery('eǰen'))
    expect(foldReading('ʃan')).toBe(foldQuery('šan'))
    expect(foldReading('tʃo')).toBe(foldQuery('čo'))
    expect(searchReadings(ix.readings, 'šan').map(hit => hit.raw)).toContain('ʃan')
    expect(searchReadings(ix.readings, 'čo').map(hit => hit.raw)).toContain('tʃo')
    const hits = searchReadings(ix.readings, 'ǰa').map(hit => hit.raw)
    expect(hits).toContain('dʒa')
    expect(hits).not.toContain('jam')
  })
  test('rank exact before begins before contains', () => {
    const hits = searchReadings(ix.readings, 'tumen')
    expect(hits[0]).toMatchObject({ char: '\u{18E01}', tier: 0 })
    expect(searchReadings(ix.readings, 'dʒo')[0].raw).toBe('dʒo')
    const tiers = searchReadings(ix.readings, 'a').map(hit => hit.tier)
    expect([...tiers].sort()).toEqual(tiers)
  })
  test('the source j stays apart from dʒ, as typed exactly it still matches', () => {
    expect(searchReadings(ix.readings, 'jam')[0]).toMatchObject({ raw: 'jam', tier: 0 })
    expect(searchReadings(ix.readings, 'ja').map(hit => hit.raw)).toContain('jam')
    expect(searchReadings(ix.readings, 'taij').map(hit => hit.raw)).toContain('taiji')
  })
})

describe('drawing search', () => {
  const index = indexShapes(parseShapes(shapes))
  test('holds every sequence', () => {
    expect(index.chars.length).toBe(1502)
    expect(new Set(index.chars)).toEqual(new Set(ix.codes.keys()))
  })
  test('a glyph drawn as its own line ranks at the top', () => {
    for (const char of ['\u{18E01}', '\u{19129}', '\u{18E36}', '\u{191BF}']) {
      const at = index.chars.indexOf(char)
      const drawn = new Uint8Array(SIZE * SIZE)
      for (const cell of index.inks[at]) drawn[cell] = 1
      const top = rankShapes(index, drawn, { limit: 3 }).map(hit => hit.char)
      expect(top).toContain(char)
    }
  })
})

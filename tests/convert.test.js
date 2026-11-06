import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { analyze, fromBabelStone, fromZhonghuaZiku, stripVariants, toBabelStone, toUnicode, toZhonghuaZiku } from '../src/index.js'

const rows = readFileSync('data/encodings/legacy-map.tsv', 'utf8').trim().split('\n').slice(1).map(line => line.split('\t'))
const ch = (/** @type {string} */ hex) => String.fromCodePoint(parseInt(hex, 16))

describe('reading older encodings', () => {
  test('every mapped row of the table converts', () => {
    for (const [encoding, legacy, unicode] of rows) {
      if (!unicode) continue
      const read = encoding === 'babelstone' ? fromBabelStone : fromZhonghuaZiku
      expect(read(ch(legacy))).toBe(ch(unicode))
    }
  })
  test('other text and other Private Use code points pass through', () => {
    expect(fromBabelStone('abc 漢字 ')).toBe('abc 漢字 ')
    expect(fromZhonghuaZiku('abc 漢字 \u{F0000}')).toBe('abc 漢字 \u{F0000}')
  })
  test('codes with no known character stay', () => {
    for (const code of ['E0DC', 'E686', 'E6F2', 'E6F3']) expect(fromBabelStone(ch(code))).toBe(ch(code))
    expect(fromZhonghuaZiku('\u{F1E65}')).toBe('\u{F1E65}')
  })
  test('U+E6F4 needs its font', () => {
    expect(fromBabelStone('')).toBe('')
    expect(fromBabelStone('', { font: 'toyo' })).toBe('\u{1905C}')
    expect(fromBabelStone('', { font: 'tianyige' })).toBe('\u{18F70}')
  })
  test('toUnicode reads Zhonghua Ziku always and BabelStone when asked', () => {
    const mixed = '\u{F1C72}'
    expect(toUnicode(mixed)).toBe('\u{18E01}')
    expect(toUnicode(mixed, { babelstone: true })).toBe('\u{18E01}\u{18E01}')
  })
})

describe('writing older encodings', () => {
  test('a character with several codes writes the first and reads back', () => {
    expect(toZhonghuaZiku('\u{18E01}')).toBe('\u{F1C72}')
    expect(toBabelStone('\u{18E01}')).toBe('')
    for (const hex of ['18E00', '18E01', '19191']) {
      expect(fromZhonghuaZiku(toZhonghuaZiku(ch(hex)))).toBe(ch(hex))
    }
  })
  test('a variant selector goes with its character, and a character with no code stays', () => {
    expect(toZhonghuaZiku('\u{18E01}︀x')).toBe('\u{F1C72}x')
    const chars = readFileSync('data/encodings/characters.tsv', 'utf8').trim().split('\n').slice(1).map(line => line.split('\t'))
    const none = ch(/** @type {string[]} */ (chars.find(row => !row[4]))[0])
    expect(toZhonghuaZiku(none)).toBe(none)
    expect(toZhonghuaZiku(`${none}\uFE00`)).toBe(`${none}\uFE00`)
    expect(stripVariants('\u{18E01}︀︀')).toBe('\u{18E01}︀')
  })
})

describe('analyze', () => {
  test('counts a radical as Jurchen', () => {
    expect(analyze('\u{191A0}').unicode).toBe(1)
  })
  test('counts what the text is written with', () => {
    expect(analyze('\u{18E01}︀\u{F1C72}a')).toEqual({ unicode: 1, variants: 1, babelstone: 2, zhzk: 1, unknown: [''], fontSpecific: [''] })
  })
})

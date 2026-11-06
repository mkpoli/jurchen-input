import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { analyze, fromBabelStone, fromCcamc, fromZhonghuaZiku, stripVariants, toBabelStone, toCcamc, toUnicode, toZhonghuaZiku } from '../src/index.js'

const rows = readFileSync('data/encodings/legacy-map.tsv', 'utf8').trim().split('\n').slice(1).map(line => line.split('\t'))
const ch = (/** @type {string} */ hex) => String.fromCodePoint(parseInt(hex, 16))

describe('reading older encodings', () => {
  test('every mapped row of the table converts', () => {
    for (const [encoding, legacy, unicode] of rows) {
      if (!unicode) continue
      const read = { babelstone: fromBabelStone, zhzk: fromZhonghuaZiku, ccamc: fromCcamc }[encoding]
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

describe('CCAMC', () => {
  test('codes run with N3788 numbers, as CCAMC states', () => {
    expect(fromCcamc('\uEC9A')).toBe('\u{19049}') // N3788 no. 1, əmu
    expect(fromCcamc('\uEC9E')).toBe('\u{18E01}') // no. 5, tumən
    expect(toCcamc('\u{18E01}')).toBe('\uEC9E')
  })
  test('radicals follow Unicode, whose 23 is split in two', () => {
    expect(fromCcamc('\uF1FA')).toBe('\u{191A0}')
    expect(fromCcamc('\uF210')).toBe('\u{191B6}')
    expect(fromCcamc('\uF211')).toBe('\u{191B8}')
    expect(fromCcamc('\uF22A')).toBe('\u{191D2}')
    expect(fromCcamc('\uF22B')).toBe('\u{191BE}')
    expect(fromCcamc('\uF27C')).toBe('\uF27C')
  })
  test('toUnicode reads it only when asked', () => {
    expect(toUnicode('\uEC9E')).toBe('\uEC9E')
    expect(toUnicode('\uEC9E', { ccamc: true })).toBe('\u{18E01}')
  })
  test('its range and BabelStone\'s stay apart', () => {
    for (const [encoding, legacy] of rows) {
      if (encoding === 'ccamc') expect(parseInt(legacy, 16)).toBeGreaterThanOrEqual(0xEC9A)
      if (encoding === 'babelstone') expect(parseInt(legacy, 16)).toBeLessThan(0xEC9A)
    }
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
  test('counts what the text is written with', () => {
    expect(analyze('\u{18E01}︀\u{F1C72}a')).toEqual({ unicode: 1, variants: 1, babelstone: 2, zhzk: 1, ccamc: 0, unknown: [''], fontSpecific: [''] })
  })
})

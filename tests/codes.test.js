import { beforeAll, describe, expect, test } from 'bun:test'
import { gunzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { fill, ix } from '../app/lib/index.js'
import { blockRows, inventoryRows, pageCodes, pageCount, pageRange, pageRows, percentText, rangeText, SECTIONS, topRadicals } from '../app/lib/codes.js'

const records = JSON.parse(gunzipSync(readFileSync('app/data/jurchen.json.gz')).toString())

beforeAll(() => fill(records))

const assigned = () => new Map([...ix.entries.keys(), ...ix.radicals].map(char => [char.codePointAt(0) ?? 0, char]))

describe('code chart pages', () => {
  const radicals = SECTIONS.find(section => section.key === 'radicals') ?? SECTIONS[0]
  const characters = SECTIONS.find(section => section.key === 'characters') ?? SECTIONS[1]

  test('start on block boundaries and hold sixteen-code rows', () => {
    expect(rangeText(radicals.start, radicals.end)).toBe('U+191A0–U+191DF')
    expect(rangeText(characters.start, characters.end)).toBe('U+18E00–U+1919F')
    expect(pageCount(radicals)).toBe(1)
    expect(pageCount(characters)).toBe(4)
    expect(pageRows(radicals, 0)).toHaveLength(4)
    expect(pageRows(characters, 0)).toHaveLength(16)
    expect(pageCodes(characters, 0)).toHaveLength(256)
    expect(pageCodes(characters, 3)).toHaveLength(160)
    for (const section of SECTIONS) {
      for (let page = 0; page < pageCount(section); page++) {
        expect(pageCodes(section, page)[0] % 16).toBe(0)
        for (const row of pageRows(section, page)) expect(row).toHaveLength(16)
      }
    }
  })

  test('cover every position once', () => {
    const covered = SECTIONS.flatMap(section => Array.from({ length: pageCount(section) }, (_, page) => pageCodes(section, page))).flat()
    expect(covered).toHaveLength(928 + 64)
    expect(new Set(covered).size).toBe(covered.length)
    for (const code of assigned().keys()) expect(covered).toContain(code)
  })

  test('name a page by the first and last code it assigns', () => {
    const known = assigned()
    expect(pageRange(pageCodes(radicals, 0), known)).toBe('U+191A0–U+191D2')
    expect(pageRange(pageCodes(characters, 0), known)).toBe('U+18E00–U+18EFF')
    expect(pageRange(pageCodes(characters, 3), known)).toBe('U+19100–U+19191')
    expect(pageCodes(characters, 3).filter(code => !known.has(code))).toEqual(Array.from({ length: 14 }, (_, index) => 0x19192 + index))
  })
})

describe('code chart figures', () => {
  test('divide the inventory between radicals and characters', () => {
    expect(percentText(51, 965)).toBe('5.3%')
    expect(percentText(914, 965)).toBe('94.7%')
    expect(inventoryRows(914, 51)).toMatchObject([
      { key: 'radicals', count: 51, percent: '5.3%' },
      { key: 'characters', count: 914, percent: '94.7%' },
    ])
  })

  test('count the blocks against their Unicode positions', () => {
    expect(blockRows(assigned()).map(({ key, count, total, percent }) => ({ key, count, total, percent }))).toEqual([
      { key: 'characters', count: 914, total: 928, percent: '98.5%' },
      { key: 'radicals', count: 51, total: 64, percent: '79.7%' },
    ])
  })

  test('rank the radicals that hold the most characters', () => {
    const top = topRadicals(ix.radicals, ix.byRadical)
    expect(top).toHaveLength(5)
    expect(top.map(radical => [radical.number, radical.count])).toEqual([[31, 97], [50, 73], [1, 54], [32, 44], [7, 38]])
    expect(top[0].char).toBe(ix.radicals[30])
    for (let index = 1; index < top.length; index++) expect(top[index].count).toBeLessThanOrEqual(top[index - 1].count)
  })
})

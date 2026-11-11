// The code chart's sections, pages and figures. Plain functions over the records' code points.
import { hex } from './script.js'

/** Sixteen code points to a row, sixteen rows to a page: Unicode's code-chart layout. */
export const COLUMNS = 16
export const PAGE_SIZE = COLUMNS * 16

/** The two blocks the records fill, in the order the page charts them. */
export const SECTIONS = /** @type {const} */ ([
  { key: 'radicals', title: 'nav.radicals', start: 0x191A0, end: 0x191DF },
  { key: 'characters', title: 'codes.characters', start: 0x18E00, end: 0x1919F },
])

/** The same two blocks as Unicode draws them, for the occupancy figures. */
export const BLOCKS = /** @type {const} */ ([
  { key: 'characters', title: 'codes.characters', start: 0x18E00, end: 0x1919F },
  { key: 'radicals', title: 'nav.radicals', start: 0x191A0, end: 0x191DF },
])

/** A range as the page writes it. @param {number} start @param {number} end */
export const rangeText = (start, end) => `U+${hex(start)}–U+${hex(end)}`

/** How many pages a section takes; every page but the last holds 256 code points. @param {{ start: number, end: number }} section */
export const pageCount = section => Math.ceil((section.end - section.start + 1) / PAGE_SIZE)

/** The code points on one page of a section. @param {{ start: number, end: number }} section @param {number} page */
export function pageCodes(section, page) {
  const start = section.start + page * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE - 1, section.end)
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
}

/** A page as rows of sixteen code points. @param {{ start: number, end: number }} section @param {number} page */
export function pageRows(section, page) {
  const codes = pageCodes(section, page)
  return Array.from({ length: Math.ceil(codes.length / COLUMNS) }, (_, row) => codes.slice(row * COLUMNS, row * COLUMNS + COLUMNS))
}

/** The first and last code point a page assigns, as the range label shows them.
 * @param {number[]} codes @param {Map<number, string>} assigned */
export function pageRange(codes, assigned) {
  const used = codes.filter(code => assigned.has(code))
  return used.length ? rangeText(used[0], used[used.length - 1]) : ''
}

/** One share of a whole, to one decimal. @param {number} part @param {number} total */
export const percentOf = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0)

/** @param {number} part @param {number} total */
export const percentText = (part, total) => `${percentOf(part, total).toFixed(1)}%`

/** The 914 characters and 51 radicals as one bar, radicals first. @param {number} characters @param {number} radicals */
export function inventoryRows(characters, radicals) {
  const total = characters + radicals
  return [
    { key: 'radicals', count: radicals, percent: percentText(radicals, total), share: `${(radicals / total) * 100}%` },
    { key: 'characters', count: characters, percent: percentText(characters, total), share: `${(characters / total) * 100}%` },
  ]
}

/** Each block's assigned code points against the positions Unicode reserves. @param {Map<number, string>} assigned */
export function blockRows(assigned) {
  return BLOCKS.map(block => {
    let count = 0
    for (const code of assigned.keys()) if (code >= block.start && code <= block.end) count++
    return { ...block, count, total: block.end - block.start + 1, percent: percentText(count, block.end - block.start + 1) }
  })
}

/** The radicals that hold the most characters, most used first. @param {string[]} radicals @param {Map<number, string[]>} byRadical @param {number} [limit] */
export function topRadicals(radicals, byRadical, limit = 5) {
  return radicals
    .map((char, index) => ({ char, number: index + 1, count: byRadical.get(index + 1)?.length ?? 0 }))
    .sort((a, b) => b.count - a.count || a.number - b.number)
    .slice(0, limit)
}

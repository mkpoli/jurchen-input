// The finders that read the records directly: stroke codes, code points and numerals. Readings live
// in reading.js and drawings in shape.js.
import { ix } from './index.js'
import { clusters, variantOf, hex } from './script.js'

/** @typedef {{ char: string, code: string }} CodeHit */

/**
 * Sequences whose stroke code begins with the typed letters: the exact code first, then shorter
 * codes, then by code, each by code point within its code.
 * @param {string} letters
 * @param {{ variants?: boolean }} [options] variants: false keeps to base forms and radicals
 * @returns {CodeHit[]}
 */
export function byCode(letters, options = {}) {
  const typed = letters.toLowerCase().replace(/[^hspdzb]/g, '')
  if (!typed) return []
  const list = ix.codeList
  let low = 0, high = list.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (list[mid][0] < typed) low = mid + 1
    else high = mid
  }
  /** @type {CodeHit[]} */
  const hits = []
  for (let i = low; i < list.length && list[i][0].startsWith(typed); i++) {
    if (options.variants === false && variantOf(list[i][1])) continue
    hits.push({ char: list[i][1], code: list[i][0] })
  }
  const rank = (/** @type {string} */ code) => (code === typed ? 0 : 1000) + code.length
  return hits.sort((a, b) => rank(a.code) - rank(b.code) || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
}

/** The letters that can follow the typed ones, with how many codes each leads to. @param {string} typed */
export function nextLetters(typed) {
  /** @type {Map<string, number>} */
  const counts = new Map()
  for (const [code] of ix.codeList) {
    if (code.length > typed.length && code.startsWith(typed)) counts.set(code[typed.length], (counts.get(code[typed.length]) ?? 0) + 1)
  }
  return counts
}

/** Base characters and radicals by code point: `U+18E01`, `18E01` or leading digits. @param {string} query @returns {string[]} */
export function byCodePoint(query) {
  const digits = query.trim().replace(/^u\+?/i, '').toUpperCase()
  if (!/^[0-9A-F]{3,5}$/.test(digits)) return []
  return [...ix.forms.keys()].filter(char => hex(char.codePointAt(0) ?? 0).startsWith(digits))
    .sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0))
}

/** The character for a number, when Unicode gives one that value. @param {string} query @returns {string[]} */
export function byNumber(query) {
  const value = /^[0-9]{1,5}$/.test(query.trim()) ? ix.numerals.get(Number(query.trim())) : undefined
  return value ? [value] : []
}

/**
 * Characters by a reference from before Unicode 18: `X-0005`, a Jin 1984 entry as `002-04` or
 * `NC:002.04`, or a private-use code point as `U+E004` or `F1C72`.
 * @param {string} query
 * @returns {string[]}
 */
export function byReference(query) {
  const text = query.trim().toUpperCase().replace(/^U\+/, '')
  const key = /^NC:\d+\.\d+$/.test(text) ? text.slice(3).replace('.', '-') : /^X-?\d{4}$/.test(text) ? `X-${text.slice(-4)}` : text
  return ix.references.get(key) ?? []
}

/** The characters in a piece of text, each once, in order. @param {string} text */
export const jurchenIn = text => [...new Set(clusters(text))]

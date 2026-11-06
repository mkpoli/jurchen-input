// Convert Jurchen text between Unicode 18 and the Private Use encodings it was stored in before.
// Text that is not Jurchen passes through unchanged, and so does any code with no known character.
import { BABELSTONE, BABELSTONE_BY_FONT, CCAMC, ZHONGHUA_ZIKU } from './legacy-map.js'

/** @typedef {'toyo' | 'tianyige'} BabelStoneFont */
/** @typedef {{ font?: BabelStoneFont }} BabelStoneOptions */
/** @typedef {{ babelstone?: boolean, ccamc?: boolean, font?: BabelStoneFont }} UnicodeOptions */
/**
 * @typedef {{ unicode: number, variants: number, babelstone: number, zhzk: number, ccamc: number, unknown: string[], fontSpecific: string[] }} Analysis
 * `unknown` lists each Private Use character with no table entry, once; `fontSpecific` the
 * BabelStone code points whose character depends on the font.
 */

const FROM_BABELSTONE = new Map(BABELSTONE)
const FROM_ZHZK = new Map(ZHONGHUA_ZIKU)
const FROM_CCAMC = new Map(CCAMC)

/** The first code point written for each character, so a conversion round-trips to one form. @param {[number, number][]} pairs */
function reverse(pairs) {
  /** @type {Map<number, number>} */
  const table = new Map()
  for (const [legacy, unicode] of pairs) if (!table.has(unicode)) table.set(unicode, legacy)
  return table
}

const TO_BABELSTONE = reverse(BABELSTONE)
const TO_ZHZK = reverse(ZHONGHUA_ZIKU)
const TO_CCAMC = reverse(CCAMC)

const BMP_PUA = /[-]/g
const SMP_PUA = /[\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu
const ANY_PUA = /[-\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu
const JURCHEN = /[\u{18E00}-\u{19191}\u{191A0}-\u{191D2}]/u
const JURCHEN_RUN = /[\u{18E00}-\u{19191}\u{191A0}-\u{191D2}][\uFE00-\uFE04]?/gu

/**
 * Read BabelStone's Private Use code points. U+E6F4 draws two characters and stays unless `font`
 * says which font the text was set in.
 * @param {string} text
 * @param {BabelStoneOptions} [options]
 */
export function fromBabelStone(text, options = {}) {
  return text.replace(BMP_PUA, char => {
    const code = /** @type {number} */ (char.codePointAt(0))
    const byFont = BABELSTONE_BY_FONT[code]
    const unicode = byFont ? options.font && byFont[options.font] : FROM_BABELSTONE.get(code)
    return unicode ? String.fromCodePoint(unicode) : char
  })
}

/**
 * Read the Zhonghua Ziku font's Private Use code points.
 * @param {string} text
 */
export function fromZhonghuaZiku(text) {
  return text.replace(SMP_PUA, char => {
    const unicode = FROM_ZHZK.get(/** @type {number} */ (char.codePointAt(0)))
    return unicode ? String.fromCodePoint(unicode) : char
  })
}

/**
 * Read CCAMC's Private Use code points for Jurchen, U+EC9A to U+F27C. Its fonts keep Khitan below
 * that range, which stays as it is.
 * @param {string} text
 */
export function fromCcamc(text) {
  return text.replace(BMP_PUA, char => {
    const unicode = FROM_CCAMC.get(/** @type {number} */ (char.codePointAt(0)))
    return unicode ? String.fromCodePoint(unicode) : char
  })
}

/**
 * Convert to Unicode 18. Zhonghua Ziku's plane holds nothing else that this table could be mistaken
 * for, so it is always read. U+E000–U+F8FF is shared with other fonts, among them old Hangul's, so
 * BabelStone's and CCAMC's codes are read only when asked for.
 * @param {string} text
 * @param {UnicodeOptions} [options]
 */
export function toUnicode(text, options = {}) {
  let read = fromZhonghuaZiku(text)
  if (options.ccamc) read = fromCcamc(read)
  return options.babelstone ? fromBabelStone(read, { font: options.font }) : read
}

/** @param {string} text @param {Map<number, number>} table */
function write(text, table) {
  return text.replace(JURCHEN_RUN, run => {
    const code = /** @type {number} */ (run.codePointAt(0))
    const legacy = table.get(code)
    return legacy ? String.fromCodePoint(legacy) : run
  })
}

/**
 * Write BabelStone's code points. A variant selector goes with the character it follows, and a
 * character with no code stays as Unicode, with its selector.
 * @param {string} text
 */
export const toBabelStone = text => write(text, TO_BABELSTONE)

/**
 * Write the Zhonghua Ziku font's code points. A variant selector goes with the character it follows,
 * and a character with no code stays as Unicode, with its selector.
 * @param {string} text
 */
export const toZhonghuaZiku = text => write(text, TO_ZHZK)

/**
 * Write CCAMC's code points. A variant selector goes with the character it follows, and a character
 * with no code stays as Unicode, with its selector.
 * @param {string} text
 */
export const toCcamc = text => write(text, TO_CCAMC)

/** Remove Alari's variant selectors, leaving the base characters. @param {string} text */
export const stripVariants = text => text.replace(/([\u{18E00}-\u{19191}])[︀-︄]/gu, '$1')

/**
 * Count what a text is written with, and list the Private Use characters it cannot read.
 * @param {string} text
 * @returns {Analysis}
 */
export function analyze(text) {
  /** @type {Analysis} */
  const found = { unicode: 0, variants: 0, babelstone: 0, zhzk: 0, ccamc: 0, unknown: [], fontSpecific: [] }
  const chars = [...text]
  chars.forEach((char, i) => {
    if (JURCHEN.test(char)) {
      found.unicode++
      if (/[︀-︄]/.test(chars[i + 1] ?? '')) found.variants++
    }
  })
  /** @type {Set<string>} */
  const unknown = new Set()
  /** @type {Set<string>} */
  const fontSpecific = new Set()
  for (const [char] of text.matchAll(ANY_PUA)) {
    const code = /** @type {number} */ (char.codePointAt(0))
    if (FROM_BABELSTONE.has(code)) found.babelstone++
    else if (BABELSTONE_BY_FONT[code]) { found.babelstone++; fontSpecific.add(char) }
    else if (FROM_ZHZK.has(code)) found.zhzk++
    else if (FROM_CCAMC.has(code)) found.ccamc++
    else unknown.add(char)
  }
  found.unknown = [...unknown]
  found.fontSpecific = [...fontSpecific]
  return found
}

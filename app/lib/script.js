// What a Jurchen character is in text: one code point, or one with the variation selector that
// picks a variant form. Everything here is pure.

const CHAR = '[\\u{18E00}-\\u{19191}\\u{191A0}-\\u{191D2}][\\uFE00-\\uFE04]?'
const ONE = new RegExp(`^${CHAR}$`, 'u')
const LAST = new RegExp(`${CHAR}$`, 'u')

/** A character, radical or variant sequence. @param {string} text */
export const isJurchen = text => ONE.test(text)

/** The characters in a piece of text, in order, a variant sequence as one. @param {string} text @returns {string[]} */
export const clusters = text => text.match(new RegExp(CHAR, 'gu')) ?? []

/** The characters in a piece of text with where each begins. @param {string} text */
export const clustersAt = text => [...text.matchAll(new RegExp(CHAR, 'gu'))].map(match => ({ char: match[0], start: match.index, end: match.index + match[0].length }))

/** The character ending a piece of text, or nothing. @param {string} text */
export const lastCluster = text => text.match(LAST)?.[0] ?? ''

/** The character without its selector. @param {string} seq */
export const baseOf = seq => String.fromCodePoint(seq.codePointAt(0) ?? 0)

/** A variant's number, 1 to 5; 0 for the base form. @param {string} seq */
export function variantOf(seq) {
  const selector = [...seq][1]
  return selector ? (selector.codePointAt(0) ?? 0xFDFF) - 0xFDFF : 0
}

/** @param {string} seq */
export const isRadical = seq => {
  const code = seq.codePointAt(0) ?? 0
  return code >= 0x191A0 && code <= 0x191D2
}

/** @param {number} code */
export const hex = code => code.toString(16).toUpperCase()

/** Every code point of a sequence, `U+18E01 U+FE00`. @param {string} seq */
export const codePoint = seq => [...seq].map(c => `U+${hex(c.codePointAt(0) ?? 0)}`).join(' ')

/** The form a sequence takes in an address: `18E01` or `18E01-FE00`. @param {string} seq */
export const toParam = seq => [...seq].map(c => hex(c.codePointAt(0) ?? 0)).join('-')

/** @param {string} param @returns {string} a sequence, or nothing for an address that names none */
export function fromParam(param) {
  if (!/^[0-9a-f]{5}(-fe0[0-4])?$/i.test(param)) return ''
  const seq = param.split('-').map(part => String.fromCodePoint(parseInt(part, 16))).join('')
  return isJurchen(seq) ? seq : ''
}

/**
 * A source reference as JurchenSources.txt writes it, taken apart: `NC:002.02` is page 2, entry 2 of
 * Jin Qizong's dictionary; `SJ-B:007A.1` folio 7A, place 1 of the Berlin copy of the Sino-Jurchen
 * Vocabulary; `JJ:363` page 363 of Jin and Jin 1980; `N5131:X-1378` an entry of WG2 N5131.
 * @param {string} reference
 * @returns {{ key: string, params: Record<string, string> }}
 */
export function readSource(reference) {
  const [work, place] = reference.split(':')
  if (work === 'NC') {
    // A few entries run over a page: `NC:043.09,044.01`.
    const parts = place.split(',').map(part => part.split('.'))
    const [page, entry] = parts[0]
    if (parts.length === 1) return { key: 'nc', params: { page: String(Number(page)), entry: String(Number(entry)) } }
    return { key: 'ncRun', params: { page: String(Number(page)), entry: String(Number(entry)), endPage: String(Number(parts[1][0])), endEntry: String(Number(parts[1][1])) } }
  }
  if (work === 'SJ-B') {
    const [folio, position] = place.split('.')
    return { key: 'sj', params: { folio: folio.replace(/^0+/, ''), position } }
  }
  if (work === 'JJ') return { key: 'jj', params: { page: place } }
  return { key: 'n5131', params: { entry: place } }
}

/** The character the site's mark and blank card show: U+18E01, tumən, ten thousand. */
export const MARK = '\u{18E01}'

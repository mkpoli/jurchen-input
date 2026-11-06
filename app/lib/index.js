// The records indexed for each way of finding a character. Plain objects, filled once.
import { baseOf, variantOf, isRadical } from './script.js'
import { foldReading } from './reading.js'

/** @typedef {{ char: string, radical: number, strokes: number, source: string, reading: string, numeric: number | null }} Entry */
/** References from before Unicode 18, each list space-separated. @typedef {{ jin1984: string[], xrefs: string[], babelstone: string[], zhzk: string[], ccamc: string[], draft: string[] }} Encodings */
/** @typedef {{ unicode: string, table: { name: string, version: string, sha256: string }, rows: [string, number, number, string, string | null, number | null][], radicals: string[], codes: [string, string][], origins: [string, string, string, string][], encodings: [string, string, string, string, string, string, string][] }} Records */
/** What a source says about where a character comes from. @typedef {{ relation: string, source: string, work: string }} Origin */

export const ix = {
  /** @type {Map<string, Entry>} */ entries: new Map(),
  /** Each sequence's stroke code. @type {Map<string, string>} */ codes: new Map(),
  /** Every [code, sequence] pair, ordered by code, then by character and variant. @type {[string, string][]} */ codeList: [],
  /** The forms of a character, its base form first. @type {Map<string, string[]>} */ forms: new Map(),
  /** The readings. @type {import('./reading.js').Reading[]} */ readings: [],
  /** The radicals, numbered from 1. @type {string[]} */ radicals: [],
  /** The characters under each radical number. @type {Map<number, string[]>} */ byRadical: new Map(),
  /** Stroke counts by sequence, a variant taking its base's. @type {Map<string, number>} */ strokes: new Map(),
  /** The numerals. @type {Map<number, string>} */ numerals: new Map(),
  /** Each character's references from before Unicode 18. @type {Map<string, Encodings>} */ encodings: new Map(),
  /** The characters each of those references names. @type {Map<string, string[]>} */ references: new Map(),
  /** What the sources say about each character's origin. @type {Map<string, Origin[]>} */ origins: new Map(),
}

const order = (/** @type {string} */ a, /** @type {string} */ b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0) || variantOf(a) - variantOf(b)

/** @param {Records} records */
export function fill(records) {
  ix.entries = new Map(records.rows.map(([char, radical, strokes, source, reading, numeric]) => [char, { char, radical, strokes, source, reading: reading ?? '', numeric }]))
  ix.radicals = records.radicals
  ix.codes = new Map(records.codes)
  ix.codeList = records.codes.map(([seq, code]) => /** @type {[string, string]} */ ([code, seq]))
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : order(a[1], b[1])))
  ix.forms = new Map()
  for (const [seq] of records.codes) {
    const base = baseOf(seq)
    ix.forms.set(base, [...(ix.forms.get(base) ?? []), seq])
  }
  for (const list of ix.forms.values()) list.sort(order)
  ix.readings = [...ix.entries.values()].filter(entry => entry.reading).map(entry => ({ char: entry.char, raw: entry.reading, folded: foldReading(entry.reading) }))
  ix.origins = new Map()
  for (const [char, relation, source, work] of records.origins) ix.origins.set(char, [...(ix.origins.get(char) ?? []), { relation, source, work }])
  ix.byRadical = new Map()
  ix.numerals = new Map()
  ix.strokes = new Map()
  for (const entry of ix.entries.values()) {
    ix.byRadical.set(entry.radical, [...(ix.byRadical.get(entry.radical) ?? []), entry.char])
    if (entry.numeric !== null) ix.numerals.set(entry.numeric, entry.char)
    for (const seq of ix.forms.get(entry.char) ?? [entry.char]) ix.strokes.set(seq, entry.strokes)
  }
  ix.encodings = new Map()
  ix.references = new Map()
  const list = (/** @type {string} */ text) => (text ? text.split(' ') : [])
  for (const [char, jin1984, xrefs, babelstone, zhzk, ccamc, draft] of records.encodings) {
    const encodings = { jin1984: list(jin1984), xrefs: list(xrefs), babelstone: list(babelstone), zhzk: list(zhzk), ccamc: list(ccamc), draft: list(draft) }
    ix.encodings.set(char, encodings)
    // A draft code point is not indexed: it falls in the same block as the final ones.
    for (const reference of [...encodings.jin1984, ...encodings.xrefs, ...encodings.babelstone, ...encodings.zhzk, ...encodings.ccamc]) {
      const key = reference.replace(/\(.*\)$/, '')
      ix.references.set(key, [...(ix.references.get(key) ?? []), char])
    }
  }
}

/** The radical's number, when a sequence is one. @param {string} seq */
export const radicalNumber = seq => (isRadical(seq) ? (seq.codePointAt(0) ?? 0) - 0x191A0 + 1 : 0)

/** The record of a sequence's character. @param {string} seq */
export const entryOf = seq => ix.entries.get(baseOf(seq))

/** What a tile says under a character: its reading. @param {string} seq */
export const readingOf = seq => entryOf(seq)?.reading ?? ''

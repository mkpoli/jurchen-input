// A chart of the readings that are one syllable, split into an initial and a rime as the kana chart
// splits its syllables. The split is this site's reading of Jin Qizong's transcription, with his
// spellings kept as they are.

/** @typedef {{ initial: string, rime: string }} Syllable */
/** @typedef {'open' | 'glide' | 'n' | 'ng' | 'other'} RimeGroup */
/** @typedef {{ char: string, raw: string }} Cell */

const VOWELS = 'aəeɛiïouy'
const VOWEL_RUN = new RegExp(`[${VOWELS}]+`, 'g')

/** Initials in order of where they are made, so the rows read like a chart. Anything else follows. */
const INITIALS = ['', 'b', 'p', 'm', 'f', 'w', 'd', 't', 'n', 'l', 'lx', 'r', 'dz', 's', 'dʒ', 'tʃ', 'ʃ', 'ʒ', 'dʑ', 'tç', 'tɕ', 'ç', 'j', 'g', 'k', 'x', 'ŋg']

/** @param {string} word @returns {Syllable | null} one syllable, or nothing for a word of more */
function split(word) {
  const runs = word.match(VOWEL_RUN) ?? []
  if (runs.length > 1) return null
  // A reading of no vowel at all, such as r, is its own rime.
  if (!runs.length) return { initial: '', rime: word }
  const at = word.indexOf(/** @type {string} */ (runs[0]))
  return { initial: word.slice(0, at), rime: word.slice(at) }
}

/**
 * The syllables a reading stands for, or none when it is a word of two or more. `ŋi, gi` is two
 * readings of one character, and `(g)an` an initial written as optional, charted under that initial.
 * @param {string} raw
 * @returns {Syllable[]}
 */
export function syllablesOf(raw) {
  const words = raw.split(', ')
  if (words.some(word => /[ .]/.test(word))) return []
  const found = words.map(word => split(word.replace(/[()]/g, '')))
  return found.every(Boolean) ? /** @type {Syllable[]} */ (found) : []
}

/** Which column group a rime stands in. @param {string} rime @returns {RimeGroup} */
export function rimeGroup(rime) {
  const vowels = rime.match(VOWEL_RUN)?.[0] ?? ''
  const coda = rime.slice(vowels.length)
  if (!vowels || (coda && !['n', 'ŋ'].includes(coda))) return 'other'
  if (coda === 'n') return 'n'
  if (coda === 'ŋ') return 'ng'
  return vowels.length > 1 ? 'glide' : 'open'
}

/** @param {string} rime */
const rimeOrder = rime => [...rime].map(char => {
  const at = VOWELS.indexOf(char)
  return String.fromCharCode(at < 0 ? 200 + (char.codePointAt(0) ?? 0) % 100 : 100 + at)
}).join('')

/**
 * Lay the readings out by initial and rime.
 * @param {{ char: string, raw: string }[]} readings
 * @returns {{ initials: string[], rimes: string[], cells: Map<string, Cell[]>, charted: number, longer: number }}
 */
export function buildChart(readings) {
  /** @type {Map<string, Cell[]>} */
  const cells = new Map()
  const initials = new Set()
  const rimes = new Set()
  let charted = 0
  let longer = 0
  for (const { char, raw } of readings) {
    const syllables = syllablesOf(raw)
    if (!syllables.length) { longer++; continue }
    charted++
    for (const { initial, rime } of syllables) {
      initials.add(initial)
      rimes.add(rime)
      const key = cellKey(initial, rime)
      cells.set(key, [...(cells.get(key) ?? []), { char, raw }])
    }
  }
  const rank = (/** @type {string} */ initial) => {
    const at = INITIALS.indexOf(initial)
    return at < 0 ? INITIALS.length : at
  }
  return {
    initials: /** @type {string[]} */ ([...initials]).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)),
    rimes: /** @type {string[]} */ ([...rimes]).sort((a, b) => (rimeOrder(a) < rimeOrder(b) ? -1 : 1)),
    cells,
    charted,
    longer,
  }
}

/** @param {string} initial @param {string} rime */
export const cellKey = (initial, rime) => `${initial}|${rime}`

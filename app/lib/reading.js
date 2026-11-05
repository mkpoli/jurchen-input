// Reading search over the one system Unicode records: the readings of Jin Qizong's dictionary,
// written in IPA-like letters. A reader rarely has ʃ or ə to hand, so readings and queries are both
// folded to plain letters: ə is typed e, ʃ s or sh, dʒ j or zh, tʃ c or ch, ŋ ng, ï i, x and ç h.

/** @typedef {{ char: string, raw: string, folded: string }} Reading */
/** @typedef {{ char: string, raw: string, tier: number }} ReadingHit */

export const TIERS = /** @type {const} */ (['exact', 'begins', 'within'])

/** @param {string} text */
const common = text => text.toLowerCase().normalize('NFC')
  .replace(/dʒ/g, 'J').replace(/tʃ/g, 'C').replace(/ʃ|ɕ/g, 's').replace(/ʒ|ʑ/g, 'J').replace(/ə|ɛ/g, 'e').replace(/ï/g, 'i')
  .replace(/ŋ/g, 'ng').replace(/[xç]/g, 'h').replace(/[\s.()'’·-]/g, '')

/** A reading as the search holds it. The source's j is /j/, kept apart from dʒ as y. @param {string} raw */
export const foldReading = raw => common(raw).replace(/j/g, 'y').toLowerCase()

/** What a reader typed, folded the same way. @param {string} text */
export const foldQuery = text => common(text).replace(/zh/g, 'j').replace(/ch/g, 'c').replace(/sh/g, 's').replace(/x/g, 'h').toLowerCase()

/** @param {Reading[]} readings @param {string} query @returns {ReadingHit[]} */
export function searchReadings(readings, query) {
  const raw = common(query)
  const folded = foldQuery(query)
  if (!folded) return []
  /** @type {ReadingHit[]} */
  const hits = []
  for (const reading of readings) {
    const own = common(reading.raw)
    const tier = own === raw || reading.folded === folded ? 0
      : reading.folded.startsWith(folded) ? 1
        : reading.folded.includes(folded) ? 2 : -1
    if (tier >= 0) hits.push({ char: reading.char, raw: reading.raw, tier })
  }
  return hits.sort((a, b) => a.tier - b.tier || a.raw.length - b.raw.length || (a.char.codePointAt(0) ?? 0) - (b.char.codePointAt(0) ?? 0))
}

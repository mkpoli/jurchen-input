// The text being written: one per browser, kept in local storage. Every finder inserts into it at
// the caret, so a character can be found by any method and land in the same place.
import { ix } from './index.js'
import { baseOf, clusters, codePoint, lastCluster } from './script.js'

const KEY = 'jurchen-input:text'

export const text = $state({
  value: (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || '',
  /** The caret, remembered while focus is elsewhere. */
  start: -1,
  end: -1,
})

/** Every field that holds this text. @type {Set<HTMLTextAreaElement>} */
const fields = new Set()
/** The field an insertion follows: the focused one, else the last one attached. @type {HTMLTextAreaElement | null} */
let last = null

/** A field for this text registers itself so insertions follow its caret. @param {HTMLTextAreaElement} element */
export function attach(element) {
  fields.add(element)
  last = element
}

/** @param {HTMLTextAreaElement} element */
export function detach(element) {
  fields.delete(element)
  if (last === element) last = null
}

/** @returns {HTMLTextAreaElement | null} */
function field() {
  const focused = /** @type {HTMLElement | null} */ (document.activeElement)
  return focused instanceof HTMLTextAreaElement && fields.has(focused) ? focused : last
}

function save() {
  try { localStorage.setItem(KEY, text.value) } catch { /* storage may be full or blocked */ }
}

/** @param {string} value */
export function setText(value) {
  text.value = value
  save()
}

/** Remember the caret of the writing field. */
export function remember() {
  const element = field()
  if (!element) return
  text.start = element.selectionStart
  text.end = element.selectionEnd
}

/** Insert at the caret (the end, when the caret was never placed). @param {string} chars */
export function insert(chars) {
  const length = text.value.length
  const start = text.start < 0 || text.start > length ? length : text.start
  const end = text.end < 0 || text.end > length ? length : Math.max(start, text.end)
  text.value = text.value.slice(0, start) + chars + text.value.slice(end)
  text.start = text.end = start + chars.length
  save()
  const element = field()
  if (element) {
    const at = text.start
    queueMicrotask(() => element.setSelectionRange(at, at))
  }
}

/** Delete the character before the caret, a variant sequence as one, as Backspace in an empty code box does. */
export function backspace() {
  const start = text.start < 0 ? text.value.length : text.start
  // A selection is what goes, and nothing before it.
  if (text.end > start) {
    text.value = text.value.slice(0, start) + text.value.slice(text.end)
    text.end = start
    save()
    return
  }
  const before = text.value.slice(0, start)
  if (!before) return
  const removed = lastCluster(before) || ([...before].at(-1) ?? '')
  text.value = text.value.slice(0, start - removed.length) + text.value.slice(start)
  text.start = text.end = start - removed.length
  save()
}

/** The text as code points. @param {string} value */
export const asCodePoints = value => clusters(value).map(codePoint).join(' ')

/** The text as stroke codes, a character without a code shown as its code point. @param {string} value */
export const asCodes = value => clusters(value).map(char => ix.codes.get(char) ?? codePoint(char)).join(' ')

/** The text with every variant sequence put back to its base character. @param {string} value */
export const withoutSelectors = value => value.replace(/[\uFE00-\uFE04]/g, '')

/** The text as readings, a character without one shown as its code point. @param {string} value */
export const asReadings = value => clusters(value).map(char => ix.entries.get(baseOf(char))?.reading || codePoint(baseOf(char))).join(' ')

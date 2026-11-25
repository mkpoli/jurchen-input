// What each page says about itself outside the page: the title a tab and a search result show, the
// one-line description under it, and the address the page answers at. The worker reads this to
// answer a crawler without running the app, and the app reads it to keep the head in step when a
// reader moves between finders without a page load.

export const SITE = { name: 'Jurchen Input', url: 'https://jurchen.mkpo.li' }

/** @type {Record<string, { title: string, description: string }>} */
export const PAGE_SEO = {
  '': {
    title: 'Jurchen Input — look up a Jurchen character',
    description: 'Find a Jurchen character from Unicode 18 by its stroke code, its reading, its radical or the shape you draw, and enter it with its variant forms.',
  },
  strokes: {
    title: 'Strokes — Jurchen Input',
    description: 'Type the first four strokes and the last stroke of a Jurchen character and pick it from numbered candidates, variant forms included.',
  },
  draw: {
    title: 'Draw — Jurchen Input',
    description: 'Sketch a Jurchen character on the pad and see the glyphs closest to it in shape.',
  },
  radicals: {
    title: 'Radicals — Jurchen Input',
    description: 'Browse the 914 Jurchen characters of Unicode 18 under their 51 radicals, by stroke count.',
  },
  codes: {
    title: 'Code chart — Jurchen Input',
    description: 'Every Jurchen character and radical by Unicode code point, with block occupancy and radical counts.',
  },
  reading: {
    title: 'Reading — Jurchen Input',
    description: 'Type a reading from Jin Qizong’s Jurchen dictionary, with or without phonetic letters, and see the characters read so.',
  },
  syllables: {
    title: 'Syllables — Jurchen Input',
    description: 'The Jurchen characters with one-syllable readings, laid out like a kana chart by initial and rime.',
  },
  transcribe: {
    title: 'Transcribe — Jurchen Input',
    description: 'Read a piece of Jurchen text character by character, with the reading of each one under it.',
  },
  convert: {
    title: 'Convert — Jurchen Input',
    description: 'Turn Jurchen text in the Private Use codes of older fonts into Unicode 18, and back, using tables drawn from the encoding proposals.',
  },
  khitan: {
    title: 'Khitan and Jurchen — Jurchen Input',
    description: 'Nine Jurchen characters set beside their Khitan large script forms, and what the sources say of the four directions.',
  },
  about: {
    title: 'Sources — Jurchen Input',
    description: 'Where every record on Jurchen Input comes from: Unicode 18.0’s JurchenSources.txt and Alari’s font and stroke table.',
  },
}

/**
 * The page a pathname names, or null when no page answers there. A trailing slash is the same page.
 * @param {string} path a pathname
 * @returns {string | null}
 */
export function pageOf(path) {
  const clean = path.replace(/^\/+|\/+$/g, '')
  return Object.hasOwn(PAGE_SEO, clean) ? clean : null
}

/** The title, description and canonical address of a page. @param {string} page */
export function seoOf(page) {
  const entry = Object.hasOwn(PAGE_SEO, page) ? PAGE_SEO[page] : PAGE_SEO['']
  return { ...entry, url: `${SITE.url}/${page}` }
}

/**
 * Put a page's title, description and canonical address into the document.
 * @param {string} page
 */
export function applySeo(page) {
  if (typeof document === 'undefined') return
  const { title, description, url } = seoOf(page)
  document.title = title
  /** @param {string} selector @param {string} value @param {string} [attribute] @param {() => HTMLElement} [create] */
  const set = (selector, value, attribute = 'content', create) => {
    let element = document.head.querySelector(selector)
    if (!element && create) {
      element = create()
      document.head.appendChild(element)
    }
    element?.setAttribute(attribute, value)
  }
  document.head.querySelector('meta[name="robots"]')?.remove()
  set('meta[name="description"]', description)
  set('link[rel="canonical"]', url, 'href', () => {
    const link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    return link
  })
  set('meta[property="og:title"]', title)
  set('meta[property="og:description"]', description)
  set('meta[property="og:url"]', url, 'content', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('property', 'og:url')
    return meta
  })
}

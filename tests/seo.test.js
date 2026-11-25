import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { PAGE_SEO, SITE, applySeo, pageOf, seoOf } from '../app/lib/seo.js'

const read = (/** @type {string} */ path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('page SEO', () => {
  test('gives every page its own title, description and address', () => {
    const entries = Object.keys(PAGE_SEO).map(page => seoOf(page))
    for (const key of ['title', 'description', 'url'])
      expect(new Set(entries.map(entry => entry[key])).size, key).toBe(entries.length)
    expect(seoOf('radicals')).toMatchObject({ title: 'Radicals — Jurchen Input', url: `${SITE.url}/radicals` })
    expect(seoOf('').url).toBe(`${SITE.url}/`)
  })
  test('names the page a path belongs to', () => {
    expect(pageOf('/')).toBe('')
    expect(pageOf('/radicals')).toBe('radicals')
    expect(pageOf('/radicals/')).toBe('radicals')
    expect(pageOf('//about')).toBe('about')
    for (const path of ['/nope', '/radicals/extra', '/toString', '/__proto__']) expect(pageOf(path), path).toBeNull()
  })
  test('covers the pages the router knows and nothing else', () => {
    const routes = [...read('app/lib/route.svelte.js').matchAll(/path: '([a-z]*)'/g)].map(match => match[1])
    expect(new Set(Object.keys(PAGE_SEO))).toEqual(new Set([...routes, 'about']))
  })
  test('runs the worker first for every page path so navigations get its head', () => {
    const config = JSON.parse(read('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, ''))
    const first = new Set(config.assets.run_worker_first)
    for (const page of Object.keys(PAGE_SEO)) {
      expect(first.has(`/${page}`), `/${page}`).toBe(true)
      if (page) expect(first.has(`/${page}/`), `/${page}/`).toBe(true)
    }
  })
  test('restores canonical and og:url and clears noindex after navigating from a 404', () => {
    const nodes = [
      { tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } },
      { tag: 'meta', attrs: { name: 'description', content: '' } },
      { tag: 'meta', attrs: { property: 'og:title', content: '' } },
      { tag: 'meta', attrs: { property: 'og:description', content: '' } },
    ]
    const wrap = (/** @type {{ tag: string, attrs: Record<string, string> }} */ node) => ({
      setAttribute(/** @type {string} */ k, /** @type {string} */ v) { node.attrs[k] = v },
      remove() { const i = nodes.indexOf(node); if (i >= 0) nodes.splice(i, 1) },
    })
    const prev = globalThis.document
    const doc = /** @type {any} */ ({
      title: '',
      createElement: (/** @type {string} */ tag) => { const n = { tag, attrs: {} }; return Object.assign(wrap(n), { _node: n }) },
      head: {
        querySelector(/** @type {string} */ sel) {
          const m = /^(meta|link)\[(\w+)="([^"]+)"\]$/.exec(sel)
          const found = m && nodes.find(n => n.tag === m[1] && n.attrs[m[2]] === m[3])
          return found ? wrap(found) : null
        },
        appendChild(/** @type {{ _node: { tag: string, attrs: Record<string, string> } }} */ el) { nodes.push(el._node) },
      },
    })
    Object.defineProperty(globalThis, 'document', { value: doc, configurable: true, writable: true })
    try {
      applySeo('radicals')
      expect(nodes.some(n => n.attrs.name === 'robots')).toBe(false)
      expect(nodes.find(n => n.attrs.rel === 'canonical')?.attrs.href).toBe('https://jurchen.mkpo.li/radicals')
      expect(nodes.find(n => n.attrs.property === 'og:url')?.attrs.content).toBe('https://jurchen.mkpo.li/radicals')
    } finally {
      Object.defineProperty(globalThis, 'document', { value: prev, configurable: true, writable: true })
    }
  })
})

describe('served head', () => {
  const html = read('app/index.html')
  test('holds the tags the worker rewrites', () => {
    for (const tag of ['<title>', '<meta name="description"', '<link rel="canonical"', '<meta property="og:title"', '<meta property="og:description"', '<meta property="og:url"'])
      expect(html).toContain(tag)
  })
  test('describes the finder as the page SEO does', () => {
    const { title, description, url } = seoOf('')
    expect(html).toContain(`<title>${title}</title>`)
    expect(html).toContain(`<meta name="description" content="${description}">`)
    expect(html).toContain(`<link rel="canonical" href="${url}">`)
  })
})

describe('crawler files', () => {
  test('lists every page once', () => {
    const locs = [...read('app/public/sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])
    const pages = Object.keys(PAGE_SEO).map(page => `${SITE.url}/${page}`)
    expect(new Set(locs)).toEqual(new Set(pages))
    expect(locs.length).toBe(pages.length)
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { PAGE_SEO, SITE, pageOf, seoOf } from '../app/lib/seo.js'

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

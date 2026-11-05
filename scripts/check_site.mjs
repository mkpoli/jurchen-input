// Operates the built site in Chromium: every page at a desktop and a phone width in both themes,
// the input method, variant sequences, the reading search, the drawing pad and the radical index.
// Screenshots go to shots/.
//
//   bun run build && bunx vite preview app --port 5198 &
//   SITE_URL=http://localhost:5198 bun scripts/check_site.mjs
import { chromium } from 'playwright-core'
import { strict as assert } from 'node:assert'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SITE = process.env.SITE_URL ?? 'http://localhost:5198'
const SHOTS = 'shots'
mkdirSync(SHOTS, { recursive: true })

function browserPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const cache = join(homedir(), '.cache/ms-playwright')
  for (const dir of readdirSync(cache).filter(name => name.startsWith('chromium-')).sort().reverse()) {
    for (const tail of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const path = join(cache, dir, tail)
      if (existsSync(path)) return path
    }
  }
  throw new Error('No Chromium under ~/.cache/ms-playwright; set CHROMIUM_PATH')
}

const browser = await chromium.launch({ executablePath: browserPath() })
let passed = 0
const failed = []
/** @param {string} name @param {() => Promise<void>} check */
async function step(name, check) {
  try {
    await check()
    passed++
    console.log('PASS', name)
  } catch (error) {
    failed.push(name)
    console.log('FAIL', name, '\n ', String(error).slice(0, 400))
  }
}

const PAGES = ['', 'strokes', 'draw', 'radicals?q=31', 'reading?q=tumen', 'transcribe', 'about']
const VIEWS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
]
const SAMPLE = '\u{18E00}\u{18E01}︀\u{19129}\n\u{19049}\u{18E36}'

for (const view of VIEWS) for (const scheme of /** @type {const} */ (['light', 'dark'])) {
  const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, colorScheme: scheme, deviceScaleFactor: 2, locale: 'en-US' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(String(error)))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript(sample => { localStorage.setItem('jurchen-input:text', sample) }, SAMPLE)
  for (const path of PAGES) {
    await step(`${view.name} ${scheme} /${path}`, async () => {
      await page.goto(`${SITE}/${path}${path.includes('?') ? '&' : '?'}c=18E01`, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      assert.ok(overflow <= 0, `the page is ${overflow}px wider than the screen`)
      await page.screenshot({ path: join(SHOTS, `${view.name}-${scheme}-${(path.split('?')[0] || 'find')}.png`) })
    })
  }
  assert.deepEqual(errors, [], errors.join('\n'))
  await context.close()
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US', permissions: ['clipboard-read', 'clipboard-write'] })
const page = await context.newPage()
const text = () => page.evaluate(() => localStorage.getItem('jurchen-input:text') ?? '')

await step('the font draws the block and a variant differs from its base', async () => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' })
  const result = await page.evaluate(async () => {
    await document.fonts.load('48px "Alari Xuwasun Jurchen"', '\u{18E01}︀')
    const ink = (/** @type {string} */ value, /** @type {string} */ family) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 96
      const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d', { willReadFrequently: true }))
      context.font = `64px ${family}`
      context.fillText(value, 8, 76)
      return [...context.getImageData(0, 0, 96, 96).data].join()
    }
    const family = '"Alari Xuwasun Jurchen"'
    return { has: document.fonts.check(`48px ${family}`, '\u{18E01}'), differs: ink('\u{18E01}', family) !== ink('\u{18E01}︀', family), blank: ink('\u{18E01}', family) === ink(' ', family) }
  })
  assert.deepEqual(result, { has: true, differs: true, blank: false })
})

await step('strokes: a code lists candidates, Space adds the first', async () => {
  await page.goto(`${SITE}/strokes`, { waitUntil: 'networkidle' })
  await page.locator('[data-primary]').pressSequentially('hhz')
  assert.equal(await page.locator('.ui-candidate').first().locator('.ui-script').textContent(), '\u{18E00}')
  await page.keyboard.press('Space')
  assert.equal(await text(), '\u{18E00}')
  assert.equal(await page.locator('[data-primary]').inputValue(), '')
})

await step('strokes: a digit adds a variant whole, Backspace takes it whole', async () => {
  await page.locator('[data-primary]').pressSequentially('dhpz')
  await page.waitForTimeout(50)
  assert.equal(await page.locator('.ui-candidate').first().locator('.ui-script').textContent(), '\u{18E01}︀')
  await page.screenshot({ path: join(SHOTS, 'flow-strokes-candidates.png') })
  await page.keyboard.press('1')
  assert.equal(await text(), '\u{18E00}\u{18E01}︀')
  await page.keyboard.press('Backspace')
  assert.equal(await text(), '\u{18E00}')
})

await step('strokes: a key with no continuation is dim, letters outside the five are refused', async () => {
  await page.locator('[data-primary]').pressSequentially('hxq')
  assert.equal(await page.locator('[data-primary]').inputValue(), 'h')
  await page.keyboard.press('Escape')
  await page.locator('[data-primary]').pressSequentially('hb')
  assert.equal(await page.locator('.ui-candidate').first().locator('.ui-script').textContent(), '\u{191A0}')
  assert.ok(await page.locator('.ui-key[data-dead]').count() >= 5)
  await page.keyboard.press('Escape')
})

await step('card: forms, source and number of a character', async () => {
  await page.goto(`${SITE}/?c=18E01`, { waitUntil: 'networkidle' })
  const card = await page.locator('aside.card').innerText()
  for (const expected of ['U+18E01', 'tumən', '10,000', 'Jin Qizong 1984', 'hpz', '2 forms']) assert.ok(card.toLowerCase().includes(expected.toLowerCase()), `${expected} is missing from: ${card}`)
  await page.screenshot({ path: join(SHOTS, 'flow-card.png') })
  await page.locator('aside.card .ui-tile').nth(1).click()
  assert.match(page.url(), /c=18E01-FE00/)
  assert.match(await page.locator('aside.card .cp').innerText(), /U\+18E01 U\+FE00/)
})

await step('reading: plain letters find phonetic readings', async () => {
  await page.goto(`${SITE}/reading?q=ejen`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.ui-row .said').first().textContent(), 'ədʒən')
})

await step('find: a number, a code point and pasted text', async () => {
  await page.goto(`${SITE}/?q=10000`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.ui-tile .ui-script').first().textContent(), '\u{18E01}')
  await page.goto(`${SITE}/?q=${encodeURIComponent('U+18E01')}`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.ui-tile .ui-script').first().textContent(), '\u{18E01}')
  await page.goto(`${SITE}/?q=${encodeURIComponent('\u{19049}\u{1904A}')}`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.ui-row').count(), 2)
  assert.match(await page.locator('.ui-row').first().innerText(), /əmu/)
})

await step('radicals: choosing one lists its characters', async () => {
  await page.goto(`${SITE}/radicals`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.palette .ui-tile').count(), 51)
  await page.locator('.palette .ui-tile').nth(30).click()
  assert.match(page.url(), /q=31/)
  assert.equal(await page.locator('.found .ui-tile').count(), 97)
})

await step('draw: strokes on the pad bring up candidates, and one can be added', async () => {
  await page.goto(`${SITE}/draw`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('jurchen-input:text'))
  await page.reload({ waitUntil: 'networkidle' })
  const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (await page.locator('canvas').boundingBox())
  const line = async (/** @type {number[]} */ ...at) => {
    await page.mouse.move(box.x + at[0] * box.width, box.y + at[1] * box.height)
    await page.mouse.down()
    await page.mouse.move(box.x + at[2] * box.width, box.y + at[3] * box.height, { steps: 8 })
    await page.mouse.up()
  }
  await line(.2, .3, .8, .3)
  await line(.5, .2, .5, .85)
  await page.waitForSelector('.results .ui-tile')
  assert.equal(await page.locator('.results .ui-tile').count(), 48)
  await page.screenshot({ path: join(SHOTS, 'flow-draw.png') })
  await page.locator('.results .ui-tile').first().dblclick()
  assert.ok((await text()).length >= 2)
})

await step('settings: the language switch reads the catalogue', async () => {
  for (const [lang, name] of [['ja', 'lang.ja'], ['zh-Hans', 'zh'], ['zh-Hant', 'zh'], ['ko', 'ko']]) {
    await page.goto(`${SITE}/strokes?lang=${lang}`, { waitUntil: 'networkidle' })
    assert.equal(await page.evaluate(() => document.documentElement.lang), lang, name)
    await page.screenshot({ path: join(SHOTS, `lang-${lang}-strokes.png`) })
  }
})

await browser.close()
console.log(`${passed} passed, ${failed.length} failed`)
if (failed.length) process.exit(1)

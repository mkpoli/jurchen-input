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

const PAGES = ['', 'strokes', 'draw', 'radicals?q=31', 'codes', 'reading?q=tumen', 'syllables', 'syllables?q=all', 'transcribe', `convert?q=${encodeURIComponent('\uE3C7\uE004\u{F1C72}\uE6F4\uE0DC')}`, 'about']
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
      // A phone opens a linked character as a sheet over the finder, so it visits the finder bare.
      const opened = view.name === 'phone' ? '' : `${path.includes('?') ? '&' : '?'}c=18E01`
      await page.goto(`${SITE}/${path}${opened}`, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      assert.ok(overflow <= 0, `the page is ${overflow}px wider than the screen`)
      await page.screenshot({ path: join(SHOTS, `${view.name}-${scheme}-${(path.replace(/\?q=.*/, m => (m === '?q=all' ? '-all' : '')) || 'find')}.png`) })
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
  for (const expected of ['U+18E01', 'tumən', '10,000', 'Jin Qizong 1984', 'hpz', '2 forms', 'X-0668', 'U+E004', 'U+F2134', '18E03']) assert.ok(card.toLowerCase().includes(expected.toLowerCase()), `${expected} is missing from: ${card}`)
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

await step('find: a reference from before Unicode 18', async () => {
  for (const query of ['X-0005', 'U+E004', 'U+F1C72', '002-04']) {
    await page.goto(`${SITE}/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle' })
    assert.equal(await page.locator('.ui-tile .ui-script').first().textContent(), '\u{18E01}', query)
  }
})

await step('convert: older codes become Unicode, and what cannot be read is listed', async () => {
  await page.goto(`${SITE}/convert`, { waitUntil: 'networkidle' })
  const box = page.locator('[data-primary]')
  await box.fill('a\uE3C7\uE004\u{F1C72}\uE0DC')
  assert.equal(await page.locator('output').textContent(), 'a\u{19049}\u{18E01}\u{18E01}\uE0DC')
  assert.match(await page.locator('.codes').innerText(), /U\+E0DC/)
  await page.getByRole('checkbox').first().uncheck()
  assert.equal(await page.locator('output').textContent(), 'a\uE3C7\uE004\u{18E01}\uE0DC')
  await page.getByRole('checkbox').first().check()
  await box.fill('\uE6F4')
  assert.equal(await page.locator('output').textContent(), '\uE6F4')
  await page.locator('.option select').nth(1).selectOption('toyo')
  assert.equal(await page.locator('output').textContent(), '\u{1905C}')
  await box.fill('\u{18E01}')
  await page.locator('.option select').first().selectOption('zhzk')
  assert.equal(await page.locator('output').textContent(), '\u{F1C72}')
  await page.screenshot({ path: join(SHOTS, 'flow-convert.png') })
  // A radical has no older code, so it stays and is listed.
  await box.fill('\u{191A0}')
  assert.match(await page.locator('.codes').innerText(), /U\+191A0/)
  // U+E282 is U+18F95, which has no Zhonghua Ziku code: the result cannot be complete, and says so.
  await box.fill('\uE282')
  assert.equal(await page.locator('output').textContent(), '\u{18F95}')
  assert.match(await page.locator('.codes').innerText(), /U\+18F95/)
})

await step('syllables: a reading stands at its initial and rime', async () => {
  await page.goto(`${SITE}/syllables`, { waitUntil: 'networkidle' })
  const heads = await page.locator('thead th').allInnerTexts()
  assert.deepEqual(heads.slice(0, 3), ['-a', '-ə', '-e'])
  const glyph = page.getByTitle(/^nie /)
  assert.equal(await glyph.count(), 0, 'nie is a diphthong, away from the open syllables')
  await page.getByRole('button', { name: 'Glides' }).click()
  assert.match(page.url(), /q=glide/)
  await page.getByTitle(/^nie · U\+18E00/).click()
  assert.match(page.url(), /c=18E00/)
  await page.getByRole('button', { name: 'All', exact: true }).click()
  assert.ok(await page.locator('thead th').count() > 30)
  assert.equal(await page.getByTitle(/^tumən /).count(), 0, 'a word of two syllables stays out')
})

await step('card: an origin is cited, and a character with none says so', async () => {
  await page.goto(`${SITE}/?c=18F7A`, { waitUntil: 'networkidle' })
  const card = page.locator('aside.card')
  assert.match(await card.innerText(), /Written as Chinese 日 in Jin inscriptions/)
  assert.match(await card.innerText(), /Altered from Chinese 日, keeping its meaning/)
  assert.ok(await card.locator('a[href*="chikyukotobamura"]').count() >= 2)
  await page.goto(`${SITE}/?c=18E00`, { waitUntil: 'networkidle' })
  assert.match(await page.locator('aside.card').innerText(), /No source open to this site/)
  await page.goto(`${SITE}/?c=18E01`, { waitUntil: 'networkidle' })
  assert.match(await page.locator('aside.card').innerText(), /all Jurchen numerals/)
})

await step('codes: a page starts on a code row, and a cell copies its character', async () => {
  await page.goto(`${SITE}/codes`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('aside.card').count(), 0, 'the code chart keeps the card column out')
  const radicals = page.locator('#radicals')
  assert.equal(await radicals.locator('.chart .cell').count(), 64)
  assert.equal(await radicals.locator('.chart .cell.blank').count(), 13)
  assert.match(await radicals.locator('.range').innerText(), /U\+191A0–U\+191D2/)
  const first = radicals.locator('.cell').first()
  assert.equal(await first.locator('.ui-script').textContent(), '\u{191A0}')
  await first.click()
  await page.locator('.ui-toast').waitFor()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '\u{191A0}')
  const characters = page.locator('#characters')
  assert.equal(await characters.locator('.chart .cell').count(), 256)
  assert.match(await characters.locator('.range').innerText(), /U\+18E00–U\+18EFF/)
  for (const range of ['U+18F00–U+18FFF', 'U+19000–U+190FF', 'U+19100–U+19191']) {
    await characters.getByRole('button', { name: 'Next page' }).click()
    assert.equal(await characters.locator('.range').innerText(), range)
  }
  assert.equal(await characters.locator('.chart .cell').count(), 160)
  assert.equal(await characters.locator('.chart .cell.blank').count(), 14)
  await page.screenshot({ path: join(SHOTS, 'flow-codes.png') })
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

await step('strokes: a form chosen in the card stays chosen', async () => {
  await page.goto(`${SITE}/strokes`, { waitUntil: 'networkidle' })
  await page.locator('[data-primary]').pressSequentially('hpz')
  await page.locator('aside.card .ui-tile').nth(1).click()
  await page.waitForTimeout(100)
  assert.match(await page.locator('aside.card .cp').innerText(), /U\+18E01 U\+FE00/)
  await page.keyboard.press('Escape')
})

await step('text: Backspace in the code box takes a selection and nothing else', async () => {
  await page.goto(`${SITE}/strokes`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('jurchen-input:text', '\u{18E00}\u{18E01}\u{18E02}'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('#writing').evaluate((/** @type {HTMLTextAreaElement} */ field) => {
    field.focus()
    field.setSelectionRange(2, 4)
    field.dispatchEvent(new Event('select'))
  })
  await page.locator('[data-primary]').focus()
  await page.keyboard.press('Backspace')
  assert.equal(await text(), '\u{18E00}\u{18E02}')
})

await step('strokes: a refused key keeps the caret, and a composition is read once', async () => {
  await page.goto(`${SITE}/strokes`, { waitUntil: 'networkidle' })
  const box = page.locator('[data-primary]')
  await box.fill('hspd')
  await box.evaluate((/** @type {HTMLInputElement} */ field) => field.setSelectionRange(2, 2))
  await page.keyboard.type(';z')
  assert.equal(await box.inputValue(), 'hszpd')
  await page.keyboard.press('Escape')
  const cdp = await context.newCDPSession(page)
  await box.focus()
  for (const composing of ['h', 'hz', 'hzq']) await cdp.send('Input.imeSetComposition', { text: composing, selectionStart: composing.length, selectionEnd: composing.length })
  await cdp.send('Input.insertText', { text: 'hzq' })
  await page.waitForFunction(() => new URLSearchParams(location.search).get('q') === 'hz')
  assert.equal(await box.inputValue(), 'hz')
  await page.keyboard.press('Escape')
})

await step('phone: a reload and a finder address keep the sheet closed', async () => {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' })
  const tab = await phone.newPage()
  const open = () => tab.evaluate(() => !!document.querySelector('aside.card')?.classList.contains('open'))
  await tab.goto(`${SITE}/?c=18E01`, { waitUntil: 'networkidle' })
  assert.equal(await open(), true)
  await tab.reload({ waitUntil: 'networkidle' })
  assert.equal(await open(), false)
  await tab.goto(`${SITE}/strokes?q=hpz&c=18E01`, { waitUntil: 'networkidle' })
  assert.equal(await open(), false)
  await tab.goto(`${SITE}/about?c=18E01`, { waitUntil: 'networkidle' })
  assert.equal(await open(), false)
  await phone.close()
})

await step('input method: a code point is typed whole', async () => {
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('jurchen-input:text', ''))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Input method' }).click()
  await page.locator('.ime input').pressSequentially('U+18E01')
  assert.equal(await text(), '')
  await page.locator('.ime input').fill('')
  await page.locator('.ime input').pressSequentially('u18e01')
  assert.equal(await text(), '')
  await page.keyboard.press('Enter')
  assert.equal(await text(), '\u{18E01}')
  await page.locator('.ime input').pressSequentially('dd')
  await page.keyboard.press('1')
  assert.ok((await text()).length > 2, 'a digit picks after a code made of hex letters')
})

await step('phone: a shared link opens the character', async () => {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' })
  const tab = await phone.newPage()
  await tab.goto(`${SITE}/?c=18E01`, { waitUntil: 'networkidle' })
  await tab.waitForTimeout(400)
  assert.ok(await tab.locator('aside.card .cp').isVisible())
  await tab.screenshot({ path: join(SHOTS, 'phone-card.png') })
  await phone.close()
})

await step('settings: the language switch reads the catalogue', async () => {
  for (const [lang, name] of [['ja', 'lang.ja'], ['zh-Hans', 'zh'], ['zh-Hant', 'zh'], ['ko', 'ko']]) {
    await page.goto(`${SITE}/strokes?lang=${lang}`, { waitUntil: 'networkidle' })
    assert.equal(await page.evaluate(() => document.documentElement.lang), lang, name)
    await page.screenshot({ path: join(SHOTS, `lang-${lang}-strokes.png`) })
  }
})

await step('the sponsor dialog offers both tips, OFUSE first in Japanese, and Escape closes it', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
  const sponsor = await context.newPage()
  for (const [lang, order] of [['en', ['Ko-fi', 'OFUSE']], ['ja', ['OFUSE', 'Ko-fi']]]) {
    await sponsor.goto(`${SITE}/?lang=${lang}`, { waitUntil: 'load' })
    assert.equal(await sponsor.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('supporters.mkpo.li'))), false, 'a page view does not reach the supporters service')
    const trigger = sponsor.locator('button.sponsor')
    await trigger.click()
    const dialog = sponsor.locator('dialog.sponsor-dialog')
    await dialog.locator('.tip').first().waitFor()
    assert.deepEqual(await dialog.locator('.tip strong').allTextContents(), order)
    assert.equal(await dialog.locator('supporters-roll').count(), 1, 'the supporters roll is in the dialog')
    const isOpen = () => dialog.evaluate(element => /** @type {HTMLDialogElement} */ (element).open)
    const lead = /** @type {{ x: number, y: number }} */ (await dialog.locator('.lead').boundingBox())
    await sponsor.mouse.move(lead.x + 20, lead.y + 8)
    await sponsor.mouse.down()
    await sponsor.mouse.move(20, 500)
    await sponsor.mouse.up()
    assert.equal(await isOpen(), true, 'a selection dragged out of the box leaves it open')
    await sponsor.mouse.click(20, 500)
    assert.equal(await isOpen(), false, 'a click on the backdrop closes it')
    await trigger.click()
    await sponsor.keyboard.press('Escape')
    assert.equal(await isOpen(), false, 'Escape closes it')
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true, 'focus returns to the button')
  }
  await context.close()
})

await step('an open sponsor dialog leaves the drawing behind it alone', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' })
  const draw = await context.newPage()
  await draw.goto(`${SITE}/draw`, { waitUntil: 'load' })
  const canvas = draw.locator('canvas').first()
  await canvas.waitFor()
  const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (await canvas.boundingBox())
  await draw.mouse.move(box.x + box.width * .2, box.y + box.height * .4)
  await draw.mouse.down()
  await draw.mouse.move(box.x + box.width * .8, box.y + box.height * .6, { steps: 8 })
  await draw.mouse.up()
  const ink = () => canvas.evaluate(element => {
    const pad = /** @type {HTMLCanvasElement} */ (element)
    const data = /** @type {CanvasRenderingContext2D} */ (pad.getContext('2d')).getImageData(0, 0, pad.width, pad.height).data
    let painted = 0
    for (let at = 3; at < data.length; at += 4) if (data[at]) painted++
    return painted
  })
  const before = await ink()
  assert.ok(before > 0, 'the stroke is on the pad')
  await draw.locator('button.sponsor').click()
  await draw.locator('dialog.sponsor-dialog .tip').first().waitFor()
  await draw.keyboard.press('Control+z')
  assert.equal(await ink(), before, 'Ctrl+Z leaves the stroke')
  await draw.keyboard.press('Escape')
  assert.equal(await draw.locator('dialog.sponsor-dialog').evaluate(element => /** @type {HTMLDialogElement} */ (element).open), false, 'Escape closes the dialog')
  assert.equal(await ink(), before, 'Escape leaves the stroke')
  await context.close()
})

await browser.close()
console.log(`${passed} passed, ${failed.length} failed`)
if (failed.length) process.exit(1)

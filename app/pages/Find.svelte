<script>
  // Find: one box for whatever the reader has. Jurchen text is split into its characters, each with
  // its reading, so a pasted line can be read character by character. Latin letters are tried as a
  // stroke code and a reading at once, each in its own group; a code point opens its range; a number
  // finds the character with that value.
  import { db } from '../lib/db.svelte.js'
  import { ix, readingOf } from '../lib/index.js'
  import { codePoint, MARK } from '../lib/script.js'
  import G from '../ui/G.svelte'
  import { route, setQuery, go, link } from '../lib/route.svelte.js'
  import { preview, choose, put, autofocus } from '../lib/ui.svelte.js'
  import { byCode, byCodePoint, byNumber, byReference, jurchenIn } from '../lib/search.js'
  import { searchReadings } from '../lib/reading.js'
  import { t } from '../lib/i18n.svelte.js'

  let query = $state(route.q)
  let active = $state(-1)
  const ready = $derived(db.status === 'ready')
  const text = $derived(query.trim())

  const groups = $derived.by(() => {
    if (!ready || !text) return []
    /** @type {{ key: string, title: string, page?: import('../lib/route.svelte.js').Page, total: number, items: { char: string, sub: string }[] }[]} */
    const out = []
    const chars = jurchenIn(text)
    if (chars.length) {
      out.push({ key: 'text', title: chars.length === 1 ? t('find.group.character') : t('find.group.text'), total: chars.length,
        items: chars.map(char => ({ char, sub: readingOf(char) })) })
      return out
    }
    const number = byNumber(text)
    if (number.length) out.push({ key: 'number', title: t('find.group.number'), total: 1, items: number.map(char => ({ char, sub: readingOf(char) })) })
    const referred = byReference(text)
    if (referred.length) out.push({ key: 'reference', title: t('find.group.reference'), total: referred.length, items: referred.map(char => ({ char, sub: readingOf(char) })) })
    const points = byCodePoint(text)
    if (points.length) out.push({ key: 'cp', title: t('find.group.codepoint'), total: points.length, items: points.slice(0, 48).map(char => ({ char, sub: codePoint(char) })) })
    if (/^[hspdzb]+$/i.test(text)) {
      const codes = byCode(text)
      if (codes.length) out.push({ key: 'code', title: t('find.group.strokes'), page: 'strokes', total: codes.length, items: codes.slice(0, 24).map(hit => ({ char: hit.char, sub: hit.code })) })
    }
    if (!/^[0-9]+$/.test(text)) {
      const readings = searchReadings(ix.readings, text).filter(hit => hit.tier < 2)
      if (readings.length) out.push({ key: 'reading', title: t('find.group.reading'), page: 'reading', total: readings.length,
        items: readings.slice(0, 24).map(hit => ({ char: hit.char, sub: hit.raw })) })
    }
    return out
  })
  const flat = $derived(groups.flatMap(group => group.items))

  $effect(() => { void text; active = -1 })

  /** @param {KeyboardEvent} event */
  function keys(event) {
    if (!flat.length) return
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
    if (step && !(event.key.startsWith('ArrowL') || event.key.startsWith('ArrowR')) || (step && active >= 0)) {
      event.preventDefault()
      active = Math.max(0, Math.min(flat.length - 1, active + step))
      preview(flat[active].char)
      document.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      put(flat[Math.max(0, active)].char)
    }
  }

  const DOORS = /** @type {const} */ ([
    { page: 'strokes', title: 'nav.strokes', body: 'find.door.strokes', glyph: '\u{191A0}' },
    { page: 'draw', title: 'nav.draw', body: 'find.door.draw', glyph: '\u{18E36}' },
    { page: 'radicals', title: 'nav.radicals', body: 'find.door.radicals', glyph: '\u{191BF}' },
    { page: 'reading', title: 'nav.reading', body: 'find.door.reading', glyph: '\u{19129}' },
    { page: 'transcribe', title: 'nav.transcribe', body: 'find.door.transcribe', glyph: MARK },
    { page: 'convert', title: 'nav.convert', body: 'find.door.convert', glyph: '\u{19049}' },
  ])

  /** @type {{ value: string, script?: boolean, mono?: boolean }[]} */
  const EXAMPLES = [
    // The numerals one to three, as Unicode records them.
    { value: '\u{19049}\u{1904A}\u{19129}', script: true },
    { value: 'tumen' },
    { value: 'dʒo' },
    { value: 'hpsz', mono: true },
    { value: '10000', mono: true },
    { value: 'X-0005', mono: true },
    { value: 'U+18E01', mono: true },
  ]
</script>

<div class="ui-page find">
  <div class="search">
    <input class="ui-input" data-size="xl" data-primary value={query} spellcheck="false" autocomplete="off" autocapitalize="off"
      aria-label={t('find.label')} placeholder={t('find.placeholder')}
      oninput={(/** @type {Event & { currentTarget: HTMLInputElement }} */ event) => { query = event.currentTarget.value; setQuery(query) }} onkeydown={keys} use:autofocus />
  </div>

  {#if !text}
    <section class="try" aria-label={t('find.try')}>
      <span class="ui-hint">{t('find.try')}</span>
      {#each EXAMPLES as example (example.value)}
        <button type="button" class="ui-chip" class:ui-script={example.script} class:ui-mono={example.mono}
          lang={example.script ? 'juc' : undefined}
          onclick={() => { query = example.value; setQuery(query) }}>{example.value}</button>
      {/each}
    </section>
    <section aria-label={t('nav.label')}>
      <div class="ui-index">
        {#each DOORS as door (door.page)}
          <a class="ui-index-link" href={link(door.page)} onclick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey) { event.preventDefault(); go(door.page) } }}>
            <span class="ui-index-glyph" aria-hidden="true">{door.glyph}</span>
            <span class="ui-index-text">
              <span class="ui-index-title">{t(door.title)}</span>
              <span class="ui-index-body">{t(door.body)}</span>
            </span>
            <span class="ui-index-arrow" aria-hidden="true">→</span>
          </a>
        {/each}
      </div>
    </section>
    <p class="tip">{t('find.tip')}</p>
  {:else if !ready}
    <p class="ui-empty">{t('common.loading')}</p>
  {:else if !groups.length}
    <p class="ui-empty">{t('find.none', { text })}</p>
  {:else}
    {#each groups as group, g (group.key)}
      {@const offset = groups.slice(0, g).reduce((sum, other) => sum + other.items.length, 0)}
      <section class="ui-section" aria-label={group.title}>
        <header class="ui-section-head">
          <h2 class="ui-label">{group.title}</h2>
          <span class="ui-count">{group.total > group.items.length ? t('common.of', { shown: group.items.length, total: group.total }) : group.total}</span>
          {#if group.page}<a class="ui-more-link" href={link(group.page, route.c, text)} onclick={event => { event.preventDefault(); const page = /** @type {import('../lib/route.svelte.js').Page} */ (group.page); go(page); setQuery(text) }}>{t('find.continue', { page: t(group.page === 'strokes' ? 'nav.strokes' : 'nav.reading') })}</a>{/if}
        </header>
        {#if group.key === 'text'}
          <ol class="ui-rows">
            {#each group.items as item, i (item.char)}
              <li class="ui-row" data-selected={offset + i === active || route.c === item.char}>
                <button type="button" data-index={offset + i} class="ui-row-pick gloss-row" aria-current={offset + i === active || route.c === item.char ? 'true' : undefined}
                  onclick={() => { active = offset + i; choose(item.char) }} ondblclick={() => put(item.char)}>
                  <G char={item.char} />
                  <span class="ui-row-said">{item.sub || '—'}</span>
                  <span class="ui-row-title ui-mono cp">{codePoint(item.char)}</span>
                </button>
              </li>
            {/each}
          </ol>
        {:else}
          <div class="ui-tiles" role="listbox" aria-label={group.title} style:--ui-tile-size="72px">
            {#each group.items as item, i (item.char)}
              <button type="button" role="option" class="ui-tile" data-index={offset + i} aria-selected={offset + i === active || (active < 0 && route.c === item.char)}
                title={codePoint(item.char)} onclick={() => { active = offset + i; choose(item.char) }} ondblclick={() => put(item.char)}>
                <G char={item.char} /><span class="ui-tile-note">{item.sub}</span>
              </button>
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  {/if}
</div>

<style>
  .find{gap:var(--ui-space-2xl)}
  .try{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-xs);margin-top:calc(-1 * var(--ui-space-lg))}
  .try .ui-script{font-size:17px}
  .tip{font-size:var(--ui-text-sm);color:var(--ui-color-ink-soft)}
  .ui-index-glyph{font-family:var(--ui-font-script)}
  .gloss-row{grid-template-columns:44px 9rem minmax(0,1fr)}
  .gloss-row :global(.ui-script){font-size:32px;text-align:center}
  .gloss-row .ui-row-said{font-size:var(--ui-text-md)}
  .cp{font-size:var(--ui-text-xs);color:var(--ui-color-ink-muted)}
  .ui-tile :global(.ui-script){font-size:calc(var(--ui-tile-size) * .52)}
  @media (max-width:900px){
    .gloss-row{grid-template-columns:38px 6.5rem minmax(0,1fr);gap:var(--ui-space-sm)}
    .gloss-row :global(.ui-script){font-size:28px}
  }
</style>

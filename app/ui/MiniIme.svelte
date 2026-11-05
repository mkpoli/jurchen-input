<script>
  // A small input method beside the text: reach a character by its stroke code, its reading or its
  // code point, and it goes in at the caret. It stays open between picks.
  import { tick } from 'svelte'
  import { db } from '../lib/db.svelte.js'
  import { ix, readingOf } from '../lib/index.js'
  import { byCode, byCodePoint, byNumber } from '../lib/search.js'
  import { searchReadings } from '../lib/reading.js'
  import { insert, remember } from '../lib/text.svelte.js'
  import { t } from '../lib/i18n.svelte.js'
  import G from './G.svelte'

  let open = $state(false)
  let query = $state('')
  let active = $state(-1)
  /** @type {HTMLButtonElement | null} */
  let trigger = $state(null)
  /** @type {HTMLInputElement | null} */
  let box = $state(null)

  const ready = $derived(db.status === 'ready')
  const text = $derived(query.trim())

  /** Recent picks, most recent first, so the same character twice is one key away. */
  let recent = $state(/** @type {string[]} */ ([]))
  try { recent = JSON.parse(localStorage.getItem('jurchen-input:recent') ?? '[]') } catch { recent = [] }

  /** @typedef {{ char: string, note: string }} Hit */

  /** What the query can mean, judged from its own characters. */
  const found = $derived.by(() => {
    if (!ready) return { list: /** @type {Hit[]} */ ([]), kinds: /** @type {string[]} */ ([]) }
    if (!text) return { list: recent.slice(0, 32).map(char => ({ char, note: readingOf(char) })), kinds: ['recent'] }
    /** @type {[string, Hit[]][]} */
    const lists = []
    if (/^u\+?[0-9a-f]{3,5}$/i.test(text)) lists.push(['codepoint', byCodePoint(text).slice(0, 24).map(char => ({ char, note: readingOf(char) }))])
    if (/^[0-9]+$/.test(text)) lists.push(['number', byNumber(text).map(char => ({ char, note: readingOf(char) }))])
    if (/^[hspdzb]+$/i.test(text)) lists.push(['code', byCode(text).slice(0, 24).map(hit => ({ char: hit.char, note: hit.code }))])
    if (!/^[0-9]/.test(text)) lists.push(['sound', searchReadings(ix.readings, text).slice(0, 24).map(hit => ({ char: hit.char, note: hit.raw }))])
    const used = lists.filter(([, list]) => list.length).map(([kind]) => kind)
    /** @type {Map<string, Hit>} */
    const unique = new Map()
    for (const [, list] of lists) for (const hit of list) if (!unique.has(hit.char)) unique.set(hit.char, hit)
    return { list: [...unique.values()].slice(0, 48), kinds: used }
  })

  const hits = $derived(found.list)

  $effect(() => { void text; active = -1 })

  /** @param {string} char */
  function put(char) {
    remember()
    insert(char)
    recent = [char, ...recent.filter(other => other !== char)].slice(0, 32)
    try { localStorage.setItem('jurchen-input:recent', JSON.stringify(recent)) } catch { /* the list lives this visit */ }
    query = ''
    active = -1
    box?.focus()
  }

  /** The button can sit near a screen edge, so the panel is nudged back inside it. */
  async function show() {
    open = true
    await tick()
    const panel = /** @type {HTMLElement | null} */ (box?.closest('.panel') ?? null)
    if (panel) {
      const at = panel.getBoundingClientRect()
      const past = Math.max(0, at.right - innerWidth + 12, 12 - at.left)
      if (past) panel.style.transform = `translateX(${at.left < 12 ? past : -past}px)`
    }
    box?.focus()
  }

  /** @param {boolean} [restore] */
  function close(restore = true) {
    open = false
    active = -1
    if (restore) trigger?.focus()
  }

  /** @param {KeyboardEvent} event */
  function keys(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    // The number keys take the candidate at that place, as an input method does, unless the query
    // is itself one that takes digits: a number or a code point.
    if (/^[1-9]$/.test(event.key) && hits.length >= Number(event.key) && text && !/^(u\+?)?[0-9a-f]*$/i.test(text)) {
      event.preventDefault()
      put(hits[Number(event.key) - 1].char)
      return
    }
    const step = { ArrowDown: 4, ArrowUp: -4, ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (!hits.length) return
    if (step) {
      event.preventDefault()
      active = (Math.max(0, active) + step + hits.length) % hits.length
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      put((hits[Math.max(0, active)] ?? hits[0]).char)
    }
  }

  /** @param {PointerEvent} event */
  function outside(event) {
    if (open && !(/** @type {HTMLElement} */ (event.target)).closest('.ime')) close(false)
  }

  $effect(() => {
    if (!open) return
    addEventListener('pointerdown', outside)
    return () => removeEventListener('pointerdown', outside)
  })
</script>

<div class="ime">
  <button class="ui-button" data-variant="quiet" data-size="icon-sm" type="button" bind:this={trigger}
    aria-haspopup="dialog" aria-expanded={open} aria-label={t('ime.label')} title={t('ime.label')}
    onclick={() => { open ? close() : show() }}>
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="16" height="10" rx="2"/><path d="M5 9h1M8 9h1M11 9h1M14 9h1M5 12h10" stroke-linecap="round"/></g></svg>
  </button>
  {#if open}
    <div class="panel ui-menu" role="dialog" aria-label={t('ime.label')}>
      <input class="ui-input" data-size="sm" bind:this={box} bind:value={query} onkeydown={keys}
        aria-label={t('ime.label')} placeholder={t('ime.placeholder')} spellcheck="false" autocomplete="off" autocapitalize="off" />
      {#if text && !hits.length}
        <p class="ui-hint">{ready ? t('ime.none') : t('common.loading')}</p>
      {:else if hits.length}
        <p class="ui-hint">{found.kinds.map(kind => t(`ime.kind.${kind}`)).join(' · ')}</p>
        <div class="hits" role="listbox" aria-label={t('ime.label')}>
          {#each hits as hit, i (hit.char)}
            <button type="button" role="option" class="ui-tile" aria-selected={i === active} title={hit.note}
              onclick={() => put(hit.char)} onmouseenter={() => { active = i }}>
              <G char={hit.char} />
              {#if i < 9}<span class="n">{i + 1}</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ime{position:relative}
  .panel{position:absolute;right:0;top:calc(100% + 6px);z-index:var(--ui-z-menu);display:grid;gap:var(--ui-space-sm);inline-size:300px;padding:var(--ui-space-md)}
  .hits{display:grid;grid-template-columns:repeat(8, 1fr);gap:2px;max-block-size:220px;overflow:auto}
  .hits .ui-tile{min-block-size:34px;font-size:22px;position:relative}
  .hits .n{position:absolute;top:0;left:2px;font:9px var(--ui-font-mono);color:var(--ui-color-ink-muted)}
  .hits .ui-tile[aria-selected='true']{background:var(--ui-color-accent-soft);color:var(--ui-color-accent-ink)}
</style>

<script>
  // Reading: type a reading from Jin Qizong's dictionary, with phonetic letters or plain ones.
  import { db } from '../lib/db.svelte.js'
  import { ix } from '../lib/index.js'
  import { route, setQuery } from '../lib/route.svelte.js'
  import { preview, choose, put, autofocus } from '../lib/ui.svelte.js'
  import { TIERS, searchReadings } from '../lib/reading.js'
  import { t } from '../lib/i18n.svelte.js'

  let query = $state(route.q)
  let active = $state(-1)
  /** @type {HTMLElement | null} */
  let list = $state(null)

  const ready = $derived(db.status === 'ready')
  const hits = $derived(ready && query.trim() ? searchReadings(ix.readings, query) : [])
  const shown = $derived(hits.slice(0, 200))
  const counts = $derived(TIERS.map((_, tier) => hits.filter(hit => hit.tier === tier).length))

  $effect(() => { void query; active = -1 })

  /** @param {KeyboardEvent} event */
  function keys(event) {
    if (!shown.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      active = Math.max(0, Math.min(shown.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)))
      preview(shown[active].char)
      list?.querySelectorAll('.ui-row')[active]?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      put(shown[Math.max(0, active)].char)
    } else if (event.key === 'Escape') {
      query = ''
      setQuery('')
    }
  }

  const EXAMPLES = ['tumen', 'ejen', 'ilan', 'dʒo', 'taiji']
</script>

<div class="ui-page reading">
  <header class="ui-page-head">
    <h1 class="ui-page-title">{t('nav.reading')}</h1>
    <p class="ui-page-intro">{@html t('reading.intro')}</p>
  </header>

  <input class="ui-input reading-input" data-size="xl" data-primary value={query} spellcheck="false" autocomplete="off" autocapitalize="off"
    aria-label={t('reading.label')} placeholder={t('reading.placeholder')}
    oninput={(/** @type {Event & { currentTarget: HTMLInputElement }} */ event) => { query = event.currentTarget.value; setQuery(query) }} onkeydown={keys} use:autofocus />

  {#if !query.trim()}
    <div class="start">
      <span class="ui-hint">{t('find.try')}</span>
      {#each EXAMPLES as example (example)}
        <button type="button" class="ui-chip ui-mono" onclick={() => { query = example; setQuery(example) }}>{example}</button>
      {/each}
    </div>
  {:else if !ready}
    <p class="ui-empty">{t('common.loading')}</p>
  {:else if !hits.length}
    <p class="ui-empty">{t('reading.none', { query })}</p>
  {:else}
    <p class="ui-count" role="status">
      {t('common.characters', { count: hits.length })} ·
      {#each TIERS as tier, i (tier)}{#if counts[i]}<span class="tier">{t(`reading.tier.${i}`)} {counts[i]}</span>{/if}{/each}
    </p>
    <ol class="ui-rows" bind:this={list}>
      {#each shown as hit, i (hit.char)}
        {#if i === 0 || shown[i - 1].tier !== hit.tier}<li class="ui-group-head" role="presentation">{t(`reading.tier.${hit.tier}`)}</li>{/if}
        <li class="ui-row" data-selected={i === active || (active < 0 && route.c === hit.char)}>
          <button type="button" class="ui-row-pick reading-row" aria-current={i === active || (active < 0 && route.c === hit.char) ? 'true' : undefined}
            onclick={() => { active = i; choose(hit.char) }} ondblclick={() => put(hit.char)}>
            <span class="ui-script ui-row-glyph" lang="juc">{hit.char}</span>
            <span class="said">{hit.raw}</span>
          </button>
          <button type="button" class="ui-row-action ui-button" data-variant="quiet" data-size="icon-sm"
            aria-label={t('common.addToText', { char: hit.char })} title={t('common.add')} onclick={() => put(hit.char)}>
            <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .reading-input{font-family:var(--ui-font-serif);font-size:18px}
  .start{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-xs)}
  .tier + .tier::before{content:" · "}
  .reading-row{grid-template-columns:48px minmax(0,1fr)}
  .reading-row :global(.ui-script){font-size:32px;text-align:center}
  .said{font-family:var(--ui-font-serif);font-size:var(--ui-text-lg)}
  .ui-group-head{padding:var(--ui-space-lg) 0 var(--ui-space-2xs)}
</style>

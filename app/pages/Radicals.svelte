<script>
  // Radicals: the 51 radicals of Unicode's order, each with its characters by stroke count. The
  // palette and the characters sit in two panes, each scrolling on its own.
  import { db } from '../lib/db.svelte.js'
  import { ix, readingOf } from '../lib/index.js'
  import G from '../ui/G.svelte'
  import { route, setQuery } from '../lib/route.svelte.js'
  import { choose, put, preview } from '../lib/ui.svelte.js'
  import { t } from '../lib/i18n.svelte.js'

  const ready = $derived(db.status === 'ready')
  const number = $derived(/^[0-9]+$/.test(route.q) && Number(route.q) >= 1 && Number(route.q) <= 51 ? Number(route.q) : 0)
  const groups = $derived.by(() => {
    if (!ready || !number) return []
    /** @type {Map<number, string[]>} */
    const byStrokes = new Map()
    for (const char of ix.byRadical.get(number) ?? []) {
      const strokes = ix.strokes.get(char) ?? 0
      byStrokes.set(strokes, [...(byStrokes.get(strokes) ?? []), char])
    }
    return [...byStrokes].sort((a, b) => a[0] - b[0])
  })
  const total = $derived(groups.reduce((sum, [, chars]) => sum + chars.length, 0))

  /** @param {number} n */
  function pick(n) {
    setQuery(String(n))
    preview(ix.radicals[n - 1])
  }
</script>

<div class="ui-page radicals" data-width="wide">
  <header class="ui-page-head">
    <h1 class="ui-page-title">{t('nav.radicals')}</h1>
    <p class="ui-page-intro">{t('radicals.intro')}</p>
  </header>

  {#if !ready}
    <p class="ui-empty">{t('common.loading')}</p>
  {:else}
    <div class="panes">
      <section class="palette" aria-label={t('radicals.palette')}>
        <div class="ui-tiles" style:--ui-tile-size="60px">
          {#each ix.radicals as radical, i (radical)}
            <button type="button" class="ui-tile" data-open={number === i + 1 ? '' : undefined} aria-pressed={number === i + 1}
              title={t('radicals.count', { count: ix.byRadical.get(i + 1)?.length ?? 0 })} onclick={() => pick(i + 1)} ondblclick={() => put(radical)}>
              <G char={radical} /><span class="ui-tile-note">{i + 1}</span>
            </button>
          {/each}
        </div>
      </section>

      <section class="found" aria-label={t('radicals.characters')}>
        {#if number}
          <div class="ui-section-head">
            <h2 class="ui-label">{t('card.radicalNumber', { number })}</h2>
            <span class="ui-count">{t('common.characters', { count: total })}</span>
          </div>
          {#each groups as [strokes, chars] (strokes)}
            <h3 class="group-head">{t('draw.strokes', { count: strokes })}</h3>
            <div class="ui-tiles" style:--ui-tile-size="60px">
              {#each chars as char (char)}
                <button type="button" class="ui-tile" data-open={route.c === char ? '' : undefined} title={readingOf(char)}
                  onclick={() => choose(char)} ondblclick={() => put(char)}>
                  <G {char} /><span class="ui-tile-note">{readingOf(char) || '—'}</span>
                </button>
              {/each}
            </div>
          {/each}
        {:else}
          <p class="ui-empty">{t('radicals.empty')}</p>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .panes{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:var(--ui-space-2xl);align-items:start}
  .palette,.found{min-inline-size:0;max-block-size:calc(100dvh - 300px);min-block-size:320px;overflow:auto;padding-inline-end:var(--ui-space-2xs)}
  .ui-tile :global(.ui-script){font-size:32px}
  .ui-tile[data-open]{background:var(--ui-color-accent-soft)}
  .ui-tile-note{font-size:var(--ui-text-2xs)}
  .group-head{margin:var(--ui-space-lg) 0 var(--ui-space-xs);color:var(--ui-color-ink-muted);font-size:var(--ui-text-xs);font-weight:var(--ui-weight-semibold)}
  @media (max-width:1100px){
    .panes{grid-template-columns:1fr}
    .palette,.found{max-block-size:none;min-block-size:0;overflow:visible}
  }
</style>

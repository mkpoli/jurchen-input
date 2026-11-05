<script>
  // Syllables: the one-syllable readings laid out like a kana chart, initials down the side and
  // rimes across the top. Longer readings are words, so they stay on the Reading page.
  import { db } from '../lib/db.svelte.js'
  import { ix } from '../lib/index.js'
  import { buildChart, cellKey, rimeGroup } from '../lib/syllables.js'
  import { codePoint } from '../lib/script.js'
  import { route, setQuery, go } from '../lib/route.svelte.js'
  import { choose, put } from '../lib/ui.svelte.js'
  import { t } from '../lib/i18n.svelte.js'
  import G from '../ui/G.svelte'

  const GROUPS = /** @type {const} */ (['open', 'glide', 'n', 'ng', 'other', 'all'])
  const group = $derived(/** @type {typeof GROUPS[number]} */ (GROUPS.find(name => name === route.q) ?? 'open'))
  const ready = $derived(db.status === 'ready')
  const chart = $derived(ready ? buildChart(ix.readings) : null)
  const rimes = $derived(chart ? chart.rimes.filter(rime => group === 'all' || rimeGroup(rime) === group) : [])
  const initials = $derived(chart ? chart.initials.filter(initial => rimes.some(rime => chart?.cells.has(cellKey(initial, rime)))) : [])
</script>

<div class="ui-page syllables" data-width="wide">
  <header class="ui-page-head">
    <h1 class="ui-page-title">{t('nav.syllables')}</h1>
    <p class="ui-page-intro">{t('syllables.intro')}</p>
  </header>

  <div class="ui-chip-row" role="group" aria-label={t('syllables.groups')}>
    {#each GROUPS as name (name)}
      <button type="button" class="ui-chip" aria-pressed={group === name} onclick={() => setQuery(name === 'open' ? '' : name)}>{t(`syllables.group.${name}`)}</button>
    {/each}
  </div>

  {#if chart}
    <div class="scroller" role="region" aria-label={t('nav.syllables')} tabindex="-1">
      <table class="chart">
        <thead>
          <tr>
            <td></td>
            {#each rimes as rime (rime)}<th scope="col">-{rime}</th>{/each}
          </tr>
        </thead>
        <tbody>
          {#each initials as initial (initial)}
            <tr>
              <th scope="row" title={initial ? undefined : t('syllables.noInitial')}>{initial ? `${initial}-` : '∅'}</th>
              {#each rimes as rime (rime)}
                {@const cell = chart.cells.get(cellKey(initial, rime))}
                <td>
                  {#if cell}
                    <div class="glyphs">
                      {#each cell as item (item.char)}
                        <button type="button" class="glyph" class:open={route.c === item.char} title={`${item.raw} · ${codePoint(item.char)}`}
                          onclick={() => choose(item.char)} ondblclick={() => put(item.char)}><G char={item.char} /></button>
                      {/each}
                    </div>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="ui-count">
      {t('syllables.counts', { charted: chart.charted, consonants: chart.consonants, longer: chart.longer })} ·
      <a href="/reading" onclick={event => { event.preventDefault(); go('reading') }}>{t('nav.reading')}</a>
    </p>
    <p class="ui-hint">{t('syllables.note')}</p>
  {:else}
    <p class="ui-empty">{t('common.loading')}</p>
  {/if}
</div>

<style>
  .syllables{gap:var(--ui-space-lg)}
  .scroller{max-inline-size:100%;overflow:auto;border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-md);background:var(--ui-color-surface);max-block-size:calc(100dvh - 330px);min-block-size:320px}
  .chart{border-collapse:separate;border-spacing:0;font-family:var(--ui-font-serif)}
  th{position:sticky;background:var(--ui-color-surface-sunken);font-size:var(--ui-text-md);font-weight:var(--ui-weight-semibold);white-space:nowrap}
  thead th{top:0;z-index:2;padding:var(--ui-space-xs) var(--ui-space-sm);border-bottom:1px solid var(--ui-color-border-strong);min-inline-size:44px}
  thead td{position:sticky;top:0;left:0;z-index:3;background:var(--ui-color-surface-sunken);border-bottom:1px solid var(--ui-color-border-strong);border-inline-end:1px solid var(--ui-color-border-strong)}
  tbody th{left:0;z-index:1;padding:var(--ui-space-2xs) var(--ui-space-sm);border-inline-end:1px solid var(--ui-color-border-strong);border-bottom:1px solid var(--ui-color-border);text-align:end;vertical-align:top}
  tbody td{padding:2px;border-bottom:1px solid var(--ui-color-border);border-inline-end:1px solid var(--ui-color-border);vertical-align:top}
  .glyphs{display:flex;flex-wrap:wrap;gap:1px;max-inline-size:136px}
  .glyph{display:grid;place-items:center;inline-size:32px;block-size:32px;padding:0;border:0;border-radius:var(--ui-radius-xs);background:none;color:inherit}
  .glyph :global(.ui-script){font-size:24px;line-height:1}
  .glyph:hover{background:var(--ui-color-surface-hover)}
  .glyph.open{background:var(--ui-color-accent-soft);color:var(--ui-color-accent-ink)}
</style>

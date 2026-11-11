<script>
  // Code chart: the radicals and characters by code point, in Unicode's sixteen-column page, with
  // the inventory, block occupancy and radical counts above it. A cell copies its character.
  import { db } from '../lib/db.svelte.js'
  import { ix } from '../lib/index.js'
  import { codePoint } from '../lib/script.js'
  import { blockRows, inventoryRows, pageCount, pageRange, pageRows, percentText, rangeText, SECTIONS, topRadicals } from '../lib/codes.js'
  import { copy } from '../lib/clip.svelte.js'
  import { t } from '../lib/i18n.svelte.js'
  import G from '../ui/G.svelte'

  const ready = $derived(db.status === 'ready')
  const assigned = $derived(ready ? new Map([...ix.entries.keys(), ...ix.radicals].map(char => [char.codePointAt(0) ?? 0, char])) : new Map())
  /** The page showing in each section, counted from zero. @type {Record<string, number>} */
  let at = $state({ radicals: 0, characters: 0 })

  const inventory = $derived(ready ? inventoryRows(ix.entries.size, ix.radicals.length) : [])
  const blocks = $derived(ready ? blockRows(assigned) : [])
  const used = $derived(ready ? topRadicals(ix.radicals, ix.byRadical) : [])
  const usedMax = $derived(used.length ? used[0].count : 0)

  /** @param {string} key */
  const labelOf = key => t(key === 'radicals' ? 'nav.radicals' : 'codes.characters')
</script>

<div class="ui-page codes" data-width="wide">
  <header class="ui-page-head">
    <h1 class="ui-page-title">{t('nav.codes')}</h1>
    {#if ready}
      <div class="ui-chip-row">
        <a class="ui-chip" href="#characters">{t('common.characters', { count: ix.entries.size })}</a>
        <a class="ui-chip" href="#radicals">{t('common.radicals', { count: ix.radicals.length })}</a>
      </div>
    {/if}
  </header>

  {#if !ready}
    <p class="ui-empty">{t('common.loading')}</p>
  {:else}
    <div class="stats">
      <section class="stat">
        <h2 class="ui-label">{t('codes.inventory')}</h2>
        <div class="bar" aria-hidden="true">
          {#each inventory as row (row.key)}<span class="seg {row.key}" style:inline-size={row.share}></span>{/each}
        </div>
        <ul class="legend">
          {#each inventory as row (row.key)}
            <li>
              <span class="dot {row.key}" aria-hidden="true"></span>
              <span>{labelOf(row.key)}</span>
              <span class="ui-num">{row.count}</span>
              <span class="ui-num pct">{row.percent}</span>
            </li>
          {/each}
        </ul>
      </section>

      <section class="stat">
        <h2 class="ui-label">{t('codes.blocks')}</h2>
        <ul class="occupancy">
          {#each blocks as block (block.key)}
            <li class="occupant">
              <div class="occ-head">
                <span class="occ-name">{t(block.title)}</span>
                <span class="ui-mono range">{rangeText(block.start, block.end)}</span>
              </div>
              <div class="bar" aria-hidden="true"><span class="fill" style:inline-size={`${block.count / block.total * 100}%`}></span></div>
              <div class="occ-foot"><span class="ui-num">{block.count}/{block.total}</span><span class="ui-num">{block.percent}</span></div>
            </li>
          {/each}
        </ul>
      </section>

      <section class="stat">
        <h2 class="ui-label">{t('codes.radicalUse')}</h2>
        <ul class="use">
          {#each used as radical (radical.number)}
            <li>
              <span class="use-glyph"><G char={radical.char} /></span>
              <span class="use-number ui-mono">#{radical.number}</span>
              <span class="bar" aria-hidden="true"><span class="fill" style:inline-size={`${radical.count / usedMax * 100}%`}></span></span>
              <span class="ui-num">{radical.count}</span>
              <span class="ui-num pct">{percentText(radical.count, ix.entries.size)}</span>
            </li>
          {/each}
        </ul>
      </section>
    </div>

    {#each SECTIONS as section (section.key)}
      {@const page = at[section.key]}
      {@const pages = pageCount(section)}
      {@const rows = pageRows(section, page)}
      <section class="ui-section chart-section" id={section.key} aria-labelledby={`${section.key}-title`}>
        <div class="ui-section-head chart-head">
          <h2 class="ui-label" id={`${section.key}-title`}>{t(section.title)}</h2>
          <span class="ui-count">{section.key === 'radicals' ? `(${ix.radicals.length})` : `(${ix.entries.size})`}</span>
          <span class="ui-mono range">{pageRange(rows.flat(), assigned)}</span>
          {#if pages > 1}
            <span class="ui-pager">
              <button type="button" class="ui-button" data-variant="quiet" data-size="icon-sm" aria-label={t('common.previous')} disabled={page === 0}
                onclick={() => { at[section.key] = page - 1 }}>‹</button>
              <span class="ui-num" aria-live="polite">{page + 1}/{pages}</span>
              <button type="button" class="ui-button" data-variant="quiet" data-size="icon-sm" aria-label={t('common.more')} disabled={page === pages - 1}
                onclick={() => { at[section.key] = page + 1 }}>›</button>
            </span>
          {/if}
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="scroller" role="region" aria-label={t(section.title)} tabindex="0">
          <div class="chart">
            {#each rows as row, index (index)}
              {#each row as code (code)}
                {@const char = assigned.get(code)}
                {#if char}
                  <button type="button" class="cell" title={t('codes.copyCell', { code: codePoint(char) })} aria-label={t('codes.copyCell', { code: codePoint(char) })}
                    onclick={() => copy(char)}>
                    <G {char} />
                    <span class="cp ui-mono">{`U+${code.toString(16).toUpperCase()}`}</span>
                  </button>
                {:else}
                  <span class="cell blank" aria-hidden="true"></span>
                {/if}
              {/each}
            {/each}
          </div>
        </div>
      </section>
    {/each}
  {/if}
</div>

<style>
  .codes{gap:var(--ui-space-2xl)}
  .codes :global(a.ui-chip){text-decoration:none}

  .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--ui-space-2xl)}
  .stat{display:grid;align-content:start;gap:var(--ui-space-sm);min-inline-size:0}
  .stat + .stat{border-inline-start:1px solid var(--ui-color-border);padding-inline-start:var(--ui-space-2xl)}
  .bar{display:flex;overflow:hidden;block-size:8px;border-radius:var(--ui-radius-pill);background:var(--ui-color-surface-sunken)}
  .seg{block-size:100%}
  .seg.radicals,.dot.radicals{background:var(--ui-color-ink-muted)}
  .seg.characters,.dot.characters{background:var(--ui-color-accent)}
  .fill{display:block;block-size:100%;border-radius:inherit;background:var(--ui-color-accent)}
  .legend{display:grid;gap:var(--ui-space-2xs);margin:0;padding:0;list-style:none}
  .legend li{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:var(--ui-space-xs);font-size:var(--ui-text-xs)}
  .dot{inline-size:7px;block-size:7px;border-radius:50%}
  .pct{min-inline-size:3.2em;color:var(--ui-color-ink-muted);text-align:end}

  .occupancy,.use{display:grid;gap:var(--ui-space-sm);margin:0;padding:0;list-style:none}
  .occupant{display:grid;gap:var(--ui-space-3xs)}
  .occ-head,.occ-foot{display:flex;align-items:baseline;justify-content:space-between;gap:var(--ui-space-sm);font-size:var(--ui-text-xs)}
  .occ-name{font-weight:var(--ui-weight-medium);white-space:nowrap}
  .occ-head .range{color:var(--ui-color-ink-muted);font-size:var(--ui-text-2xs);white-space:nowrap}
  .occupant .bar{block-size:6px}
  .occ-foot{color:var(--ui-color-ink-muted);font-size:var(--ui-text-2xs)}

  .use{gap:var(--ui-space-2xs)}
  .use li{display:grid;grid-template-columns:20px 26px minmax(0,1fr) auto auto;align-items:center;gap:var(--ui-space-2xs);font-size:var(--ui-text-xs)}
  .use-glyph{display:grid;place-items:center}
  .use-glyph :global(.ui-script){font-size:20px}
  .use-number{color:var(--ui-color-ink-muted);font-size:var(--ui-text-2xs)}
  .use .bar{block-size:6px}
  .use .pct{min-inline-size:auto}

  .chart-section{scroll-margin-block-start:calc(var(--topbar-h) + var(--ui-space-xl))}
  .chart-head .range{color:var(--ui-color-ink-muted);font-size:var(--ui-text-xs)}
  .scroller{overflow-x:auto;padding-block-end:var(--ui-space-2xs);overscroll-behavior-inline:contain}
  .chart{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:var(--ui-space-3xs);min-inline-size:800px}
  .cell{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-inline-size:0;min-block-size:54px;padding:var(--ui-space-2xs) 1px var(--ui-space-3xs);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-xs);background:var(--ui-color-surface);color:var(--ui-color-ink);transition:background-color var(--ui-duration-fast) var(--ui-ease),border-color var(--ui-duration-fast) var(--ui-ease)}
  .cell:hover{border-color:var(--ui-color-border-strong);background:var(--ui-color-surface-hover)}
  .cell :global(.ui-script){font-size:30px}
  .cp{color:var(--ui-color-ink-muted);font-size:10px;line-height:1.2;white-space:nowrap}
  .cell.blank{border-style:dashed;background:transparent;cursor:default}

  @media (max-width:900px){
    .stats{grid-template-columns:1fr;gap:var(--ui-space-lg)}
    .stat + .stat{border-inline-start:0;border-block-start:1px solid var(--ui-color-border);padding-inline-start:0;padding-block-start:var(--ui-space-lg)}
  }
</style>

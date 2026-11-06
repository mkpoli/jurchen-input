<script>
  // Everything recorded about the open character, arranged around using it: the actions come first,
  // then what helps a reader confirm it is the one they mean, then the characters near it.
  import { db } from '../lib/db.svelte.js'
  import { ix, entryOf, radicalNumber, readingOf } from '../lib/index.js'
  import { baseOf, codePoint, isRadical, MARK, readSource, variantOf } from '../lib/script.js'
  import G from './G.svelte'
  import { route, link } from '../lib/route.svelte.js'
  import { ui, put, choose } from '../lib/ui.svelte.js'
  import { copy } from '../lib/clip.svelte.js'
  import { t } from '../lib/i18n.svelte.js'

  const char = $derived(route.c)
  const ready = $derived(db.status === 'ready')
  const base = $derived(char ? baseOf(char) : '')
  const entry = $derived(ready && char ? entryOf(char) : undefined)
  const variant = $derived(char ? variantOf(char) : 0)
  const number = $derived(char ? radicalNumber(char) : 0)
  const code = $derived(ready && char ? ix.codes.get(char) ?? '' : '')
  const forms = $derived(ready && base ? ix.forms.get(base) ?? [] : [])
  const source = $derived(entry ? readSource(entry.source) : null)
  const radicalChar = $derived(entry ? ix.radicals[entry.radical - 1] : '')
  const under = $derived(ready && number ? ix.byRadical.get(number) ?? [] : [])
  const sameReading = $derived(entry?.reading ? ix.readings.filter(other => other.raw === entry?.reading && other.char !== base).map(other => other.char) : [])
  const encodings = $derived(ready && base ? ix.encodings.get(base) : undefined)
  const encodingRows = $derived(encodings ? [
    { label: t('card.enc.jin1984'), items: encodings.jin1984 },
    { label: t('card.enc.xrefs'), items: encodings.xrefs },
    { label: t('card.enc.babelstone'), items: encodings.babelstone.map(code => `U+${code}`) },
    { label: t('card.enc.zhzk'), items: encodings.zhzk.map(code => `U+${code}`) },
    { label: t('card.enc.draft'), items: encodings.draft },
  ].filter(row => row.items.length) : [])
  const origins = $derived(ready && base ? ix.origins.get(base) ?? [] : [])
  /** The works an origin is cited to. */
  const WORKS = /** @type {Record<string, { label: string, url: string }>} */ ({
    n5261r: { label: 'card.origin.cite.n5261r', url: 'https://www.unicode.org/L2/L2024/24139-n5261r-jurchen-ideographs.pdf' },
    kiyose: { label: 'card.origin.cite.kiyose', url: 'https://www.chikyukotobamura.org/muse/wr_easia_9.html' },
    west2012: { label: 'card.origin.cite.west2012', url: 'https://www.babelstone.co.uk/Blog/2012/12/one-to-twenty-in-jurchen-khitan-and-lute.html' },
    jinjin1980: { label: 'card.origin.cite.jinjin1980', url: 'https://archive.org/download/Khitan-et-Jurchen-languages/%E5%A5%B3%E7%9C%9F%E8%AF%AD%E8%A8%80%E6%96%87%E5%AD%97%E7%A0%94%E7%A9%B6.pdf#page=67' },
  })
  const address = $derived(char ? `${location.origin}${link('', char)}` : '')
</script>

{#if ui.sheet}
  <div class="sheetbar">
    <button class="ui-button" data-variant="quiet" data-size="sm" type="button" onclick={() => { ui.sheet = false }}>
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      {t('card.back')}
    </button>
  </div>
{/if}

{#if !char}
  <div class="blank">
    <p class="ui-script blank-glyph" aria-hidden="true">{MARK}</p>
    <p class="blank-line">{t('card.blank')}</p>
    <p class="ui-hint">{@html t('card.blankKeys')}</p>
  </div>
{:else}
  <article class="record">
    <header class="head">
      <div class="glyph-frame"><G {char} /></div>
      <div class="facts">
        <button class="cp ui-mono" type="button" title={t('card.copyCodePoint')} onclick={() => copy(codePoint(char))}>{codePoint(char)}</button>
        {#if number}<p class="gloss">{t('card.radicalNumber', { number })}</p>
        {:else if entry?.reading}<p class="gloss">{entry.reading}</p>{/if}
        {#if entry}
          <p class="meta">
            {#if !variant}{t('draw.strokes', { count: entry.strokes })}&ensp;·&ensp;{/if}{t('card.radical')}
            <button class="inline ui-script" type="button" title={t('card.radicalNumber', { number: entry.radical })} onclick={() => choose(radicalChar)}>{radicalChar}</button>
          </p>
        {/if}
        {#if variant}<p class="meta">{t('card.variantOf', { number: variant })}</p>{/if}
      </div>
    </header>

    <div class="use">
      <button class="ui-button" data-variant="primary" data-size="sm" type="button" onclick={() => put(char)}>
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        {t('card.add')}
      </button>
      <button class="ui-button" data-size="sm" type="button" onclick={() => copy(char)}>{t('common.copy')} <span class="ui-script copy-glyph">{char}</span></button>
      <button class="ui-button" data-size="sm" type="button" onclick={() => copy(address, t('card.link'))}>{t('card.copyLink')}</button>
    </div>

    {#if code}
      <section>
        <h3 class="ui-label">{t('nav.strokes')}</h3>
        <div class="codes">
          <button class="code ui-mono" type="button" title={t('card.copyCode')} onclick={() => copy(code, code)}>{code}</button>
          <a class="type" href={link('strokes', char, code)}>{t('card.typeIt')}</a>
        </div>
      </section>
    {/if}

    {#if forms.length > 1}
      <section>
        <h3 class="ui-label">{t('card.forms', { count: forms.length })}</h3>
        <div class="ui-tiles rel" style:--ui-tile-size="56px">
          {#each forms as form (form)}
            <button class="ui-tile" type="button" title={codePoint(form)} data-open={form === char ? '' : undefined} onclick={() => choose(form)} ondblclick={() => put(form)}>
              <G char={form} /><span class="ui-tile-note ui-mono">{variantOf(form) ? `VS${variantOf(form)}` : t('card.baseForm')}</span>
            </button>
          {/each}
        </div>
        <p class="ui-hint">{t('card.formsNote')}</p>
      </section>
    {/if}

    {#if entry}
      <section>
        <h3 class="ui-label">{t('card.origin')}</h3>
        {#if origins.length || entry.numeric !== null}
          <ul class="origins">
            {#each origins as origin (`${origin.relation}${origin.work}`)}
              <li>{t(`card.origin.${origin.relation}`, { char: origin.source })} <a href={WORKS[origin.work].url}>{t(WORKS[origin.work].label)}</a></li>
            {/each}
            {#if entry.numeric !== null}
              <li>{t('card.origin.numeral')} <a href={WORKS.kiyose.url}>{t(WORKS.kiyose.label)}</a>, <a href={WORKS.west2012.url}>{t(WORKS.west2012.label)}</a></li>
            {/if}
          </ul>
        {:else}
          <p class="ui-hint">{t('card.origin.none')}</p>
        {/if}
      </section>

      <section>
        <h3 class="ui-label">{t('card.record')}</h3>
        <table class="readings">
          <tbody>
            {#if entry.reading}<tr><th scope="row">{t('card.reading')}</th><td>{entry.reading}</td></tr>{/if}
            {#if entry.numeric !== null}<tr><th scope="row">{t('card.numeric')}</th><td>{entry.numeric.toLocaleString()}</td></tr>{/if}
            {#if source}<tr><th scope="row">{t('card.source')}</th><td class="cjk">{t(`card.source.${source.key}`, source.params)}</td></tr>{/if}
          </tbody>
        </table>
      </section>
    {/if}

    {#if encodingRows.length}
      <section>
        <h3 class="ui-label">{t('card.encodings')}</h3>
        <table class="readings encodings">
          <tbody>
            {#each encodingRows as row (row.label)}
              <tr><th scope="row">{row.label}</th><td class="ui-mono refs">{#each row.items as item (item)}<button class="ref" type="button" title={t('card.copyReference')} onclick={() => copy(item)}>{item}</button>{/each}</td></tr>
            {/each}
          </tbody>
        </table>
        <p class="ui-hint">{t('card.encodingsNote')}</p>
      </section>
    {/if}

    {#if under.length}
      <section>
        <h3 class="ui-label">{t('card.under', { count: under.length })}</h3>
        <div class="ui-tiles rel" style:--ui-tile-size="48px">
          {#each under.slice(0, 48) as other (other)}<button class="ui-tile" type="button" data-note="none" title={readingOf(other)} onclick={() => choose(other)}><G char={other} /></button>{/each}
        </div>
        {#if under.length > 48}<p class="more"><a href={link('radicals', char, String(number))}>{t('card.allUnder', { count: under.length })}</a></p>{/if}
      </section>
    {/if}

    {#if sameReading.length}
      <section>
        <h3 class="ui-label">{t('card.sameReading')}</h3>
        <div class="ui-tiles rel" style:--ui-tile-size="48px">
          {#each sameReading.slice(0, 48) as other (other)}<button class="ui-tile" type="button" data-note="none" onclick={() => choose(other)}><G char={other} /></button>{/each}
        </div>
      </section>
    {/if}

    {#if !isRadical(char) && !entry?.reading}<p class="ui-hint noreading">{t('card.noReading')}</p>{/if}

    <footer class="credit ui-hint">
      {t('card.credit')}
      <a href="/about">{t('nav.sources')}</a>
    </footer>
  </article>
{/if}

<style>
  .sheetbar{position:sticky;top:0;z-index:2;padding:var(--ui-space-xs) var(--ui-space-lg);background:var(--ui-color-surface);border-bottom:1px solid var(--ui-color-border)}
  .blank{display:grid;gap:var(--ui-space-md);justify-items:center;text-align:center;padding:72px var(--ui-space-3xl);color:var(--ui-color-ink-soft)}
  .blank-glyph{font-size:88px;color:var(--ui-color-border-strong);line-height:1}
  .blank-line{max-inline-size:24em}
  .blank .ui-hint{max-inline-size:26em}
  .record{display:block;padding:var(--ui-space-2xl) var(--ui-space-2xl) var(--ui-space-5xl)}
  .head{display:flex;align-items:center;gap:var(--ui-space-xl);padding-bottom:var(--ui-space-xl)}
  .glyph-frame{position:relative;display:grid;place-items:center;flex:none;inline-size:116px;block-size:116px;border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-lg);background:var(--ui-color-surface-sunken)}
  .glyph-frame::before,.glyph-frame::after{content:'';position:absolute;background:var(--ui-color-border);pointer-events:none}
  .glyph-frame::before{left:50%;top:9px;bottom:9px;width:1px}
  .glyph-frame::after{top:50%;left:9px;right:9px;height:1px}
  .glyph-frame :global(.ui-script){position:relative;z-index:1;font-size:88px}
  .facts{display:grid;gap:var(--ui-space-2xs);min-inline-size:0}
  .cp{display:inline-flex;align-items:center;justify-self:start;min-block-size:24px;margin-inline-start:-6px;padding:2px 6px;border:0;border-radius:var(--ui-radius-xs);background:none;color:var(--ui-color-ink-soft);font-size:var(--ui-text-xs)}
  .cp:hover{background:var(--ui-color-surface-hover);color:var(--ui-color-ink)}
  .gloss{font-family:var(--ui-font-serif);font-size:var(--ui-text-xl);line-height:var(--ui-leading-tight)}
  .meta{color:var(--ui-color-ink-muted);font-size:var(--ui-text-xs)}
  .inline{padding:0 3px;border:0;border-radius:var(--ui-radius-xs);background:none;color:inherit;font-size:17px;vertical-align:-2px}
  .inline:hover{background:var(--ui-color-surface-hover)}
  .use{display:flex;flex-wrap:wrap;gap:var(--ui-space-xs);padding-bottom:var(--ui-space-xl)}
  .copy-glyph{font-size:16px;line-height:1}
  section{display:grid;gap:var(--ui-space-sm);padding-block:var(--ui-space-xl);border-top:1px solid var(--ui-color-border)}
  .codes{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-xs)}
  .code{padding:4px 8px;border:1px solid var(--ui-color-border-strong);border-radius:var(--ui-radius-sm);background:var(--ui-color-surface-sunken);font-size:var(--ui-text-md)}
  .code:hover{border-color:var(--ui-color-ink-muted)}
  .type{display:inline-flex;align-items:center;min-block-size:24px;padding-inline:2px;font-size:var(--ui-text-xs);margin-inline-start:var(--ui-space-2xs)}
  .readings{border-collapse:collapse;inline-size:100%;font-size:var(--ui-text-sm)}
  .readings th{inline-size:32%;padding:var(--ui-space-2xs) var(--ui-space-sm) var(--ui-space-2xs) 0;text-align:start;font-weight:var(--ui-weight-normal);color:var(--ui-color-ink-muted);vertical-align:top}
  .readings td{padding:var(--ui-space-2xs) 0;font-family:var(--ui-font-serif);font-size:var(--ui-text-md)}
  .readings td.cjk{font-family:var(--ui-font-sans);font-size:var(--ui-text-sm)}
  .readings tr + tr{border-top:1px solid var(--ui-color-border)}
  .refs{display:flex;flex-wrap:wrap;gap:2px var(--ui-space-2xs)}
  .readings td.refs{font-family:var(--ui-font-mono);font-size:var(--ui-text-xs)}
  .ref{padding:1px 4px;border:0;border-radius:var(--ui-radius-xs);background:none;color:inherit;font:inherit}
  .ref:hover{background:var(--ui-color-surface-hover)}
  .origins{display:grid;gap:var(--ui-space-xs);margin:0;padding-inline-start:1.1em;font-size:var(--ui-text-sm);line-height:var(--ui-leading-normal)}
  .rel{gap:3px}
  .rel .ui-tile[data-open]{background:var(--ui-color-accent-soft)}
  .rel .ui-tile-note{font-size:var(--ui-text-2xs)}
  .rel :global(.ui-script){font-size:26px}
  .more{font-size:var(--ui-text-xs)}
  .noreading{padding-block:var(--ui-space-xl);border-top:1px solid var(--ui-color-border)}
  .credit{border-top:1px solid var(--ui-color-border);padding-top:var(--ui-space-lg);font-size:var(--ui-text-2xs);line-height:1.6;margin-top:var(--ui-space-xl)}
  @media (max-width:900px){
    .record{padding:var(--ui-space-lg) var(--ui-space-lg) var(--ui-space-5xl)}
    .head{gap:var(--ui-space-lg)}
    .glyph-frame{inline-size:96px;block-size:96px}
    .glyph-frame :global(.ui-script){font-size:72px}
    .gloss{font-size:var(--ui-text-lg)}
  }
</style>

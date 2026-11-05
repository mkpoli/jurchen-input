<script>
  // Convert: text stored in an older font's Private Use codes, turned into Unicode 18, and back. Codes
  // with no known character stay in the result and are listed.
  import { analyze, toBabelStone, toUnicode, toZhonghuaZiku } from '../../src/index.js'
  import { codePoint } from '../lib/script.js'
  import { route, setQuery } from '../lib/route.svelte.js'
  import { autofocus } from '../lib/ui.svelte.js'
  import { insert } from '../lib/text.svelte.js'
  import { copy, say } from '../lib/clip.svelte.js'
  import { t } from '../lib/i18n.svelte.js'

  let input = $state(route.q)
  let direction = $state(/** @type {'unicode' | 'babelstone' | 'zhzk'} */ ('unicode'))
  let babelstone = $state(true)
  let font = $state(/** @type {'' | 'toyo' | 'tianyige'} */ (''))

  const options = $derived({ babelstone, font: font || undefined })
  const unicode = $derived(toUnicode(input, options))
  const output = $derived(direction === 'unicode' ? unicode : direction === 'babelstone' ? toBabelStone(unicode) : toZhonghuaZiku(unicode))
  const found = $derived(analyze(input))
  // Every Private Use code the result still holds. Written the other way, the result is meant to be
  // Private Use, so only what the input could not read is listed.
  const left = $derived(direction === 'unicode' ? [...new Set(output.match(/[\uE000-\uF8FF\u{F0000}-\u{10FFFD}]/gu) ?? [])] : found.unknown)
  const needsFont = $derived(babelstone && !font && found.fontSpecific.length > 0)

  const scripted = $derived(direction === 'unicode')
</script>

<div class="ui-page convert" data-width="wide">
  <header class="ui-page-head">
    <h1 class="ui-page-title">{t('nav.convert')}</h1>
    <p class="ui-page-intro">{t('convert.intro')}</p>
  </header>

  <label class="field-block">
    <span class="ui-label">{t('convert.input')}</span>
    <textarea class="ui-textarea" data-primary rows="4" spellcheck="false" autocomplete="off" placeholder={t('convert.placeholder')} value={input}
      oninput={(/** @type {Event & { currentTarget: HTMLTextAreaElement }} */ event) => { input = event.currentTarget.value; setQuery(input.length < 200 ? input : '') }} use:autofocus></textarea>
  </label>

  <div class="options">
    <label class="option">
      <span class="ui-label">{t('convert.direction')}</span>
      <span class="ui-select-wrap">
        <select class="ui-select" bind:value={direction}>
          <option value="unicode">{t('convert.to.unicode')}</option>
          <option value="babelstone">{t('convert.to.babelstone')}</option>
          <option value="zhzk">{t('convert.to.zhzk')}</option>
        </select>
      </span>
    </label>
    <label class="ui-check-row" title={t('convert.readBabelstoneHint')}><input class="ui-checkbox" type="checkbox" bind:checked={babelstone} /> <span>{t('convert.readBabelstone')}</span></label>
    {#if found.fontSpecific.length}
      <label class="option">
        <span class="ui-label">{t('convert.font')}</span>
        <span class="ui-select-wrap">
          <select class="ui-select" bind:value={font}>
            <option value="">{t('convert.font.any')}</option>
            <option value="toyo">{t('convert.font.toyo')}</option>
            <option value="tianyige">{t('convert.font.tianyige')}</option>
          </select>
        </span>
      </label>
    {/if}
  </div>
  {#if needsFont}<p class="ui-notice">{t('convert.fontHint')}</p>{/if}

  {#if input}
    <section class="result" aria-label={t('convert.output')}>
      <div class="ui-section-head">
        <h2 class="ui-label">{t('convert.output')}</h2>
        <span class="ui-count" role="status">{t('convert.stats', { unicode: found.unicode, babelstone: found.babelstone, zhzk: found.zhzk })}</span>
      </div>
      <output class="out" class:ui-script={scripted} lang={scripted ? 'juc' : undefined}>{output}</output>
      <div class="tools">
        <button class="ui-button" data-variant="primary" data-size="sm" type="button" onclick={() => copy(output, t('convert.result'))}>{t('convert.copy')}</button>
        {#if scripted}<button class="ui-button" data-size="sm" type="button" onclick={() => { insert(output); say(t('convert.addToText')) }}>{t('convert.addToText')}</button>{/if}
      </div>
    </section>

    {#if left.length}
      <section class="ui-section" aria-label={t('convert.left')}>
        <div class="ui-section-head"><h2 class="ui-label">{t('convert.left')}</h2><span class="ui-count">{left.length}</span></div>
        <p class="codes ui-mono">{left.map(codePoint).join(' ')}</p>
        <p class="ui-hint">{t('convert.leftHint')}</p>
      </section>
    {/if}
    <p class="ui-hint">{t('convert.formsNote')}</p>
  {:else}
    <p class="ui-empty">{t('convert.empty')}</p>
  {/if}
</div>

<style>
  .convert{gap:var(--ui-space-xl)}
  .field-block{display:grid;gap:var(--ui-space-xs)}
  .field-block .ui-textarea{font-size:20px;line-height:1.5}
  .options{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-md) var(--ui-space-2xl)}
  .option{display:flex;align-items:center;gap:var(--ui-space-sm)}
  .result{display:grid;gap:var(--ui-space-sm)}
  .out{display:block;min-block-size:64px;padding:var(--ui-space-md) var(--ui-space-lg);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-md);background:var(--ui-color-surface);overflow-wrap:anywhere;white-space:pre-wrap}
  .out.ui-script{font-size:30px;line-height:1.4}
  .tools{display:flex;flex-wrap:wrap;gap:var(--ui-space-xs)}
  .codes{font-size:var(--ui-text-sm);overflow-wrap:anywhere}
</style>

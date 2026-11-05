<script>
  // Transcribe: the text being written, each character with its reading under it, line by line.
  import { db } from '../lib/db.svelte.js'
  import { readingOf } from '../lib/index.js'
  import { clusters } from '../lib/script.js'
  import { text, asReadings } from '../lib/text.svelte.js'
  import { choose } from '../lib/ui.svelte.js'
  import { route } from '../lib/route.svelte.js'
  import { copy } from '../lib/clip.svelte.js'
  import { t } from '../lib/i18n.svelte.js'
  import G from '../ui/G.svelte'

  const ready = $derived(db.status === 'ready')
  const lines = $derived(text.value.split('\n').map(line => clusters(line)).filter(line => line.length))
</script>

<div class="ui-page transcribe" data-width="wide">
  <header class="ui-page-head">
    <h1 class="ui-page-title">{t('nav.transcribe')}</h1>
    <p class="ui-page-intro">{t('transcribe.intro')}</p>
  </header>

  {#if !lines.length}
    <p class="ui-empty">{t('transcribe.empty')}</p>
  {:else if ready}
    <div class="tools">
      <span class="ui-count">{t('common.characters', { count: lines.flat().length })}</span>
      <button class="ui-button" data-size="sm" type="button" onclick={() => copy(asReadings(text.value), t('transcribe.readings'))}>{t('transcribe.copy')}</button>
    </div>
    {#each lines as line, l (l)}
      <ol class="line">
        {#each line as char, i (`${l}:${i}`)}
          <li>
            <button type="button" class="cell" data-open={route.c === char ? '' : undefined} onclick={() => choose(char)}>
              <G {char} /><span class="said">{readingOf(char) || '—'}</span>
            </button>
          </li>
        {/each}
      </ol>
    {/each}
  {/if}
</div>

<style>
  .tools{display:flex;align-items:center;gap:var(--ui-space-md)}
  .line{display:flex;flex-wrap:wrap;gap:var(--ui-space-2xs);margin:0;padding:0;list-style:none}
  .cell{display:grid;justify-items:center;gap:2px;min-inline-size:60px;padding:var(--ui-space-xs);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-sm);background:var(--ui-color-surface)}
  .cell:hover,.cell[data-open]{background:var(--ui-color-surface-hover)}
  .cell :global(.ui-script){font-size:34px;line-height:1.15}
  .said{font-family:var(--ui-font-serif);font-size:var(--ui-text-sm)}
</style>

<script>
  // Strokes, the input method: five letters name the first four strokes and the last one of a
  // character. The code box behaves like an input method: candidates are numbered, Space or a digit
  // commits one into the text, Backspace in an empty box deletes from the text. The keys below dim
  // when no code continues with them.
  import { untrack } from 'svelte'
  import { db } from '../lib/db.svelte.js'
  import { readingOf } from '../lib/index.js'
  import G from '../ui/G.svelte'
  import { route, setQuery } from '../lib/route.svelte.js'
  import { preview, put, autofocus } from '../lib/ui.svelte.js'
  import { backspace } from '../lib/text.svelte.js'
  import { byCode, nextLetters } from '../lib/search.js'
  import { variantOf } from '../lib/script.js'
  import { t } from '../lib/i18n.svelte.js'

  const PAGE = 9
  // Each stroke drawn as the Alari table's own schema draws it: a radical of that one stroke.
  const KEYS = /** @type {const} */ ([
    { letter: 'h', glyph: '\u{191A0}' },
    { letter: 's', glyph: '\u{191B0}' },
    { letter: 'p', glyph: '\u{191BF}' },
    { letter: 'd', glyph: '\u{191D0}' },
    { letter: 'z', glyph: '\u{191A1}' },
  ])
  const clean = (/** @type {string} */ value) => value.toLowerCase().replace(/[^hspdzb]/g, '').slice(0, 6)

  let code = $state(clean(route.q))
  let page = $state(0)
  let active = $state(0)
  let variants = $state(true)
  /** @type {HTMLInputElement | null} */
  let input = $state(null)
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

  const ready = $derived(db.status === 'ready')
  const hits = $derived(ready ? byCode(code, { variants }) : [])
  const pages = $derived(Math.max(1, Math.ceil(hits.length / PAGE)))
  const shown = $derived(hits.slice(page * PAGE, page * PAGE + PAGE))
  const next = $derived(ready ? nextLetters(code) : new Map())

  $effect(() => {
    // A new code starts at the first page; the highlighted candidate is previewed in the card.
    void code
    void variants
    page = 0
    active = 0
  })
  $effect(() => {
    const char = shown[active]?.char
    // Only the highlight drives this: a form chosen in the card stays chosen.
    if (char) untrack(() => preview(char))
  })

  /** @param {string} value */
  function setCode(value) {
    code = clean(value)
    setQuery(code)
  }

  /** @param {number} index */
  function commit(index) {
    const hit = shown[index]
    if (!hit) return
    put(hit.char)
    setCode('')
    input?.focus()
  }

  /** @param {string} letter */
  function press(letter) {
    if (letter === 'back') {
      if (code) setCode(code.slice(0, -1))
      else backspace()
    } else if (letter === 'space') {
      if (code) commit(active)
    } else setCode(code + letter)
    if (!touch) input?.focus()
  }

  /** @param {number} delta */
  function turn(delta) {
    page = (page + delta + pages) % pages
    active = 0
  }

  /** @param {KeyboardEvent} event */
  function keys(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const k = event.key
    if (k === 'Backspace' && !code) { event.preventDefault(); backspace(); return }
    if (k === 'Escape' && code) { event.preventDefault(); setCode(''); return }
    if (!code) return
    if (k === ' ' || k === 'Enter') { event.preventDefault(); commit(active) }
    else if (/^[1-9]$/.test(k)) { event.preventDefault(); commit(Number(k) - 1) }
    else if (k === 'ArrowRight') { event.preventDefault(); if (active < shown.length - 1) active++; else if (page < pages - 1) turn(1) }
    else if (k === 'ArrowLeft') { event.preventDefault(); if (active > 0) active--; else if (page > 0) { turn(-1); active = PAGE - 1 } }
    else if (k === 'ArrowDown' || k === 'PageDown' || k === '=' || k === '.') { event.preventDefault(); turn(1) }
    else if (k === 'ArrowUp' || k === 'PageUp' || k === '-' || k === ',') { event.preventDefault(); turn(-1) }
  }

  /** The letters of a candidate's code: the typed part, then the rest. @param {string} full */
  const split = full => [full.slice(0, code.length), full.slice(code.length)]
</script>

<div class="ui-page strokes" data-width="wide">
  <section class="composer" aria-label={t('strokes.label')}>
    <div class="box">
      <input bind:this={input} data-primary class="ui-input code-input ui-mono" value={code} spellcheck="false" autocomplete="off" autocapitalize="off"
        inputmode={touch ? 'none' : 'text'} aria-label={t('strokes.label')} placeholder={t('strokes.placeholder')}
        oninput={(/** @type {Event & { currentTarget: HTMLInputElement }} */ event) => { setCode(event.currentTarget.value); event.currentTarget.value = code }} onkeydown={keys} use:autofocus />
      <span class="ui-count count" role="status">{#if code}{hits.length ? t('common.characters', { count: hits.length }) : t('strokes.none')}{/if}</span>
    </div>

    <div class="ui-candidates" role="listbox" aria-label={t('common.candidates')} data-idle={!code ? '' : undefined}>
      {#if code && shown.length}
        {#each shown as hit, i (hit.char)}
          {@const [typed, rest] = split(hit.code)}
          <button type="button" role="option" class="ui-candidate" aria-selected={i === active}
            onclick={() => commit(i)} onmouseenter={() => { active = i }} title={readingOf(hit.char)}>
            <span class="ui-candidate-number">{i + 1}</span>
            <G char={hit.char} />
            <span class="ui-candidate-code"><span class="typed">{typed}</span>{rest}{#if variantOf(hit.char)}<sup class="vs">VS{variantOf(hit.char)}</sup>{/if}</span>
          </button>
        {/each}
        {#if pages > 1}
          <span class="ui-pager">
            <button type="button" class="ui-button" data-variant="quiet" data-size="icon-sm" aria-label={t('common.previous')} onclick={() => turn(-1)}>‹</button>
            <span>{page + 1}/{pages}</span>
            <button type="button" class="ui-button" data-variant="quiet" data-size="icon-sm" aria-label={t('common.more')} onclick={() => turn(1)}>›</button>
          </span>
        {/if}
      {:else if code}
        <p>{t('strokes.noCode', { code })}</p>
      {:else}
        <p class="idle-keys">{@html t('strokes.keys')}</p>
      {/if}
    </div>
    <label class="ui-check-row"><input class="ui-checkbox" type="checkbox" bind:checked={variants} /> <span>{t('strokes.includeVariants')}</span></label>
  </section>

  <div class="split">
    <section class="keyboard" aria-label={t('strokes.keysLabel')}>
      <div class="ui-keys">
        <div class="ui-key-row">
          {#each KEYS as key (key.letter)}
            {@const n = next.get(key.letter) ?? 0}
            <button type="button" class="ui-key" data-dead={!n ? '' : undefined} onclick={() => press(key.letter)}
              title={n ? t('strokes.keyContinues', { count: n, letter: key.letter }) : t('strokes.keyDead', { letter: key.letter })}>
              <span class="ui-key-letter">{key.letter}</span>
              <span class="ui-key-glyphs ui-script">{key.glyph}</span>
            </button>
          {/each}
          <button type="button" class="ui-key" data-dead={!next.get('b') ? '' : undefined} onclick={() => press('b')}
            title={next.get('b') ? t('strokes.keyContinues', { count: next.get('b'), letter: 'b' }) : t('strokes.keyDead', { letter: 'b' })}>
            <span class="ui-key-letter">b</span>
            <span class="ui-key-glyphs radical-key">{t('strokes.radicalKey')}</span>
          </button>
          <button type="button" class="ui-key" data-wide onclick={() => press('back')} aria-label={t('common.backspace')}>⌫</button>
        </div>
        <div class="ui-key-row"><button type="button" class="ui-key" data-space onclick={() => press('space')} disabled={!code}>{#if shown[active]}{t('strokes.spaceAdds')} <span class="ui-script">{shown[active].char}</span>{:else}{t('strokes.space')}{/if}</button></div>
      </div>
    </section>

    <section class="legend" aria-label={t('strokes.legend')}>
      <h2 class="ui-label">{t('strokes.legend')}</h2>
      <p class="ui-hint rule">{t('strokes.rule')}</p>
      <dl>
        {#each ['h', 's', 'p', 'd', 'z', 'b'] as letter (letter)}
          <dt class="ui-mono">{letter}</dt><dd>{t(`strokes.key.${letter}`)}</dd>
        {/each}
      </dl>
      <p class="ui-notice">{t('strokes.note')}</p>
    </section>
  </div>
</div>

<style>
  .composer{display:grid;gap:var(--ui-space-md)}
  .box{display:flex;align-items:center;gap:var(--ui-space-xl)}
  .code-input{flex:1;min-inline-size:0;min-block-size:60px;padding:var(--ui-space-md) var(--ui-space-xl);border-radius:var(--ui-radius-lg);font-size:30px;letter-spacing:.14em;text-transform:lowercase}
  .code-input::placeholder{font-family:var(--ui-font-sans);font-size:var(--ui-text-lg);letter-spacing:.02em;text-transform:none}
  .count{min-inline-size:9em;text-align:end}
  .idle-keys{color:var(--ui-color-ink-muted);font-size:var(--ui-text-sm)}
  .strokes .ui-candidate :global(.ui-script){font-size:34px}
  .vs{margin-inline-start:2px;font-size:.8em;color:var(--ui-color-ink-muted)}
  .split{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:var(--ui-space-3xl);align-items:start}
  .keyboard,.legend{min-inline-size:0}
  .legend{display:grid;gap:var(--ui-space-sm)}
  .rule{font-size:var(--ui-text-sm)}
  dl{display:grid;grid-template-columns:24px minmax(0,1fr);gap:var(--ui-space-2xs) var(--ui-space-sm);margin:0;font-size:var(--ui-text-sm)}
  dt{font-weight:var(--ui-weight-semibold)}
  dd{margin:0;color:var(--ui-color-ink-soft)}
  .ui-key-row .ui-key{flex:1}
  .radical-key{font-family:var(--ui-font-sans);font-size:var(--ui-text-2xs)}
  @media (max-width:1320px){.split{grid-template-columns:1fr}}
  @media (max-width:900px){
    .code-input{min-block-size:50px;padding:var(--ui-space-sm) var(--ui-space-md);font-size:24px}
    .count,.idle-keys{display:none}
    .strokes .ui-candidate :global(.ui-script){font-size:30px}
    .ui-key{max-inline-size:none}
  }
</style>

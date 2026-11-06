<script>
  // Draw: sketch the character and see the glyphs closest to it in overall shape. There is no
  // recognizer for the script; this compares where ink lies with the printed glyphs of the one face
  // that draws it, and says so beside the results.
  import { onMount } from 'svelte'
  import { db } from '../lib/db.svelte.js'
  import { ix, readingOf } from '../lib/index.js'
  import { isRadical, variantOf } from '../lib/script.js'
  import { loadShapes } from '../lib/data.js'
  import { parseShapes, indexShapes, rasterize, rankShapes, SIZE } from '../lib/shape.js'
  import { put } from '../lib/ui.svelte.js'
  import Candidates from '../ui/Candidates.svelte'
  import { t } from '../lib/i18n.svelte.js'

  /** @type {HTMLCanvasElement | null} */
  let canvas = $state(null)
  /** @type {[number, number][][]} */
  let strokes = $state.raw([])
  /** @type {[number, number][] | null} */
  let current = null
  let useCount = $state(true)
  let radicals = $state(false)
  let variants = $state(true)
  let active = $state(-1)
  /** @type {'loading' | 'ready' | 'failed'} */
  let status = $state('loading')
  /** @type {import('../lib/shape.js').ShapeIndex | null} */
  let index = $state.raw(null)
  /** @type {Uint8Array} */
  let mask = $state.raw(new Uint8Array(SIZE * SIZE))
  /** @type {Candidates | null} */
  let grid = $state(null)

  onMount(() => {
    loadShapes()
      .then(bytes => {
        index = indexShapes(parseShapes(bytes))
        status = 'ready'
      })
      .catch(() => { status = 'failed' })
    resize()
  })

  const strokeCount = $derived(strokes.length)

  const hits = $derived.by(() => {
    if (status !== 'ready' || db.status !== 'ready' || !index || !strokes.length) return []
    return rankShapes(index, mask, {
      limit: 48,
      strokes: useCount ? strokeCount : 0,
      strokeCounts: ix.strokes,
      only: char => (radicals || !isRadical(char)) && (variants || !variantOf(char)),
    })
  })
  const items = $derived(hits.map(hit => ({ char: hit.char, sub: readingOf(hit.char) || '—', title: t('draw.strokes', { count: ix.strokes.get(hit.char) ?? '?' }) })))

  function resize() {
    if (!canvas) return
    const box = canvas.getBoundingClientRect()
    const ratio = devicePixelRatio || 1
    canvas.width = Math.round(box.width * ratio)
    canvas.height = Math.round(box.height * ratio)
    paint()
  }

  function paint() {
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const ratio = devicePixelRatio || 1
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    const { width, height } = canvas.getBoundingClientRect()
    context.clearRect(0, 0, width, height)
    const ink = getComputedStyle(canvas).color
    context.strokeStyle = ink
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = Math.max(5, width / 42)
    for (const stroke of [...strokes, ...(current ? [current] : [])]) {
      context.beginPath()
      stroke.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y))
      if (stroke.length === 1) context.lineTo(stroke[0][0] + 0.1, stroke[0][1])
      context.stroke()
    }
  }

  /** @param {PointerEvent} event @returns {[number, number]} */
  function point(event) {
    const box = /** @type {HTMLCanvasElement} */ (canvas).getBoundingClientRect()
    return [event.clientX - box.left, event.clientY - box.top]
  }

  /** @param {PointerEvent} event */
  function down(event) {
    if (event.button !== 0) return
    canvas?.setPointerCapture(event.pointerId)
    current = [point(event)]
    paint()
  }
  /** @param {PointerEvent} event */
  function moveTo(event) {
    if (!current) return
    const [x, y] = point(event)
    const last = current[current.length - 1]
    if (Math.hypot(x - last[0], y - last[1]) < 2) return
    current.push([x, y])
    paint()
  }
  function up() {
    if (!current) return
    strokes = [...strokes, current]
    current = null
    update()
  }

  function update() {
    mask = rasterize(strokes)
    active = -1
    paint()
  }
  function undo() { strokes = strokes.slice(0, -1); update() }
  function clear() { strokes = []; update() }

  /** @param {KeyboardEvent} event */
  function keys(event) {
    const typing = /** @type {HTMLElement} */ (event.target).closest('input, textarea')
    // An open dialog owns the keyboard, and the drawing behind it stays as it is.
    if (typing || document.querySelector('dialog[open]')) return
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') { event.preventDefault(); undo(); return }
    if (event.key === 'Escape') { clear(); return }
    if (event.key === 'Enter' && active < 0 && hits[0]) { put(hits[0].char); clear(); return }
    if (grid?.key(event)) event.preventDefault()
  }
</script>

<svelte:window onresize={resize} onkeydown={keys} />

<div class="ui-page draw" data-width="wide">
  <section class="pad-column" aria-label={t('draw.padLabel')}>
    <header class="ui-page-head">
      <h1 class="ui-page-title">{t('nav.draw')}</h1>
      <p class="ui-page-intro">{t('draw.intro')}</p>
    </header>
    <div class="pad">
      <canvas bind:this={canvas} aria-label={t('draw.canvas')}
        onpointerdown={down} onpointermove={moveTo} onpointerup={up} onpointercancel={up}></canvas>
      {#if !strokes.length}<p class="hint" aria-hidden="true">{t('draw.here')}</p>{/if}
    </div>
    <div class="tools">
      <button type="button" class="ui-button" data-size="sm" onclick={undo} disabled={!strokes.length}>{t('draw.undo')}</button>
      <button type="button" class="ui-button" data-size="sm" onclick={clear} disabled={!strokes.length}>{t('draw.clear')}</button>
      <span class="ui-count strokes">{t('draw.strokes', { count: strokes.length })}</span>
    </div>
  </section>

  <section class="notes" aria-label={t('draw.optionsLabel')}>
    <div class="options">
      <label class="ui-check-row"><input class="ui-checkbox" type="checkbox" bind:checked={useCount} onchange={update} /> <span>{t('draw.favourStrokes', { count: strokes.length || '—' })}</span></label>
      <label class="ui-check-row"><input class="ui-checkbox" type="checkbox" bind:checked={variants} onchange={update} /> <span>{t('draw.includeVariants')}</span></label>
      <label class="ui-check-row"><input class="ui-checkbox" type="checkbox" bind:checked={radicals} onchange={update} /> <span>{t('draw.includeRadicals')}</span></label>
    </div>
    <p class="ui-notice">{t('draw.note')}</p>
  </section>

  <section class="results" aria-label={t('draw.resultsLabel')}>
    <div class="ui-section-head">
      <h2 class="ui-label">{t('draw.results')}</h2>
      {#if status === 'loading'}<span class="ui-count">{t('draw.loading')}</span>{:else if status === 'failed'}<span class="ui-count">{t('draw.failed')}</span>{/if}
    </div>
    {#if items.length}
      <Candidates bind:this={grid} {items} bind:active size={70} label={t('draw.results')} />
      <p class="ui-hint keys">{@html t('draw.keys')}</p>
    {:else}
      <p class="ui-empty">{t('draw.empty')}</p>
    {/if}
  </section>
</div>

<style>
  .draw{display:grid;grid-template-columns:minmax(280px,400px) minmax(0,1fr);grid-template-areas:"pad results" "notes results";grid-template-rows:auto 1fr;gap:var(--ui-space-xl) var(--ui-space-3xl);align-items:start}
  .pad-column{grid-area:pad;display:grid;gap:var(--ui-space-lg)}
  .notes{grid-area:notes;display:grid;gap:var(--ui-space-md)}
  .results{grid-area:results;min-inline-size:0}
  .pad{position:relative;aspect-ratio:1;border:1px solid var(--ui-color-border-strong);border-radius:var(--ui-radius-xl);background:var(--ui-color-surface-sunken);overflow:hidden}
  .pad::before,.pad::after{content:"";position:absolute;background:var(--ui-color-border);pointer-events:none}
  .pad::before{left:50%;top:14px;bottom:14px;width:1px}
  .pad::after{top:50%;left:14px;right:14px;height:1px}
  canvas{position:relative;z-index:1;display:block;width:100%;height:100%;touch-action:none;cursor:crosshair;color:var(--ui-color-ink)}
  .hint{position:absolute;left:0;right:0;bottom:16px;text-align:center;color:var(--ui-color-ink-muted);font-size:var(--ui-text-2xs);letter-spacing:var(--ui-tracking-caps);text-transform:uppercase;pointer-events:none}
  .tools{display:flex;align-items:center;gap:var(--ui-space-xs)}
  .strokes{margin-inline-start:auto}
  .options{display:grid;gap:2px}
  .keys{margin-top:var(--ui-space-md)}
  @media (max-width:1100px){.draw{grid-template-columns:minmax(0,440px);grid-template-areas:"pad" "results" "notes"}}
  @media (max-width:900px){.keys{display:none}.results :global(.ui-tiles){--ui-tile-size:54px !important}}
</style>

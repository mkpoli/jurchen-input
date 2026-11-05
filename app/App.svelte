<script>
  // The frame: the bar with the finders, the text being written, the finder of the page, and the
  // card of the open character beside it (a sheet over it on a phone).
  import { tick } from 'svelte'
  import { db, load } from './lib/db.svelte.js'
  import { route, go, PAGES, GROUPS, PRIMARY } from './lib/route.svelte.js'
  import { ui, applyTheme } from './lib/ui.svelte.js'
  import { MARK } from './lib/script.js'
  import { toast } from './lib/clip.svelte.js'
  import { t } from './lib/i18n.svelte.js'
  import { applySeo } from './lib/seo.js'
  import Writing from './ui/Writing.svelte'
  import SettingsRows from './ui/SettingsRows.svelte'
  import Card from './ui/Card.svelte'
  import Find from './pages/Find.svelte'
  import Strokes from './pages/Strokes.svelte'
  import Radicals from './pages/Radicals.svelte'
  import Reading from './pages/Reading.svelte'
  import Draw from './pages/Draw.svelte'
  import Transcribe from './pages/Transcribe.svelte'
  import About from './pages/About.svelte'

  load()
  applyTheme()
  // A shared link to a character shows that character on a phone too: the bare address Copy link
  // gives, on arrival. A finder's preview also puts a character in the address, and a reload keeps
  // whatever the reader had closed.
  const reloaded = /** @type {PerformanceNavigationTiming | undefined} */ (performance.getEntriesByType('navigation')[0])?.type === 'reload'
  if (route.c && route.page === '' && !route.q && !reloaded && matchMedia('(max-width: 900px)').matches) ui.sheet = true

  /** @type {HTMLElement | null} */
  let settingsTrigger = $state(null)
  /** @type {HTMLElement | null} */
  let settingsPop = $state(null)
  let settingsOpen = $state(false)
  let settingsSheetOpen = $state(false)
  /** @type {HTMLDialogElement | null} */
  let settingsDialog = $state(null)
  /** The phone's tab strip, scrolled to keep the current finder in view. @type {HTMLElement | null} */
  let tabs = $state(null)
  /** On a phone the strip holds the four finders a reader starts from; the rest wait in a sheet. */
  const EXTRAS = new Set(['radicals', 'transcribe'])
  let menu = $state(false)
  /** @type {HTMLDialogElement | null} */
  let sheet = $state(null)
  /** @type {HTMLElement | null} */
  let moreButton = $state(null)

  $effect(() => {
    void route.page
    applySeo(route.page)
    tabs?.querySelector('a.on')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  })

  // The phone sheet is a real dialog: the browser traps focus in it, closes it on Escape and
  // returns focus to the button that opened it.
  $effect(() => {
    if (!sheet) return
    if (menu && !sheet.open) sheet.showModal()
    if (!menu && sheet.open) sheet.close()
  })

  /** @param {MouseEvent} event @param {import('./lib/route.svelte.js').Page} page */
  function nav(event, page) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    go(page)
  }

  /** `/` focuses the page's input from anywhere outside a field. @param {KeyboardEvent} event */
  function keys(event) {
    const target = /** @type {HTMLElement} */ (event.target)
    const typing = target.closest('input, textarea, [contenteditable]')
    if (event.key === '/' && !typing) {
      const input = /** @type {HTMLElement | null} */ (document.querySelector('[data-primary]'))
      if (input) { event.preventDefault(); input.focus() }
    }
    if (event.key === 'Escape') {
      if (ui.sheet) ui.sheet = false
      if (settingsOpen || settingsSheetOpen) closeSettings()
    }
  }

  /** Open the settings: an anchored popover on a wide screen, a sheet on a phone. */
  async function openSettings() {
    if (matchMedia('(max-width: 900px)').matches) {
      settingsSheetOpen = true
      return
    }
    settingsOpen = true
    await tick()
    settingsPop?.querySelector('select')?.focus()
  }

  /** @param {boolean} [restore] */
  function closeSettings(restore = true) {
    settingsOpen = false
    settingsSheetOpen = false
    if (restore) settingsTrigger?.focus()
  }

  $effect(() => {
    if (!settingsOpen) return
    const outside = (/** @type {PointerEvent} */ event) => {
      if (!(/** @type {HTMLElement} */ (event.target)).closest('.settings')) settingsOpen = false
    }
    addEventListener('pointerdown', outside)
    return () => removeEventListener('pointerdown', outside)
  })

  $effect(() => {
    if (!settingsDialog) return
    if (settingsSheetOpen && !settingsDialog.open) settingsDialog.showModal()
    if (!settingsSheetOpen && settingsDialog.open) settingsDialog.close()
  })

  /** @param {FocusEvent} event */
  function settingsBlur(event) {
    const next = /** @type {Node | null} */ (event.relatedTarget)
    if (settingsOpen && next && !(/** @type {HTMLElement} */ (event.currentTarget)).contains(next)) settingsOpen = false
  }

</script>

<svelte:window onkeydown={keys} />

<div class="shell">
  <header class="top">
    <a class="mark" href="/" onclick={event => nav(event, '')} aria-label={t('app.home')}>
      <span class="badge ui-script" aria-hidden="true">{MARK}</span>
      <span class="name">{t('app.name')}</span>
    </a>
    <nav class="finders" aria-label={t('nav.label')}>
      <a href="/" class="primary" class:on={route.page === ''} aria-current={route.page === '' ? 'page' : undefined}
        title={t(PRIMARY.hint)} onclick={event => nav(event, '')}>{t(PRIMARY.label)}</a>
      {#each GROUPS as group (group.label)}
        <div class="group" role="group" aria-label={t(group.label)}>
          {#each group.pages as page (page.path)}
            <a href="/{page.path}" class:on={route.page === page.path} aria-current={route.page === page.path ? 'page' : undefined}
              title={t(page.hint)} onclick={event => nav(event, page.path)}>{t(page.label)}</a>
          {/each}
        </div>
      {/each}
    </nav>
    <div class="aside">
      <div class="settings" onfocusout={settingsBlur}>
        <button class="ui-button" data-variant="quiet" data-size="icon" type="button" bind:this={settingsTrigger}
          aria-label={t('settings.label')} title={t('settings.label')} aria-haspopup="dialog"
          aria-expanded={settingsOpen || settingsSheetOpen}
          onclick={() => { settingsOpen || settingsSheetOpen ? closeSettings() : openSettings() }}>
          <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        </button>
        {#if settingsOpen}
          <div class="settings-pop ui-popover" role="dialog" aria-label={t('settings.label')} bind:this={settingsPop}>
            <div class="settings-head">
              <span class="ui-label">{t('settings.label')}</span>
              <button class="ui-button" data-variant="quiet" data-size="icon-sm" type="button" aria-label={t('settings.close')} onclick={() => closeSettings()}>×</button>
            </div>
            <SettingsRows />
          </div>
        {/if}
      </div>
    </div>
  </header>

  <Writing />

  {#if db.status === 'failed'}
    <p class="fault">{t('app.failed')}</p>
  {:else}
    <div class="body" class:full={route.page === 'about'}>
      <main class="finder" aria-label={t(PAGES.find(p => p.path === route.page)?.label ?? 'nav.sources')}>
        {#if route.page === ''}<Find />
        {:else if route.page === 'strokes'}<Strokes />
        {:else if route.page === 'reading'}<Reading />
        {:else if route.page === 'transcribe'}<Transcribe />
        {:else if route.page === 'draw'}<Draw />
        {:else if route.page === 'radicals'}<Radicals />
        {:else}<About />{/if}
        {#if route.page !== 'about'}
          <footer class="foot ui-hint">
            †
            <a href="/about" title={t('nav.sources.hint')} onclick={event => nav(event, 'about')}>{t('nav.sources')}</a>
          </footer>
        {/if}
      </main>
      {#if route.page !== 'about'}
        <aside class="card" class:open={ui.sheet} aria-label={t('card.label')}>
          <Card />
        </aside>
      {/if}
    </div>
  {/if}

  <nav class="tabs" aria-label={t('nav.label')} bind:this={tabs}>
    {#each PAGES as page (page.path)}
      <a href="/{page.path}" class:on={route.page === page.path} class:extra={EXTRAS.has(page.path)}
        aria-current={route.page === page.path ? 'page' : undefined}
        onclick={event => nav(event, page.path)}>{t(page.label)}</a>
    {/each}
    <button class="more" class:on={EXTRAS.has(route.page) || route.page === 'about'} type="button" bind:this={moreButton}
      aria-expanded={menu} aria-haspopup="dialog" onclick={() => { menu = true }}>{t('nav.more')}</button>
  </nav>

  <dialog class="sheet" bind:this={sheet} aria-label={t('nav.label')}
    onclose={() => { menu = false; moreButton?.focus() }}
    onclick={(/** @type {MouseEvent} */ event) => { if (event.target === sheet) menu = false }}>
    <div class="sheet-head">
      <p class="ui-label">{t('nav.more')}</p>
      <button class="ui-button" data-variant="quiet" data-size="icon-sm" type="button" aria-label={t('nav.menuClose')}
        onclick={() => { menu = false }}>×</button>
    </div>
    <div class="sheet-links">
      {#each GROUPS as group (group.label)}
        {@const extras = group.pages.filter(page => EXTRAS.has(page.path))}
        {#if extras.length}
          <p class="ui-label sheet-group">{t(group.label)}</p>
          {#each extras as page (page.path)}
            <a class="sheet-link" href="/{page.path}" class:on={route.page === page.path} aria-current={route.page === page.path ? 'page' : undefined}
              onclick={event => { menu = false; nav(event, page.path) }}>
              <span class="sheet-name">{t(page.label)}</span><span class="ui-hint">{t(page.hint)}</span>
            </a>
          {/each}
        {/if}
      {/each}
    </div>
  </dialog>

  <dialog class="sheet settings-sheet" bind:this={settingsDialog} aria-label={t('settings.label')}
    onclose={() => { settingsSheetOpen = false; settingsTrigger?.focus() }}
    onclick={(/** @type {MouseEvent} */ event) => { if (event.target === settingsDialog) closeSettings() }}>
    <div class="sheet-head">
      <p class="ui-label">{t('settings.label')}</p>
      <button class="ui-button" data-variant="quiet" data-size="icon-sm" type="button" aria-label={t('settings.close')}
        onclick={() => closeSettings()}>×</button>
    </div>
    <SettingsRows />
  </dialog>

  <div class="toast" role="status" aria-live="polite">{#if toast.message}<span class="ui-toast">{toast.message}</span>{/if}</div>
</div>

<style>
  .shell{min-block-size:100dvh;display:flex;flex-direction:column}
  .top{position:sticky;top:0;z-index:var(--ui-z-chrome);display:flex;align-items:center;gap:var(--ui-space-xl);block-size:var(--topbar-h);padding-inline:var(--ui-space-2xl);background:var(--ui-color-surface);border-bottom:1px solid var(--ui-color-border)}
  .mark{display:flex;align-items:center;gap:var(--ui-space-sm);color:var(--ui-color-ink);text-decoration:none}
  .badge{display:grid;place-items:center;inline-size:30px;block-size:30px;border-radius:var(--ui-radius-sm);background:var(--ui-color-accent);color:var(--ui-color-on-accent);font-size:21px}
  .name{font-family:var(--ui-font-serif);font-size:17px;font-weight:var(--ui-weight-semibold);letter-spacing:.005em;white-space:nowrap}
  .finders{align-self:stretch;display:flex;align-items:stretch;gap:2px;min-inline-size:0;overflow-x:auto;scrollbar-width:none}
  .finders::-webkit-scrollbar{display:none}
  .finders a{position:relative;display:flex;align-items:center;padding:0 var(--ui-space-sm);color:var(--ui-color-ink-soft);text-decoration:none;font-size:var(--ui-text-sm);font-weight:var(--ui-weight-medium);white-space:nowrap}
  .finders a:hover{color:var(--ui-color-ink);background:var(--ui-color-surface-hover)}
  .finders a.on{color:var(--ui-color-ink);font-weight:var(--ui-weight-semibold)}
  .finders a.on::after{content:'';position:absolute;inset-inline:var(--ui-space-sm);bottom:0;block-size:2px;background:var(--ui-color-accent)}
  .finders .group{display:flex;align-items:stretch;gap:2px}
  .finders .primary{font-weight:var(--ui-weight-semibold)}
  .finders .group + .group, .finders .primary + .group{margin-inline-start:var(--ui-space-xs);padding-inline-start:var(--ui-space-xs);border-inline-start:1px solid var(--ui-color-border)}
  .aside{margin-inline-start:auto;display:flex;align-items:center;gap:var(--ui-space-2xs)}
  .settings{position:relative}
  .settings-pop{position:absolute;inset-inline-end:0;inset-block-start:calc(100% + var(--ui-space-sm));z-index:var(--ui-z-menu);inline-size:360px;padding:var(--ui-space-2xs) var(--ui-space-lg) var(--ui-space-sm)}
  .settings-head{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-sm);padding-block:var(--ui-space-2xs) var(--ui-space-xs);border-bottom:1px solid var(--ui-color-border)}

  .body{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 400px;align-items:start}
  .body.full{grid-template-columns:minmax(0,1fr)}
  .finder{min-inline-size:0;padding:var(--ui-space-3xl) var(--ui-space-4xl) 72px}
  .card{position:sticky;top:var(--topbar-h);block-size:calc(100dvh - var(--topbar-h));overflow:auto;border-inline-start:1px solid var(--ui-color-border);background:var(--ui-color-surface);overscroll-behavior:contain}
  .fault{margin:64px auto;max-inline-size:36em;color:var(--ui-color-danger)}
  .foot{margin-top:var(--ui-space-4xl);font-size:var(--ui-text-2xs);color:var(--ui-color-ink-soft)}
  .foot a{color:inherit;text-underline-offset:2px}
  .tabs{display:none}

  .toast{position:fixed;left:50%;bottom:var(--ui-space-3xl);transform:translateX(-50%);z-index:var(--ui-z-toast);pointer-events:none}

  .sheet{position:fixed;inset:auto 0 0 0;margin:0;overflow:auto;overscroll-behavior:contain;padding:var(--ui-space-lg) var(--ui-space-xl) calc(var(--ui-space-2xl) + env(safe-area-inset-bottom));inline-size:100%;max-inline-size:none;max-block-size:82dvh;border:0;border-top:1px solid var(--ui-color-border-strong);border-radius:var(--ui-radius-2xl) var(--ui-radius-2xl) 0 0;background:var(--ui-color-surface);color:var(--ui-color-ink)}
  .sheet::backdrop{background:var(--ui-color-overlay)}
  .sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--ui-space-sm);padding-inline:var(--ui-space-sm)}
  .sheet-links{display:grid;gap:1px}
  .sheet-group{padding:var(--ui-space-sm) var(--ui-space-sm) var(--ui-space-2xs);color:var(--ui-color-ink-soft)}
  .sheet-group:not(:first-child){margin-top:var(--ui-space-xs)}
  .sheet-link{display:flex;align-items:baseline;gap:var(--ui-space-md);padding:var(--ui-space-md) var(--ui-space-sm);border-radius:var(--ui-radius-sm);color:var(--ui-color-ink);text-decoration:none}
  .sheet-link:hover,.sheet-link.on{background:var(--ui-color-surface-hover)}
  .sheet-link.on .sheet-name{color:var(--ui-color-accent-ink)}
  .sheet-name{font-size:var(--ui-text-md);font-weight:var(--ui-weight-semibold);white-space:nowrap}

  @media (max-width:1180px){
    .top{gap:var(--ui-space-md);padding-inline:var(--ui-space-xl)}
    .finders a{padding-inline:var(--ui-space-xs);font-size:var(--ui-text-xs)}
    .finders a.on::after{inset-inline:var(--ui-space-xs)}
  }
  /* A tablet keeps every finder: the bar takes a second row, and its rule runs the width of the
     page like the row above. The sticky chrome below it follows the new height. */
  @media (min-width:901px) and (max-width:1180px){
    .shell{--topbar-h:96px}
    .top{flex-wrap:wrap;gap:0 var(--ui-space-xl);padding-inline:var(--ui-space-xl);block-size:var(--topbar-h)}
    .mark,.aside{block-size:55px}
    .finders{order:3;flex:0 0 100%;block-size:40px;border-top:1px solid var(--ui-color-border)}
    .finders a{padding-inline:var(--ui-space-sm);font-size:var(--ui-text-sm)}
    .finders a.on::after{inset-inline:var(--ui-space-sm)}
  }
  @media (max-width:900px){
    .shell{--topbar-h:54px}
    .top{gap:var(--ui-space-sm);padding-inline:var(--ui-space-lg)}
    .finders{display:none}
    .settings-pop{display:none}
    .aside{gap:2px}
    .body{grid-template-columns:minmax(0,1fr)}
    .finder{padding:var(--ui-space-xl) var(--ui-space-lg) 96px}
    .card{position:fixed;inset:0;block-size:100dvh;z-index:var(--ui-z-modal);border:0;transform:translateY(100%);transition:transform var(--ui-duration) var(--ui-ease);visibility:hidden}
    .card.open{transform:none;visibility:visible}
    .name{display:none}
    .tabs{position:fixed;inset-inline:0;bottom:0;z-index:var(--ui-z-chrome);display:flex;gap:2px;padding:var(--ui-space-xs) var(--ui-space-sm) calc(var(--ui-space-xs) + env(safe-area-inset-bottom));background:var(--ui-color-surface);border-top:1px solid var(--ui-color-border)}
    .tabs a,.tabs .more{flex:1 1 0;padding:9px 4px;border:0;border-radius:var(--ui-radius-sm);text-align:center;color:var(--ui-color-ink-soft);background:none;text-decoration:none;font-size:var(--ui-text-xs);font-weight:var(--ui-weight-medium);white-space:nowrap}
    .tabs a.extra{display:none}
    .tabs a.on,.tabs .more.on{background:var(--ui-color-accent-soft);color:var(--ui-color-accent-ink)}
    .toast{bottom:calc(76px + env(safe-area-inset-bottom))}
  }
  @media (prefers-reduced-motion:reduce){.card{transition:none}}
</style>

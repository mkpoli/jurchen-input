<script>
  // Where every record on the site comes from, and how each finder treats it.
  import { t } from '../lib/i18n.svelte.js'
  import { MARK } from '../lib/script.js'
</script>

<article class="ui-page about" data-width="narrow">
  <header class="ui-page-head">
    <h1 class="ui-page-title">{t('nav.sources')}</h1>
    <p class="ui-page-intro">{t('about.lead')}</p>
  </header>

  <section class="ui-section">
    <h2 class="about-heading">{t('about.records')}</h2>
    <dl>
      <dt>{t('about.unicodeTitle')}</dt>
      <dd>{@html t('about.unicode')}</dd>
      <dt>{t('about.tableTitle')}</dt>
      <dd>{@html t('about.table')}</dd>
      <dt>{t('about.fontTitle')}</dt>
      <dd>{@html t('about.font')}</dd>
      <dt>{t('about.variantsTitle')}</dt>
      <dd>{@html t('about.variants')}</dd>
      <dt>{t('about.encodingsTitle')}</dt>
      <dd>{@html t('about.encodings')}</dd>
      <dt>{t('about.convertTitle')}</dt>
      <dd>{@html t('about.convert')}</dd>
      <dt>{t('about.missingTitle')}</dt>
      <dd>{t('about.missing')}</dd>
    </dl>
  </section>

  <section class="ui-section">
    <h2 class="about-heading">{t('about.how')}</h2>
    <dl>
      <dt>{t('nav.strokes')}</dt>
      <dd>{t('about.howStrokes')}</dd>
      <dt>{t('nav.reading')}</dt>
      <dd>{t('about.howReading')}</dd>
      <dt>{t('nav.draw')}</dt>
      <dd>{t('about.howDraw')}</dd>
      <dt>{t('nav.radicals')}</dt>
      <dd>{t('about.howRadicals')}</dd>
    </dl>
  </section>

  <section class="ui-section">
    <h2 class="about-heading">{t('about.mark')}</h2>
    <p class="ui-prose"><span class="ui-script" lang="juc">{MARK}</span> {t('about.markText')}</p>
  </section>

  <section class="ui-section">
    <h2 class="about-heading">{t('about.keptTitle')}</h2>
    <p class="ui-prose">{t('about.kept')}</p>
  </section>

  <footer class="about-foot ui-hint">{t('about.footer')} <a href="https://github.com/mkpoli/jurchen-input">github.com/mkpoli/jurchen-input</a></footer>
</article>

<style>
  .about{gap:var(--ui-space-3xl);padding-bottom:var(--ui-space-5xl)}
  .about-heading{font-family:var(--ui-font-serif);font-size:var(--ui-text-xl);font-weight:var(--ui-weight-semibold)}
  dl{display:grid;margin:0}
  dt{padding-top:var(--ui-space-lg);margin-top:var(--ui-space-lg);border-top:1px solid var(--ui-color-border);font-size:var(--ui-text-sm);font-weight:var(--ui-weight-semibold)}
  dt:first-of-type{padding-top:0;margin-top:0;border-top:0}
  dd{margin:var(--ui-space-2xs) 0 0;color:var(--ui-color-ink-soft);font-size:var(--ui-text-md);line-height:var(--ui-leading-loose)}
  .about :global(.ui-script){font-size:22px;vertical-align:-3px}
  .about-foot{font-size:var(--ui-text-xs);line-height:1.6;border-top:1px solid var(--ui-color-border);padding-top:var(--ui-space-lg)}
</style>

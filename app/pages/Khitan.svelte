<script>
  // What the Jurchen script took from the Khitan large script, as far as a cited source goes: the
  // nine characters Kiyose sets beside a Khitan form, and the four directions his other figure gives.
  import { db } from '../lib/db.svelte.js'
  import { readingOf } from '../lib/index.js'
  import { t } from '../lib/i18n.svelte.js'

  const ready = $derived(db.status === 'ready')

  /** The nine of Kiyose's figure, with the Chinese gloss the figure prints above them. */
  const NINE = [
    { char: '\u{18E16}', gloss: '天' },
    { char: '\u{19012}', gloss: '年' },
    { char: '\u{18F7A}', gloss: '日' },
    { char: '\u{190FA}', gloss: '月' },
    { char: '\u{18F65}', gloss: '龍' },
    { char: '\u{1906F}', gloss: '人' },
    { char: '\u{1907C}', gloss: '聽' },
    { char: '\u{190FB}', gloss: '中' },
    { char: '\u{19182}', gloss: '福' },
  ]

  /** The four directions as Kiyose writes them: a stem and a suffix, two characters in all. */
  const DIRECTIONS = [
    { gloss: '東', form: 'jule-ši' },
    { gloss: '西', form: 'fuli-ši' },
    { gloss: '南', form: 'fan-ti' },
    { gloss: '北', form: 'uli-ti' },
  ]
</script>

<article class="ui-page khitan" data-width="wide">
  <header class="ui-page-head">
    <h1 class="ui-page-title">{t('khitan.title')}</h1>
    <p class="ui-page-intro">{t('khitan.lead')}</p>
  </header>

  <section class="ui-section">
    <h2 class="ui-label">{t('khitan.nineTitle')}</h2>
    <p class="ui-prose">{t('khitan.nineLead')}</p>

    <figure class="plate">
      <span class="paper">
        <img src="/figures/kiyose-khitan-nine.png" width="1552" height="280" loading="lazy" decoding="async"
          alt={t('khitan.nineAlt')} />
      </span>
      <figcaption>{t('khitan.nineCaption')} <a href="https://www.chikyukotobamura.org/muse/wr_easia_9.html">Kiyose 2022</a></figcaption>
    </figure>

    <ul class="nine">
      {#each NINE as item (item.char)}
        <li class="tile">
          <span class="gloss ui-serif" lang="zh-Hant">{item.gloss}</span>
          <span class="glyph ui-script" lang="juc">{item.char}</span>
          <span class="reading">{ready ? readingOf(item.char) : ''}</span>
        </li>
      {/each}
    </ul>
    <p class="ui-hint">{t('khitan.readingNote')}</p>
  </section>

  <section class="ui-section">
    <h2 class="ui-label">{t('khitan.directionsTitle')}</h2>
    <p class="ui-prose">{t('khitan.directionsLead')}</p>

    <figure class="plate narrow">
      <span class="paper">
        <img src="/figures/kiyose-directions.png" width="728" height="372" loading="lazy" decoding="async"
          alt={t('khitan.directionsAlt')} />
      </span>
      <figcaption>{t('khitan.directionsCaption')} <a href="https://www.chikyukotobamura.org/muse/wr_easia_9.html">Kiyose 2022</a></figcaption>
    </figure>

    <ul class="directions">
      {#each DIRECTIONS as item (item.gloss)}
        <li>
          <span class="gloss ui-serif" lang="zh-Hant">{item.gloss}</span>
          <span class="form">{item.form}</span>
        </li>
      {/each}
    </ul>
    <p class="ui-prose">{t('khitan.directionsNote')}</p>
  </section>

  <section class="ui-section">
    <h2 class="ui-label">{t('khitan.showsTitle')}</h2>
    <p class="ui-prose">{t('khitan.showsKhitan')}</p>
    <p class="ui-prose">{t('khitan.showsDirections')}</p>
  </section>

  <section class="ui-section">
    <h2 class="ui-label">{t('khitan.sources')}</h2>
    <ul class="sources">
      <li><a href="https://www.chikyukotobamura.org/muse/wr_easia_9.html">Kiyose Gizaburō Norifu, 「女真文字」, 地球ことば村, 2022</a></li>
      <li><a href="https://archive.org/details/Khitan-et-Jurchen-languages">Kane, <cite>The Sino-Jurchen Vocabulary of the Bureau of Interpreters</cite>, 1989, pp. 22–23</a></li>
      <li><a href="https://archive.org/download/Khitan-et-Jurchen-languages/%E5%A5%B3%E7%9C%9F%E8%AF%AD%E8%A8%80%E6%96%87%E5%AD%97%E7%A0%94%E7%A9%B6.pdf#page=67">Jin Guangping and Jin Qizong, 《女真語言文字研究》, 1980, pp. 56–57</a></li>
    </ul>
  </section>
</article>

<style>
  .khitan{gap:var(--ui-space-2xl)}
  .khitan p{text-wrap:pretty}
  .plate{display:grid;gap:var(--ui-space-xs);margin:0;max-inline-size:100%}
  .plate.narrow{max-inline-size:640px}
  .paper{display:block;padding:var(--ui-space-sm);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-sm);background:#fff}
  .paper img{display:block;inline-size:100%;block-size:auto}
  .plate figcaption{font-size:var(--ui-text-xs);line-height:1.5;color:var(--ui-color-ink-muted)}
  .plate figcaption a{color:inherit;text-underline-offset:2px}

  .nine{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:var(--ui-space-xs);margin:0;padding:0;list-style:none}
  .tile{display:grid;justify-items:center;gap:1px;padding:var(--ui-space-sm) var(--ui-space-3xs);border:1px solid var(--ui-color-border);border-radius:var(--ui-radius-sm);background:var(--ui-color-surface)}
  .gloss{font-size:var(--ui-text-xs);color:var(--ui-color-ink-soft)}
  .tile .glyph{font-size:40px;line-height:1.15}
  .reading{font-family:var(--ui-font-mono);font-size:10px;line-height:1.3;color:var(--ui-color-ink-muted);white-space:nowrap}

  .directions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--ui-space-xs);margin:0;padding:0;list-style:none;max-inline-size:640px}
  .directions li{display:flex;align-items:baseline;gap:var(--ui-space-2xs);padding-block:var(--ui-space-2xs);border-block-start:1px solid var(--ui-color-border)}
  .directions .form{font-family:var(--ui-font-mono);font-size:var(--ui-text-xs)}

  .sources{display:grid;gap:var(--ui-space-xs);margin:0;padding:0;list-style:none;font-size:var(--ui-text-xs);line-height:1.5;color:var(--ui-color-ink-soft)}
  .sources a{color:inherit;text-underline-offset:2px}

  @media (max-width:900px){
    .nine{grid-template-columns:repeat(3,minmax(0,1fr))}
    .directions{grid-template-columns:repeat(2,minmax(0,1fr))}
  }
</style>

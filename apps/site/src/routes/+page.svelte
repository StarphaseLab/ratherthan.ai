<script lang="ts">
import FollowLine from '$lib/components/FollowLine.svelte'
import HeadMeta from '$lib/components/HeadMeta.svelte'
import Hero from '$lib/components/Hero.svelte'
import QuoteCard from '$lib/components/QuoteCard.svelte'
import { REACTION_KINDS, REACTION_META } from '$lib/reactions.ts'

let { data } = $props()

/* Flip to false once regulars know the instruments — the legend then
   rests folded and first-timers can still open it. */
const legendOpen = true

function pageHref(sort: string, page: number) {
  const params = new URLSearchParams()
  if (sort === 'top') params.set('sort', 'top')
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}
</script>

<svelte:head>
  <title>ratherthan.ai — a museum of agent rhetoric</title>
</svelte:head>
<HeadMeta
  title="ratherthan.ai — a museum of agent rhetoric"
  description="AI agents announcing what they'll do rather than the obviously worse alternative. Browse the specimens, react, submit your own."
/>

<h1 class="sr-only">ratherthan.ai — a public museum of agent rhetoric</h1>

<Hero quotes={data.heroPool} initialPosition={data.initialHeroPosition} />

<FollowLine />

<section class="legend" aria-label="The five reactions">
  <details open={legendOpen}>
    <summary><h2>react rather than scroll past</h2></summary>
    <div class="key">
      {#each REACTION_KINDS as kind (kind)}
        {@const meta = REACTION_META[kind]}
        <figure>
          <svg class="ic" aria-hidden="true"><use href="#reaction-{kind}" /></svg>
          <figcaption>{meta.label}<span class="hint">{meta.hint}</span></figcaption>
        </figure>
      {/each}
    </div>
  </details>
</section>

<section class="feed">
  <div class="feed-head">
    <h2>the archive</h2>
    <div class="sort">
      <a href="/" class:active={data.sort === 'recent'}>recent</a>
      <a href="/?sort=top" class:active={data.sort === 'top'}>top</a>
    </div>
  </div>

  {#each data.quotes as quote (quote.id)}
    <QuoteCard {quote} />
  {:else}
    {#if data.page > 1}
      <p>The archive ends before page {data.page}. <a href="/">Back to the entrance</a>.</p>
    {:else}
      <p>The museum is empty. Be the first: <a href="/submit">submit a specimen</a>.</p>
    {/if}
  {/each}

  {#if data.page > 1 || data.hasMore}
    <nav class="pager" aria-label="Archive pages">
      <span>
        {#if data.page > 1}
          <a href={pageHref(data.sort, data.page - 1)}
            >← {data.sort === 'recent' ? 'newer' : 'previous'}</a
          >
        {/if}
      </span>
      <span class="page-no">page {data.page}</span>
      <span>
        {#if data.hasMore}
          <a href={pageHref(data.sort, data.page + 1)}
            >{data.sort === 'recent' ? 'older' : 'next'} →</a
          >
        {/if}
      </span>
    </nav>
  {/if}
</section>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .legend {
    margin-top: 1rem;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }
  .legend summary {
    cursor: pointer;
  }
  .legend summary::marker {
    color: var(--dim);
  }
  .legend summary h2 {
    display: inline;
  }
  .legend summary:hover h2 {
    color: var(--text);
  }
  .key {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
  }
  .key figure {
    margin: 0;
    text-align: center;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem 0.5rem 0.85rem;
    color: var(--dim);
  }
  .key figure:hover {
    color: var(--accent);
  }
  .key .ic {
    width: 28px;
    height: 28px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .key figcaption {
    font-size: 0.72rem;
    line-height: 1.4;
    margin-top: 0.5rem;
  }
  .key .hint {
    display: block;
    font-size: 0.68rem;
    opacity: 0.75;
    margin-top: 0.15rem;
  }
  .feed {
    margin-top: 2rem;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }
  .feed-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1rem;
  }
  h2 {
    font-size: 0.9rem;
    color: var(--dim);
    font-weight: 400;
    letter-spacing: 0.1em;
    margin: 0;
  }
  .sort {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
  }
  .sort a {
    color: var(--dim);
    text-decoration: none;
  }
  .sort a.active {
    color: var(--accent);
  }
  .pager {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-top: 1.5rem;
    font-size: 0.9rem;
  }
  .pager a {
    color: var(--dim);
    text-decoration: none;
  }
  .pager a:hover {
    color: var(--accent);
  }
  .page-no {
    color: var(--dim);
    font-size: 0.8rem;
  }
</style>

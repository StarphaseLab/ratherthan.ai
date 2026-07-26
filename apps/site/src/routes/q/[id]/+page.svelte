<script lang="ts">
import Exhibit from '$lib/components/Exhibit.svelte'
import FollowLine from '$lib/components/FollowLine.svelte'
import HeadMeta from '$lib/components/HeadMeta.svelte'
import QuoteCard from '$lib/components/QuoteCard.svelte'

let { data } = $props()
</script>

<svelte:head>
  <title>“{data.quote.text}” — ratherthan.ai</title>
</svelte:head>
<HeadMeta title="A specimen of agent rhetoric — visit the museum" description={data.quote.text} />

<Exhibit quote={data.quote} reactAction="?/react" />

<!-- The reaction pills end flush; the stage on the home page carries its own
     rest below the controls. This gives the line the same air on both. -->
<div class="after-exhibit"><FollowLine /></div>

<!-- Most arrivals here came from one shared link and have seen nothing else.
     Show them the collection rather than a door back to it. -->
{#if data.companions.length}
  <section class="more" aria-label="More from the collection">
    <h2>more from the collection</h2>
    {#each data.companions as quote (quote.id)}
      <QuoteCard {quote} />
    {/each}
  </section>
{/if}

<nav class="onward" aria-label="Keep browsing">
  <a class="go" href="/random">another specimen →</a>
  <a class="go secondary" href="/">enter the museum</a>
</nav>

<style>
  .after-exhibit {
    padding-top: 1rem;
  }
  .more {
    margin-top: 1rem;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }
  .more h2 {
    font-size: 0.95rem;
    color: var(--dim);
    font-weight: 400;
    margin: 0 0 1rem;
  }
  .onward {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  .go {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.5rem 1rem;
    background: var(--panel);
    text-decoration: none;
    font-size: 0.9rem;
  }
  /* One primary door; the museum's front step is the calmer of the two. */
  .go:not(.secondary):hover {
    border-color: var(--accent);
  }
  .go.secondary {
    color: var(--dim);
  }
  .go.secondary:hover {
    color: var(--text);
  }
</style>

<script lang="ts">
import { goto } from '$app/navigation'
import Exhibit from '$lib/components/Exhibit.svelte'
import { isTypingTarget } from '$lib/keys.ts'

let { data } = $props()

function onKey(event: KeyboardEvent) {
  if (isTypingTarget(event) || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key === 'ArrowLeft' && data.prevId) {
    goto(`/frames/${data.prevId}`)
    event.preventDefault()
  } else if (event.key === 'ArrowRight' && data.nextId) {
    goto(`/frames/${data.nextId}`)
    event.preventDefault()
  }
}
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
  <title>Hall of Frames — ratherthan.ai</title>
  <meta property="og:title" content="Hall of Frames — a specimen of agent rhetoric" />
  <meta property="og:description" content={data.quote.text} />
</svelte:head>

<h1>hall of frames</h1>

<!-- The nav hangs above the exhibit: everything below it (stage aside, the
     plaque especially) is variable-height, so up here is the one place the
     doorframe can never move between pieces. -->
<nav class="hall-nav" aria-label="Walk the hall">
  {#if data.prevId}
    <a href="/frames/{data.prevId}" aria-label="Previous piece">←</a>
  {:else}
    <span class="end">←</span>
  {/if}
  <span class="position">piece {data.position} of {data.total} · the permanent collection</span>
  {#if data.nextId}
    <a href="/frames/{data.nextId}" aria-label="Next piece">→</a>
  {:else}
    <span class="end">→</span>
  {/if}
</nav>

<Exhibit
  quote={data.quote}
  reactAction="/q/{data.quote.id}?/react"
  idHref="/q/{data.quote.id}"
/>

<p class="back"><a href="/">← back to the museum</a></p>

<style>
  h1 {
    font-size: 0.9rem;
    color: var(--dim);
    font-weight: 400;
    letter-spacing: 0.15em;
    text-align: center;
  }
  .hall-nav {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.25rem;
    margin-top: 1.25rem;
  }
  .hall-nav a,
  .hall-nav .end {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.35rem 0.9rem;
    color: var(--dim);
    text-decoration: none;
    font-size: 1.05rem;
  }
  .hall-nav a:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .hall-nav .end {
    opacity: 0.3;
  }
  .position {
    color: var(--dim);
    font-size: 0.8rem;
  }
  .back {
    font-size: 0.9rem;
    margin-top: 2rem;
  }
</style>

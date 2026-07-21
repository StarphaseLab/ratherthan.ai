<script lang="ts">
import { splitByVariant } from '@ratherthan/detector'
import { enhance } from '$app/forms'
import { attributionLabel } from '$lib/attribution.ts'
import { ReactionNotice } from '$lib/reaction-notice.svelte.ts'
import { REACTION_KINDS, REACTION_META } from '$lib/reactions.ts'
import type { QuoteRow } from '$lib/server/quotes.ts'

let { quote }: { quote: QuoteRow } = $props()

const notice = new ReactionNotice()

const parts = $derived(splitByVariant(quote.text, quote.variant))
const label = $derived(attributionLabel(quote))
</script>

<article>
  <blockquote>
    {#if parts}{parts.left}<mark>{parts.phrase}</mark>{parts.right}{:else}{quote.text}{/if}
  </blockquote>
  <div class="meta">
    <span class="who">— {label}</span>
    {#if quote.plaque}
      <a
        class="permalink framed"
        href="/frames/{quote.id}"
        title="A curator's plaque hangs beneath this piece — visit it in the hall"
        >⌜#{quote.id}⌝</a
      >
    {:else}
      <a class="permalink" href="/q/{quote.id}">#{quote.id}</a>
    {/if}
  </div>
  <div class="reactions">
    {#each REACTION_KINDS as kind (kind)}
      {@const meta = REACTION_META[kind]}
      <form method="POST" action="/q/{quote.id}?/react" use:enhance={notice.submit}>
        <input type="hidden" name="kind" value={kind} />
        <button title="{meta.label} — {meta.hint}" aria-label={meta.label}>
          <svg class="ic" aria-hidden="true"><use href="#reaction-{kind}" /></svg>
          {#if quote.reactions[kind]}<span class="count">{quote.reactions[kind]}</span>{/if}
        </button>
      </form>
    {/each}
  </div>
  {#if notice.message}<p class="notice" role="status">{notice.message}</p>{/if}
</article>

<style>
  article {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }
  blockquote {
    margin: 0;
    font-size: 1.05rem;
  }
  blockquote::before {
    content: '⏺ ';
    color: var(--dim);
  }
  mark {
    background: none;
    color: var(--accent);
    font-weight: 700;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    color: var(--dim);
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }
  .permalink {
    color: var(--dim);
    text-decoration: none;
  }
  .permalink.framed {
    color: var(--accent);
  }
  .reactions {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }
  .reactions button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--bg);
    color: var(--dim);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.22rem 0.6rem;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .reactions button:hover,
  .reactions button:focus-visible {
    color: var(--accent);
    border-color: var(--accent);
    outline: none;
  }
  .ic {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .count {
    color: var(--text);
    font-size: 0.8rem;
  }
  .reactions button:hover .count {
    color: var(--accent);
  }
  .notice {
    color: var(--reject);
    font-size: 0.8rem;
    margin: 0.5rem 0 0;
  }
</style>

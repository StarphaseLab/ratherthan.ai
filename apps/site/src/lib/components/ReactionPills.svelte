<script lang="ts">
import { enhance } from '$app/forms'
import { ReactionNotice } from '$lib/reaction-notice.svelte.ts'
import { REACTION_KINDS, REACTION_META, VOTED_HINT, voteKey } from '$lib/reactions.ts'
import type { QuoteRow } from '$lib/server/quotes.ts'

let {
  quote,
  action,
  mine = new Set<string>(),
}: {
  quote: Pick<QuoteRow, 'id' | 'reactions'>
  action: string
  mine?: ReadonlySet<string>
} = $props()

const notice = new ReactionNotice()

/* One canonical wrap on every surface: three instruments, then two. */
const ROWS = [REACTION_KINDS.slice(0, 3), REACTION_KINDS.slice(3)]
</script>

<div class="pills">
  {#each ROWS as row, r (r)}
    <div class="row">
      {#each row as kind (kind)}
        {@const voted = mine.has(voteKey(quote.id, kind))}
        <form method="POST" {action} use:enhance={notice.submit}>
          <input type="hidden" name="kind" value={kind} />
          <!-- aria-pressed carries the state for anyone the green border
               can't reach; clicking again withdraws the vote. -->
          <button
            class:voted
            aria-pressed={voted}
            title="{REACTION_META[kind].hint}{voted ? VOTED_HINT : ''}"
          >
            {REACTION_META[kind].label}{#if quote.reactions[kind]}<span class="count"
                >{quote.reactions[kind]}</span
              >{/if}
          </button>
        </form>
      {/each}
    </div>
  {/each}
  {#if notice.message}<p class="notice" role="status">{notice.message}</p>{/if}
</div>

<style>
  .pills {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.25rem;
  }
  .row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  button {
    background: none;
    color: var(--dim);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.25rem 0.9rem;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }
  /* Your own vote: green border, label stays dim. Hover brightens the label
     too, so "mine" and "under the cursor" never read as the same thing. */
  button.voted {
    border-color: var(--accent);
  }
  button:hover,
  button:focus-visible {
    color: var(--accent);
    border-color: var(--accent);
    outline: none;
  }
  .count {
    color: var(--accent);
    margin-left: 0.45rem;
  }
  .notice {
    color: var(--reject);
    font-size: 0.8rem;
    margin: 0;
    text-align: center;
  }
</style>

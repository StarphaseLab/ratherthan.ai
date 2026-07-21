<script lang="ts">
import type { VariantId } from '@ratherthan/detector'
import { invalidateAll } from '$app/navigation'
import { mintCard } from '$lib/card-render.ts'
import AdminItem from './AdminItem.svelte'

let { data, form } = $props()

const publicQueue = $derived(data.pending.filter((q) => q.source !== 'log_import'))
const backlog = $derived(data.pending.filter((q) => q.source === 'log_import'))
const split = $derived(publicQueue.length > 0 && backlog.length > 0)

/* Backfill + re-mint after edits or a style bump: prints every published
   specimen whose postcard is missing or stale, right here in the browser. */
let minting = $state(false)
let minted = $state(0)
async function mintAll() {
  minting = true
  minted = 0
  for (const q of data.unminted) {
    const ok = await mintCard(q.id, {
      text: q.text,
      variant: q.variant as VariantId,
      model: q.model,
      integration: q.integration,
    })
    if (ok) minted += 1
  }
  minting = false
  await invalidateAll()
}
</script>

<svelte:head>
  <title>Moderation queue — ratherthan.ai</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="head">
  <h1>Moderation queue</h1>
  <span class="remaining">
    {#if split}
      {publicQueue.length} public · {backlog.length} backlog
    {:else}
      {data.pending.length} awaiting judgment
    {/if}
  </span>
</div>

<p class="hint">
  The card shows exactly how the specimen will render once published — the edit field below it is
  the source of truth, re-detected live. Trim boldly; pass when undecided (sends it to the end);
  reject without guilt. The museum is curated, not fair.
</p>

{#if form?.message}
  <p class="error">#{form.id}: {form.message}</p>
{/if}

{#if data.unminted.length > 0}
  <div class="mint">
    <span>{data.unminted.length} published specimens lack a current postcard.</span>
    <button onclick={mintAll} disabled={minting}>
      {minting ? `printing… ${minted}/${data.unminted.length}` : 'mint the missing cards'}
    </button>
  </div>
{/if}

{#if data.pending.length === 0}
  <p>Queue is empty. The museum rests.</p>
{:else}
  {#if split}
    <h2 class="section">public submissions</h2>
  {/if}
  {#each publicQueue as quote, i (quote.id)}
    <AdminItem {quote} known={data.known} heroPreview={i === 0} />
  {/each}
  {#if split}
    <h2 class="section">the backlog</h2>
  {/if}
  {#each backlog as quote, i (quote.id)}
    <AdminItem {quote} known={data.known} heroPreview={publicQueue.length === 0 && i === 0} />
  {/each}
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  h1 {
    font-size: 1.2rem;
  }
  .remaining {
    color: var(--dim);
    font-size: 0.85rem;
  }
  .hint {
    color: var(--dim);
    font-size: 0.85rem;
  }
  .section {
    font-size: 0.9rem;
    color: var(--dim);
    font-weight: 400;
    letter-spacing: 0.1em;
    margin: 2rem 0 1rem;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }
  .error {
    color: var(--reject);
    border: 1px solid var(--reject);
    border-radius: 8px;
    padding: 0.5rem 1rem;
  }
  .mint {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    flex-wrap: wrap;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    margin-bottom: 1rem;
    color: var(--dim);
    font-size: 0.85rem;
  }
  .mint button {
    background: none;
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 0.25rem 0.8rem;
    font: inherit;
    cursor: pointer;
  }
  .mint button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
</style>

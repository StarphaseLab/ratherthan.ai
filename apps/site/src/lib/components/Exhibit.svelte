<script lang="ts">
import { attributionLabel } from '$lib/attribution.ts'
import CopyLink from '$lib/components/CopyLink.svelte'
import ReactionPills from '$lib/components/ReactionPills.svelte'
import StagePreview from '$lib/components/StagePreview.svelte'
import type { QuoteRow } from '$lib/server/quotes.ts'

/* One specimen, hung: stage, attribution, reactions, and — when a curator
   has spoken — the double frame and the plaque. Shared by the permalink
   page and the hall; idHref turns the specimen id into a link when the
   page showing it is not the permalink itself; copyPath is the path the
   copy-link button hands out (the hall passes its own /frames permalink);
   postcard offers the share card as a download — pass it only when the
   card is minted, or the visitor leaves with the house card by mistake. */
let {
  quote,
  reactAction,
  idHref,
  copyPath = `/q/${quote.id}`,
  postcard = false,
  mine = new Set<string>(),
}: {
  quote: QuoteRow
  reactAction: string
  idHref?: string
  copyPath?: string
  postcard?: boolean
  mine?: ReadonlySet<string>
} = $props()
</script>

<!-- The double frame is the hall's regalia: only plaqued specimens wear it. -->
<div class="frame" class:on-the-wall={Boolean(quote.plaque)}>
  <StagePreview text={quote.text} variant={quote.variant} />
</div>

<p class="label">
  — {attributionLabel(quote)} ·
  {#if idHref}<a href={idHref}>#{quote.id}</a>{:else}#{quote.id}{/if} ·
  <CopyLink path={copyPath} />
  <!-- Same-origin on purpose: the download attribute is ignored cross-origin,
       and cards.ratherthan.ai would open a bare PNG tab instead of saving. -->
  {#if postcard}
    · <a href="/q/{quote.id}/card.png" download="ratherthan-{quote.id}.png">take a postcard</a>
  {/if}
</p>

<ReactionPills {quote} action={reactAction} {mine} />

{#if quote.plaque}
  <aside class="plaque">
    <p>{quote.plaque}</p>
    <p class="signature">— {quote.plaque_by}</p>
  </aside>
{/if}

<style>
  .frame {
    padding: 2rem 2.5rem;
    margin: 1.5rem 0.5rem 0;
  }
  .frame.on-the-wall {
    border: 1px solid var(--border);
    outline: 1px solid var(--border);
    outline-offset: 6px;
    border-radius: 2px;
    background: var(--panel);
  }
  .label {
    text-align: center;
    color: var(--dim);
    font-size: 0.8rem;
    margin: 1.25rem 0 0;
  }
  .label a {
    color: var(--dim);
    text-decoration: none;
  }
  .label a:hover {
    color: var(--accent);
  }
  .plaque {
    max-width: 34rem;
    margin: 2rem auto 0;
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 1rem 1.25rem;
    font-size: 0.85rem;
    font-style: italic;
    color: var(--dim);
    background: var(--panel);
  }
  .plaque p {
    margin: 0;
  }
  .plaque .signature {
    text-align: right;
    margin-top: 0.5rem;
    font-style: normal;
  }
</style>

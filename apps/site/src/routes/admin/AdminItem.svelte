<script lang="ts">
import { detect, type VariantId } from '@ratherthan/detector'
import { enhance } from '$app/forms'
import { mintCard } from '$lib/card-render.ts'
import StagePreview from '$lib/components/StagePreview.svelte'
import { MAX_TEXT_LENGTH } from '$lib/limits.ts'
import { type PendingVariant, PROPOSED_VARIANT } from '$lib/proposed.ts'

interface PendingQuote {
  id: string
  text: string
  variant: PendingVariant
  model: string | null
  provider: string | null
  integration: string | null
  created_at: string
}

interface KnownLabels {
  models: string[]
  providers: string[]
  integrations: string[]
}

let {
  quote,
  known,
  heroPreview = false,
}: { quote: PendingQuote; known: KnownLabels; heroPreview?: boolean } = $props()

/* Red = this spelling isn't worn by ≥2 published specimens yet: either a
   one-off mistake to fix before publish, or a genuinely new label making
   its debut. Empty is never flagged — anonymous is a valid answer. */
const novel = (value: string | null, vocabulary: string[]) =>
  Boolean(value) && !vocabulary.includes(value as string)

// svelte-ignore state_referenced_locally -- seeds the draft; the #each is keyed by id
let text = $state(quote.text)
let busy = $state(false)

/* The edit field is the source of truth: the preview re-detects the variant
   from the current text, exactly as the server will on publish. */
const previewVariant = $derived.by(() => {
  const matches = detect(text)
  if (matches.some((m) => m.variant === quote.variant)) return quote.variant
  return matches[0]?.variant ?? quote.variant
})
const noMatch = $derived(detect(text).length === 0)

/* A proposal with no detectable phrase has no approve button at all — the
   server would refuse anyway; the button reappears only if an edit lands
   the text in a family the detector already knows (or the family ships and
   this page reloads under the new detector). */
const stillProposal = $derived(quote.variant === PROPOSED_VARIANT && noMatch)
</script>

<section class="item">
  {#if heroPreview}
    <div class="on-stage">
      <StagePreview {text} variant={previewVariant} />
    </div>
  {/if}
  <form
    method="POST"
    action="?/moderate"
    use:enhance={({ formData }) => {
      busy = true
      const decision = formData.get('decision')
      return async ({ result, update }) => {
        try {
          /* Wait for the exact published pixels to land before refreshing.
             On failure, that refresh exposes the card in the missing sweep. */
          if (decision === 'published' && result.type === 'success')
            await mintCard(quote.id, {
              text,
              /* Publish only succeeds after detection, so this is a real id. */
              variant: previewVariant as VariantId,
              model: quote.model,
              integration: quote.integration,
            })
          await update({ reset: false })
        } finally {
          busy = false
        }
      }
    }}
  >
    <input type="hidden" name="id" value={quote.id} />
    <textarea name="text" rows="3" maxlength={MAX_TEXT_LENGTH} bind:value={text}></textarea>
    <div class="row">
      <span class="meta">
        {previewVariant}
        {#if stillProposal}<strong class="proposed">awaiting a family</strong>
        {:else if noMatch}<strong class="warn">no phrase detected</strong>{/if}
        · <span class:novel={novel(quote.model, known.models)}>{quote.model ?? 'model?'}</span>
        · <span class:novel={novel(quote.provider, known.providers)}>{quote.provider ?? '?'}</span>
        ·
        <span class:novel={novel(quote.integration, known.integrations)}
          >{quote.integration ?? '?'}</span
        >
        · #{quote.id}
      </span>
      <span class="buttons">
        {#if !stillProposal}
          <button name="decision" value="published" class="approve" disabled={busy || noMatch}>
            publish
          </button>
        {/if}
        <button name="decision" value="passed" class="pass" disabled={busy} title="Can't decide — send to the end of the queue">
          pass
        </button>
        <button name="decision" value="rejected" class="reject" disabled={busy}>
          reject
        </button>
      </span>
    </div>
  </form>
</section>

<style>
  .on-stage {
    padding: 2.5rem 0 3rem;
  }
  form {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem;
    font: inherit;
    font-size: 0.95rem;
    resize: vertical;
    field-sizing: content;
    min-height: 3.4rem;
    max-height: 14rem;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }
  .meta {
    color: var(--dim);
    font-size: 0.75rem;
  }
  .warn {
    color: var(--reject);
  }
  .proposed {
    color: var(--accent);
    font-weight: 400;
    font-style: italic;
  }
  .novel {
    color: var(--reject);
  }
  .buttons {
    display: flex;
    gap: 0.5rem;
  }
  button {
    border: none;
    border-radius: 6px;
    padding: 0.35rem 1.1rem;
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .approve {
    background: var(--accent);
    color: var(--bg);
  }
  .pass {
    background: none;
    border: 1px solid var(--border);
    color: var(--dim);
  }
  .pass:hover {
    color: var(--text);
  }
  .reject {
    background: none;
    border: 1px solid var(--reject);
    color: var(--reject);
  }
</style>

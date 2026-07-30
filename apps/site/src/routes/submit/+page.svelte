<script lang="ts">
import {
  detect,
  FAMILIES,
  isNearMiss,
  sensitiveReasons,
  VARIANT_IDS,
  VARIANTS,
} from '@ratherthan/detector'
import { enhance } from '$app/forms'
import HeadMeta from '$lib/components/HeadMeta.svelte'
import { CopyFeedback } from '$lib/copy-link.svelte.ts'
import { MAX_LABEL_LENGTH, MAX_TEXT_LENGTH } from '$lib/limits.ts'

let { data, form } = $props()

/* The token is shown exactly once; one click to pocket it beats a hand-drag
   over a break-all string that a fumble could lose forever. */
const tokenCopy = new CopyFeedback()

let submitting = $state(false)

const familyIds = Object.keys(FAMILIES) as (keyof typeof FAMILIES)[]

// svelte-ignore state_referenced_locally -- one-time seed of the draft from any echoed input
let text = $state(form?.input?.text ?? '')
// svelte-ignore state_referenced_locally -- one-time seed of the draft from any echoed input
let variant = $state<string>(form?.input?.variant ?? 'auto')

const hasText = $derived(text.trim().length > 0)
const matches = $derived(hasText ? detect(text) : [])
const detected = $derived([...new Set(matches.map((m) => m.variant))])
const unrecognized = $derived(hasText && detected.length === 0)

/* The submitter only gets a real choice when several phrases match and one
   must be picked to anchor the exhibit; otherwise the picker is a readout. */
const choiceRequired = $derived(detected.length > 1)

/* The vow gates are invisible while typing — a bare "not just" / "not another"
   is deliberately ignored (innocent English) until a dash or comma sets it
   off. Surface that instead of letting the type-along feel dead. */
const almostGated = $derived(unrecognized && isNearMiss(text))

/* Same screen the server enforces, run before anything is sent — flagged
   text never has to leave the machine at all. */
const flagged = $derived(hasText ? sensitiveReasons(text) : [])
/* One ladder, read twice: the hint line renders it, and the offer appears
   exactly on its 'unrecognized' rung. The curator's rule — a near-miss
   teaches before the door opens, flagged text gets no door — lives in the
   rung order, so the two can never disagree. */
const hint = $derived(
  flagged.length > 0
    ? 'flagged'
    : almostGated
      ? 'near-miss'
      : unrecognized
        ? 'unrecognized'
        : detected.length > 0
          ? 'detected'
          : 'empty',
)
const offerProposal = $derived(hint === 'unrecognized')

const REASON_LABELS: Record<string, string> = {
  url: 'a URL',
  email: 'an email address',
  file_path: 'a file path',
  code: 'code',
  token_like: 'a token-shaped string',
  ip_address: 'an IP address',
}

/* Follow the detector unless the submitter picked a variant it confirms;
   the server re-detects regardless, so this is feedback, not enforcement. */
$effect(() => {
  if (detected.length === 0) variant = 'auto'
  else if (variant === 'auto' || !detected.includes(variant as (typeof detected)[number]))
    variant = detected[0]
})
</script>

<svelte:head>
  <title>Submit a specimen — ratherthan.ai</title>
</svelte:head>
<HeadMeta
  title="Submit a specimen"
  description="One sentence of genuine agent output containing a contrastive phrase. You are the redaction pipeline; a human reviews everything."
/>

<h1>Submit a specimen</h1>

{#if form?.submitted}
  <div class="success">
    {#if form.submitted.proposed}
      <p>
        Filed as a proposed acquisition. The curator examines every proposal, slowly — coining a
        family means building its detector before its first specimen can hang, so proposals wait
        longer than recognized submissions and most will not hang at all. The museum thanks you for
        treating its taxonomy as unfinished. Your deletion token works the same as ever.
      </p>
    {:else}
      <p>
        Accepted into the moderation queue. If a human curator finds it worthy, it will appear in
        the museum.
      </p>
    {/if}
    <div class="token-block">
      <p>
        <strong>Your anonymous deletion token</strong> — save it now, it is shown exactly once and
        lets you remove the quote forever:
      </p>
      <div class="token-field">
        <code>{form.submitted.id}:{form.submitted.deleteToken}</code>
        <button
          type="button"
          class="copy-token"
          class:copied={tokenCopy.copied}
          onclick={() => tokenCopy.copy(`${form.submitted.id}:${form.submitted.deleteToken}`)}
        >
          {tokenCopy.copied ? 'copied' : 'copy token'}
        </button>
      </div>
      <p class="token-help">
        Keep the whole string. <a href="/about#api">How deletion works →</a>
      </p>
    </div>
  </div>
{:else}
  <p class="rules">
    One sentence of genuine agent output containing a contrastive phrase. You are the redaction
    pipeline: remove anything private <em>before</em> submitting. What you type here is exactly what
    the museum receives — nothing else is collected. Feel free to trim boring context; starting with
    “…” is perfectly fine.
  </p>

  {#if form?.messages}
    <ul class="errors">
      {#each form.messages as message}<li>{message}</li>{/each}
    </ul>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      submitting = true
      return async ({ update }) => {
        await update()
        submitting = false
      }
    }}
  >
    <label>
      <span class="cap">the quote</span>
      <textarea
        name="text"
        rows="3"
        maxlength={MAX_TEXT_LENGTH}
        required
        placeholder="I'll inspect the actual logs rather than speculate."
        bind:value={text}
      ></textarea>
      <!-- Always rendered: reserved line, so the form never jumps as hints change. -->
      <span class="hint" class:bad={hint === 'flagged'} class:ok={hint === 'detected'}>
        {#if hint === 'flagged'}
          looks private ({flagged.map((r) => REASON_LABELS[r] ?? r).join(', ')}) — edit it out
          rather than making it public
        {:else if hint === 'near-miss'}
          almost — “not just” or “not another” counts only when a dash or comma sets it off, as in
          “a real refactor, not another prompt tweak”
        {:else if hint === 'unrecognized'}
          no contrastive phrase recognized yet — try “rather than” or “instead of”
        {:else if hint === 'detected'}
          detected: {matches[0]?.phrase.toLowerCase()}
        {/if}
      </span>
    </label>
    <div class="row">
      <label>
        <span class="cap">phrase variant</span>
        <!-- A readout, not a choice: the phrase is read from the quote itself.
             The picker only unlocks when several phrases match and the
             submitter must say which one anchors the exhibit. -->
        <select
          name="variant"
          bind:value={variant}
          disabled={!choiceRequired}
          title={choiceRequired
            ? 'Several phrases matched — pick the one that anchors this specimen.'
            : 'Read from the quote automatically — unlocks if several phrases match.'}
        >
          <option value="auto">detected automatically</option>
          {#each familyIds as familyId (familyId)}
            <optgroup label={FAMILIES[familyId].label}>
              {#each VARIANT_IDS.filter((id) => VARIANTS[id].family === familyId) as id (id)}
                <option value={id} disabled={!detected.includes(id)}
                  >{VARIANTS[id].forms.join(' / ')}</option
                >
              {/each}
            </optgroup>
          {/each}
        </select>
      </label>
      <label>
        <span class="cap">model <span class="opt">(optional)</span></span>
        <input
          name="model"
          maxlength={MAX_LABEL_LENGTH}
          placeholder="claude-fable-5"
          list="known-models"
          value={form?.input?.model ?? ''}
        />
      </label>
    </div>
    <div class="row">
      <label>
        <span class="cap">provider <span class="opt">(optional)</span></span>
        <input
          name="provider"
          maxlength={MAX_LABEL_LENGTH}
          placeholder="anthropic"
          list="known-providers"
          value={form?.input?.provider ?? ''}
        />
      </label>
      <label>
        <span class="cap">integration <span class="opt">(optional)</span></span>
        <input
          name="integration"
          maxlength={MAX_LABEL_LENGTH}
          placeholder="openclaw, claude-code, cursor…"
          list="known-integrations"
          value={form?.input?.integration ?? ''}
        />
      </label>
    </div>
    <button
      type="submit"
      disabled={unrecognized || flagged.length > 0 || submitting}
      title={flagged.length > 0
        ? 'The quote looks like it contains something private — edit it out first.'
        : unrecognized
          ? 'The quote needs a recognized contrastive phrase first.'
          : undefined}
      >submit rather than hoard</button
    >

    <!-- The wall grows a door. Wording is the curator's, em-dash licensed;
         "our gap rather than your error" is the whole feature. -->
    {#if offerProposal}
      <div class="offer">
        <p>
          The museum doesn’t recognize this phrasing. That may be our gap rather than your error —
          the collection has {familyIds.length} named families and knows there are more. Offer it as
          a <strong>proposed acquisition</strong>: the curator examines every proposal, and if yours
          names a new family, it hangs as the founding specimen.
        </p>
        <button type="submit" name="propose" value="1" class="propose" disabled={submitting}>
          offer it to the curator
        </button>
      </div>
    {/if}

    <!-- Free text with suggestions from the published corpus: the curated
         spellings are the canonical ones. Leaving a field empty is always a
         valid answer — the museum shows "an anonymous agent". -->
    <datalist id="known-models">
      {#each data.suggestions.models as v (v)}<option value={v}></option>{/each}
    </datalist>
    <datalist id="known-providers">
      {#each data.suggestions.providers as v (v)}<option value={v}></option>{/each}
    </datalist>
    <datalist id="known-integrations">
      {#each data.suggestions.integrations as v (v)}<option value={v}></option>{/each}
    </datalist>
  </form>

  <p class="api-note">prefer the terminal? the API is one POST — see <a href="/about#api">about</a>.</p>
{/if}

<style>
  h1 {
    font-size: 1.2rem;
  }
  .rules,
  .opt {
    color: var(--dim);
  }
  .errors {
    color: var(--reject);
    border: 1px solid var(--reject);
    border-radius: 8px;
    padding: 0.75rem 1rem 0.75rem 2rem;
  }
  .success {
    border: 1px solid var(--accent);
    border-radius: 8px;
    padding: 1rem;
  }
  /* A quiet rule divides the receipt from the one thing worth keeping. */
  .token-block {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .token-block strong {
    color: var(--accent);
    font-weight: 700;
  }
  /* The token and its copy action share one field, so the whole thing reads
     as a control awaiting a click rather than a passive readout. */
  .token-field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem 0.6rem;
  }
  .token-field code {
    flex: 1;
    word-break: break-all;
  }
  .copy-token {
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-size: 0.85rem;
    color: var(--dim);
    cursor: pointer;
    white-space: nowrap;
  }
  .copy-token:hover,
  .copy-token.copied {
    color: var(--accent);
  }
  .token-help {
    margin: 0.75rem 0 0;
    font-size: 0.8rem;
    color: var(--dim);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    font-size: 0.9rem;
    color: var(--dim);
  }
  .row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  textarea,
  input,
  select {
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem;
    font: inherit;
  }
  /* Dark-mode UA defaults paint every option the same grey, hiding which
     ones the multi-match picker actually offers. Selectable is bright,
     ruled-out is dim — the distinction IS the interface. */
  option {
    color: var(--text);
  }
  option:disabled,
  optgroup {
    color: var(--dim);
  }
  button {
    align-self: flex-start;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1.25rem;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .hint {
    font-size: 0.8rem;
    color: var(--dim);
    min-height: 1.3rem;
  }
  .api-note {
    color: var(--dim);
    font-size: 0.8rem;
    margin-top: 2rem;
  }
  .api-note a {
    color: var(--dim);
    text-decoration: underline;
  }
  .api-note a:hover {
    color: var(--accent);
  }
  .hint.ok {
    color: var(--accent);
  }
  .hint.bad {
    color: var(--reject);
  }
  /* A door, not a wall: framed like the museum's panels, never like an error. */
  .offer {
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    background: var(--panel);
    padding: 0.85rem 1rem;
    font-size: 0.9rem;
  }
  .offer p {
    margin: 0 0 0.75rem;
    color: var(--dim);
  }
  .offer strong {
    color: var(--text);
    font-weight: 700;
  }
  .propose {
    background: none;
    border: 1px solid var(--accent);
    color: var(--accent);
    font-weight: 400;
  }
</style>

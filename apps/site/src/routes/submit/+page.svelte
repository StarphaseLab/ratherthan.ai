<script lang="ts">
import {
  detect,
  FAMILIES,
  NOT_JUST_CORE,
  sensitiveReasons,
  VARIANT_IDS,
  VARIANTS,
} from '@ratherthan/detector'
import { enhance } from '$app/forms'
import { MAX_LABEL_LENGTH, MAX_TEXT_LENGTH } from '$lib/limits.ts'

let { data, form } = $props()

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

/* The not_just punctuation gate is invisible while typing — a bare "not just"
   is deliberately ignored (innocent English) until a dash or comma sets it
   off. Surface that instead of letting the type-along feel dead. */
const almostGated = $derived(unrecognized && NOT_JUST_CORE.test(text))

/* Same screen the server enforces, run before anything is sent — flagged
   text never has to leave the machine at all. */
const flagged = $derived(hasText ? sensitiveReasons(text) : [])
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
  <meta property="og:title" content="Submit a specimen" />
  <meta
    property="og:description"
    content="One sentence of genuine agent output containing a contrastive phrase. You are the redaction pipeline; a human reviews everything."
  />
</svelte:head>

<h1>Submit a specimen</h1>

{#if form?.submitted}
  <div class="success">
    <p>
      Accepted into the moderation queue. If a human curator finds it worthy, it will appear in the
      museum.
    </p>
    <p>
      Your anonymous deletion token — save it now, it is shown exactly once and lets you remove the
      quote forever:
    </p>
    <code>{form.submitted.id}:{form.submitted.deleteToken}</code>
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
      <span class="hint" class:bad={flagged.length > 0} class:ok={flagged.length === 0 && detected.length > 0}>
        {#if flagged.length > 0}
          looks private ({flagged.map((r) => REASON_LABELS[r] ?? r).join(', ')}) — edit it out
          rather than making it public
        {:else if almostGated}
          almost — “not just / not merely” counts only when a dash or comma sets it off, as in
          “verified in CI, not just locally”
        {:else if unrecognized}
          no contrastive phrase recognized yet — try “rather than” or “instead of”
        {:else if detected.length > 0}
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

  <p class="api-note">prefer the terminal? the API is one POST — see <a href="/about">about</a>.</p>

  <!-- The taxonomy gate cuts both ways: a genuinely new shape has no variant
       to detect. Rare specimens deserve a door, not a wall. -->
  <p class="api-note">
    caught a shape the museum doesn’t collect yet? propose a new variant:
    <a
      href="mailto:curator@ratherthan.ai?subject=New%20variant%20proposal&body=The%20specimen%20(verbatim%2C%20reviewed%20for%20anything%20private)%3A%0A%0AWhere%20it%20was%20observed%20(model%2C%20integration)%3A%0A"
      >curator@ratherthan.ai</a
    > — the curator examines every specimen.
  </p>
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
  .success code {
    display: block;
    background: var(--panel);
    padding: 0.5rem;
    border-radius: 4px;
    word-break: break-all;
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
</style>

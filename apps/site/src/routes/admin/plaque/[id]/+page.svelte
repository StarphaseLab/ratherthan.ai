<script lang="ts">
import { enhance } from '$app/forms'
import StagePreview from '$lib/components/StagePreview.svelte'
import { MAX_PLAQUE_LENGTH } from '$lib/limits.ts'

let { data, form } = $props()
</script>

<svelte:head>
  <title>Hang a plaque — ratherthan.ai</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<h1>Hang a plaque</h1>

<div class="on-stage">
  <StagePreview text={data.quote.text} variant={data.quote.variant} />
</div>

{#if form?.message}<p class="error">{form.message}</p>{/if}
{#if form?.saved}
  <p class="saved">
    {#if data.quote.plaque}
      Plaque hung. <a href="/frames/{data.quote.id}">Visit it in the hall.</a>
    {:else}
      Plaque taken down. <a href="/q/{data.quote.id}">View the exhibit.</a>
    {/if}
  </p>
{/if}

<form method="POST" action="?/save" use:enhance>
  <label>
    curator's note <span class="opt">(leave empty to take the plaque down)</span>
    <textarea name="plaque" rows="4" maxlength={MAX_PLAQUE_LENGTH}>{data.quote.plaque ?? ''}</textarea>
  </label>
  <label>
    signed by
    <input name="curator" list="curators" value={data.quote.plaque_by ?? ''} placeholder="Fable, curator" />
    <datalist id="curators">
      <option value="Fable, curator"></option>
      <option value="the director"></option>
    </datalist>
  </label>
  <button type="submit">hang it</button>
</form>

<p class="back">
  {#if data.quote.plaque}
    <a href="/frames/{data.quote.id}">← to the hall of frames</a>
  {:else}
    <a href="/q/{data.quote.id}">← back to the exhibit</a>
  {/if}
</p>

<style>
  h1 {
    font-size: 1.2rem;
  }
  .on-stage {
    padding: 1.5rem 0 2rem;
  }
  .error {
    color: var(--reject);
    border: 1px solid var(--reject);
    border-radius: 8px;
    padding: 0.5rem 1rem;
  }
  .saved {
    color: var(--accent);
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
    font-size: 0.9rem;
    color: var(--dim);
  }
  .opt {
    font-size: 0.8rem;
  }
  textarea,
  input {
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem;
    font: inherit;
    field-sizing: content;
    min-height: 1.5rem;
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
  .back {
    font-size: 0.9rem;
  }
</style>

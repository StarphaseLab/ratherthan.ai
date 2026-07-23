<script lang="ts">
import { CopyFeedback } from '$lib/copy-link.svelte.ts'

/* The text form of the copy control; the stage's icon button shares the
   CopyFeedback machinery but wears the nav's regalia. */
let { path }: { path: string } = $props()

const feedback = new CopyFeedback()
</script>

<button
  type="button"
  class:copied={feedback.copied}
  onclick={() => feedback.copyLink(path)}
  aria-label="Copy link to this specimen"
>
  {feedback.copied ? 'copied' : 'copy link'}
</button>

<style>
  button {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: var(--dim);
    cursor: pointer;
  }
  button:hover {
    color: var(--accent);
  }
  .copied {
    color: var(--accent);
  }
</style>

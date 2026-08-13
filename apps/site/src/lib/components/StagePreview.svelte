<script lang="ts">
import { splitByVariant, VARIANTS, type VariantId } from '@ratherthan/detector'
import type { PendingVariant } from '$lib/proposed.ts'
import { isLongAnchor, pickSizes, SIZES, sideShare } from '$lib/stage-fit.ts'

/* PendingVariant, not VariantId: the admin preview stages proposals too.
   splitByVariant guards unknown ids itself (!meta → null), so an unnamed
   specimen renders plain with its variant id as the label. */
let { text, variant }: { text: string; variant: PendingVariant } = $props()

const split = $derived(
  splitByVariant(text, variant as VariantId) ?? {
    left: text,
    phrase: VARIANTS[variant as VariantId]?.label ?? variant,
    right: '',
  },
)

/* Fixed-frame typography (see $lib/stage-fit.ts): the specimen fits the
   stage's fixed frame by stepping down only the overflowing side, so the
   frame — and everything hung below it — keeps one height per page. */
let stageEl: HTMLElement | undefined = $state()
let phraseEl: HTMLElement | undefined = $state()
let measureEl: HTMLElement | undefined = $state()
let viewportWidth = $state(0)
let fit = $state({ left: '', right: '' })

$effect(() => {
  void split
  void viewportWidth
  if (!stageEl || !phraseEl || !measureEl) return
  const item = measureEl.querySelector<HTMLElement>('.m-item')
  if (item) fit = pickSizes(item, sideShare(stageEl, phraseEl))
})
</script>

<svelte:window onresize={() => (viewportWidth = window.innerWidth)} />

<!-- Static rendering of the hero stage: how a specimen looks center-page. -->
<div class="stage" bind:this={stageEl}>
  <div class="measure" bind:this={measureEl} aria-hidden="true">
    <div class="m-item">
      {#each SIZES as size (size)}
        <span class="m-side {size}">{split.left}</span>
        <span class="m-side {size}">{split.right}</span>
      {/each}
    </div>
  </div>
  <div class="side {fit.left}">{split.left}</div>
  <div class="phrase" class:long={isLongAnchor(split.phrase)} bind:this={phraseEl}>{split.phrase}</div>
  <div class="side {fit.right}">{split.right}</div>
</div>

<style>
  .stage {
    position: relative;
    display: grid;
    grid-template-rows: 1fr auto 1fr;
    align-items: center;
    text-align: center;
    /* Sized so a two-line side fits its share at the compact step — any
       smaller frame can't hold two lines even at dense, and would have to
       grow per piece instead of holding one height across the hall. */
    min-height: 14rem;
    gap: 0.5rem;
    font-size: clamp(1.1rem, 2vw, 1.65rem);
    line-height: 1.45;
  }
  .side {
    text-wrap: balance;
    max-width: 46rem;
    justify-self: center;
  }
  .side.compact,
  .m-side.compact {
    font-size: clamp(1rem, 1.7vw, 1.4rem);
  }
  .side.dense,
  .m-side.dense {
    font-size: clamp(0.95rem, 1.5vw, 1.2rem);
  }
  .phrase {
    color: var(--accent);
    font-weight: 700;
    font-size: clamp(1.8rem, 5vw, 3.2rem);
    white-space: nowrap;
  }
  /* A span too long for one line at anchor size (see anchorSize). */
  .phrase.long {
    font-size: clamp(1.1rem, 3.2vw, 2rem);
    white-space: normal;
    text-wrap: balance;
  }
  /* The measuring twin: both fragments at all three sizes, invisible and
     out of flow at the stage's own width so wrapping matches exactly. */
  .measure {
    position: absolute;
    inset: 0;
    visibility: hidden;
    pointer-events: none;
    overflow: hidden;
  }
  .m-side {
    display: block;
    max-width: 46rem;
    margin-inline: auto;
    text-wrap: balance;
  }
</style>

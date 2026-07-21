<script lang="ts">
import { splitByVariant, VARIANTS, type VariantId } from '@ratherthan/detector'

let { text, variant }: { text: string; variant: VariantId } = $props()

const split = $derived(
  splitByVariant(text, variant) ?? {
    left: text,
    phrase: VARIANTS[variant]?.label ?? variant,
    right: '',
  },
)
</script>

<!-- Static rendering of the hero stage: how a specimen looks center-page. -->
<div class="stage">
  <div class="side">{split.left}</div>
  <div class="phrase">{split.phrase}</div>
  <div class="side">{split.right}</div>
</div>

<style>
  .stage {
    display: grid;
    grid-template-rows: 1fr auto 1fr;
    align-items: center;
    text-align: center;
    min-height: 12rem;
    gap: 0.5rem;
    font-size: clamp(1.1rem, 2vw, 1.65rem);
    line-height: 1.45;
  }
  .side {
    text-wrap: balance;
    max-width: 46rem;
    justify-self: center;
  }
  .phrase {
    color: var(--accent);
    font-weight: 700;
    font-size: clamp(1.8rem, 5vw, 3.2rem);
    white-space: nowrap;
  }
</style>

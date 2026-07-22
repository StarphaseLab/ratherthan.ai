<script lang="ts">
import {
  FAMILIES,
  splitByVariant,
  VARIANT_IDS,
  VARIANTS,
  type VariantId,
} from '@ratherthan/detector'
import { fly } from 'svelte/transition'
import { attributionLabel } from '$lib/attribution.ts'
import ReactionPills from '$lib/components/ReactionPills.svelte'
import { CopyFeedback } from '$lib/copy-link.svelte.ts'
import { isTypingTarget } from '$lib/keys.ts'
import type { QuoteRow } from '$lib/server/quotes.ts'
import { pickSizes, SIZES, sideShare } from '$lib/stage-fit.ts'

let { quotes }: { quotes: QuoteRow[] } = $props()

/* Start on the first shape this page actually stocks — a hard-coded default
   would blank the whole hero (switcher included) on a page whose quotes are
   all some other variant. */
let variantId: VariantId = $state(
  VARIANT_IDS.find((id) => quotes.some((q) => q.variant === id)) ?? 'rather_than',
)
/* Each shape's pool remembers where the visitor was, so crossing shapes
   and returning resumes at the same specimen instead of resetting. */
let positions: Partial<Record<VariantId, number>> = $state({})
const index = $derived(positions[variantId] ?? 0)
let direction = $state(1)
let axis: 'x' | 'y' = $state('y')
let paused = $state(false)
let menuOpen = $state(false)
let cycle = $state(0)

const available = $derived(VARIANT_IDS.filter((id) => quotes.some((q) => q.variant === id)))
const pool = $derived(quotes.filter((q) => q.variant === variantId))
/* Wrap the running index into the pool once; both `current` and the "n/N"
   counter read it. Guarded to 0 for an empty pool. */
const position = $derived(pool.length > 0 ? ((index % pool.length) + pool.length) % pool.length : 0)
const current = $derived(pool.length > 0 ? pool[position] : undefined)
const phraseLabel = $derived(VARIANTS[variantId]?.label ?? variantId)

/* Client-side navigation (sort, page) swaps `quotes` without remounting;
   hop off a shape that no longer exists so the hero never disappears. */
$effect(() => {
  if (available.length > 0 && !available.includes(variantId)) variantId = available[0]
})

const split = $derived.by(() => {
  if (!current) return { left: '', phrase: phraseLabel, right: '' }
  return (
    splitByVariant(current.text, variantId) ?? {
      left: current.text,
      phrase: phraseLabel,
      right: '',
    }
  )
})

/* Every specimen of the current pool, pre-split, for the measuring twin. */
const poolSplits = $derived(
  pool.map((q) => {
    const s = splitByVariant(q.text, variantId) ?? { left: q.text, phrase: phraseLabel, right: '' }
    return { id: q.id, left: s.left, right: s.right }
  }),
)

/* Fixed-frame typography (see $lib/stage-fit.ts): the phrase is the true
   anchor and never moves; only a side that would overflow its share steps
   down. The whole pool is measured up front so specimens enter at their
   final size; re-measured on resize. */
let stageEl: HTMLElement | undefined = $state()
let anchorEl: HTMLElement | undefined = $state()
let measureEl: HTMLElement | undefined = $state()
let viewportWidth = $state(0)
let fit: Record<string, { left: string; right: string }> = $state({})
const currentFit = $derived(fit[current?.id ?? ''] ?? { left: '', right: '' })

$effect(() => {
  void poolSplits
  void viewportWidth
  if (!measureEl || !anchorEl || !stageEl) return
  const share = sideShare(stageEl, anchorEl)
  const next: Record<string, { left: string; right: string }> = {}
  for (const item of measureEl.querySelectorAll<HTMLElement>('.m-item'))
    next[item.dataset.id ?? ''] = pickSizes(item, share)
  fit = next
})

/* Stage motion, defined once for every keyed fragment: sides travel with the
   browse axis; the phrase flies only on variant switches and crossfades in
   place (x: 0) within a pool. */
const sideFly = $derived.by(() => ({
  in: {
    x: axis === 'x' ? 44 * direction : 0,
    y: axis === 'y' ? 30 * direction : 0,
    duration: 380,
    delay: 100,
  },
  out: {
    x: axis === 'x' ? -44 * direction : 0,
    y: axis === 'y' ? -30 * direction : 0,
    duration: 260,
  },
}))
const phraseFly = $derived.by(() => ({
  in: { x: axis === 'x' ? 30 * direction : 0, duration: 300, delay: 80 },
  out: { x: axis === 'x' ? -30 * direction : 0, duration: 200 },
}))

/* Remount (and so animate) the phrase only when its rendered text changes —
   not per specimen: hopping between two "not just" quotes keeps the anchor
   perfectly still, while "not just" → "not merely" crossfades. */
const phraseKey = $derived(`${variantId}:${split.phrase}`)

function advance(dir: 1 | -1) {
  axis = 'y'
  direction = dir
  positions[variantId] = index + dir
}

function switchVariant(variant: VariantId, dir: 1 | -1 = 1) {
  axis = 'x'
  direction = dir
  variantId = variant
  menuOpen = false
}

/** Left/right: cycle to the neighboring shape's pool. */
function shiftVariant(dir: 1 | -1) {
  if (available.length < 2) return
  const at = available.indexOf(variantId)
  const next = available[(at + dir + available.length) % available.length]
  if (next) switchVariant(next, dir)
}

/* The die: jump to any specimen in the whole collection. Pure client-side —
   the stage already holds every published quote. */
function shuffle() {
  if (!current || quotes.length < 2) return
  let target = current
  while (target === current) target = quotes[Math.floor(Math.random() * quotes.length)] ?? current
  const targetPool = quotes.filter((q) => q.variant === target.variant)
  direction = 1
  axis = target.variant === variantId ? 'y' : 'x'
  positions[target.variant] = targetPool.indexOf(target)
  variantId = target.variant
  menuOpen = false
}

const copyFeedback = new CopyFeedback()

const AUTO_ADVANCE_MS = 10000

/*
 * Background tabs throttle rAF, so fly out-transitions never finish and
 * departed specimens pile up until the tab returns (visible as a brief
 * superimposed stack on refocus). A museum needn't rotate for nobody:
 * halt while hidden, restart the cycle fresh on return.
 */
let visible = $state(true)
function onVisibility() {
  visible = !document.hidden
  if (visible) cycle += 1
}

/* WCAG 2.2.2: moving content needs a real pause control — hover-pause only
   ever served mouse users. The toggle lives with the arrows. */
let userPaused = $state(false)
function togglePause() {
  userPaused = !userPaused
  if (!userPaused) cycle += 1
}
/* A tab opened in the background starts hidden — sync once on mount so the
   rotation doesn't run (and pile up outros) before the first visibility event. */
$effect(() => {
  visible = !document.hidden
})

/*
 * One timeout per displayed quote, restarted by any interaction (advance,
 * variant switch, unpause via `cycle`) so the timer bar and the actual
 * advance can never drift apart.
 */
$effect(() => {
  void index
  void variantId
  void cycle
  if (paused || userPaused || !visible || pool.length < 2) return
  const timer = setTimeout(() => advance(1), AUTO_ADVANCE_MS)
  return () => clearTimeout(timer)
})

function onKey(event: KeyboardEvent) {
  if (isTypingTarget(event) || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key === 'Escape' && menuOpen) {
    menuOpen = false
    return
  }
  /* Vertical arrows drive the stage only while it's in view; once the visitor
     has scrolled down to the archive, arrows scroll the page as usual. */
  const heroInView = window.scrollY < 240
  if (event.key === 'ArrowDown' && heroInView) {
    advance(1)
    event.preventDefault()
  } else if (event.key === 'ArrowUp' && heroInView) {
    advance(-1)
    event.preventDefault()
  } else if (event.key === 'ArrowRight') {
    shiftVariant(1)
    event.preventDefault()
  } else if (event.key === 'ArrowLeft') {
    shiftVariant(-1)
    event.preventDefault()
  }
}
</script>

<svelte:window onkeydown={onKey} onresize={() => (viewportWidth = window.innerWidth)} />
<svelte:document onvisibilitychange={onVisibility} />

{#if current}
  <section
    class="hero"
    aria-label="Featured specimen"
    onmouseenter={() => (paused = true)}
    onmouseleave={() => {
      paused = false
      cycle += 1
    }}
  >
    <div class="measure" bind:this={measureEl} aria-hidden="true">
      {#each poolSplits as m (m.id)}
        <div class="m-item" data-id={m.id}>
          {#each SIZES as size (size)}
            <span class="m-side {size}">{m.left}</span>
            <span class="m-side {size}">{m.right}</span>
          {/each}
        </div>
      {/each}
    </div>

    <div class="stage" bind:this={stageEl} class:on-the-wall={Boolean(current.plaque)}>
      <div class="side">
        {#key current.id}
          <span class="fragment {currentFit.left}" in:fly={sideFly.in} out:fly={sideFly.out}
            >{split.left}</span
          >
        {/key}
      </div>

      <div class="anchor" class:open={menuOpen} bind:this={anchorEl}>
        <div class="phrase-clip">
          {#key phraseKey}
            <button
              class="phrase"
              aria-haspopup={available.length > 1 ? 'menu' : undefined}
              aria-expanded={available.length > 1 ? menuOpen : undefined}
              title={available.length > 1 ? 'Switch phrase variant' : undefined}
              in:fly={phraseFly.in}
              out:fly={phraseFly.out}
              onclick={() => available.length > 1 && (menuOpen = !menuOpen)}>{split.phrase}</button
            >
          {/key}
        </div>
        {#if available.length > 1}
          <div class="variants" role="menu" aria-label="Switch phrase variant">
            {#each available.filter((v) => v !== variantId) as variant (variant)}
              <button role="menuitem" onclick={() => switchVariant(variant)}>
                {VARIANTS[variant]?.label ?? variant}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="side">
        {#key current.id}
          <span class="fragment {currentFit.right}" in:fly={sideFly.in} out:fly={sideFly.out}
            >{split.right}</span
          >
        {/key}
      </div>
    </div>

    {#key `${variantId}:${index}:${cycle}`}
      <div
        class="timer"
        class:idle={pool.length < 2}
        class:paused={paused || userPaused}
        style="--auto-advance: {AUTO_ADVANCE_MS}ms"
        aria-hidden="true"
      >
        <i></i>
      </div>
    {/key}

    <div class="caption">
      <span class="who">— {attributionLabel(current)}</span>
      <span class="meta">
        {#if current.plaque}
          <a
            class="permalink framed"
            href="/frames/{current.id}"
            title="A curator's plaque hangs beneath this piece — visit it in the hall"
            >⌜ hall of frames ⌝</a
          >
        {:else}
          <a class="permalink" href="/q/{current.id}">#{current.id}</a>
        {/if}
        <span class="family" title={FAMILIES[VARIANTS[variantId].family].description}>
          {FAMILIES[VARIANTS[variantId].family].label}
        </span>
        <span class="counter">{position + 1}/{pool.length}</span>
      </span>
    </div>

    <ReactionPills quote={current} action="/q/{current.id}?/react" />

    <div class="nav-sep" aria-hidden="true"></div>

    <nav class="specimen-nav" aria-label="Browse the museum">
      <div class="nav-row">
        <button
          aria-label="Previous specimen"
          title="Previous specimen (↑)"
          onclick={() => advance(-1)}>↑</button
        >
        <button aria-label="Next specimen" title="Next specimen (↓)" onclick={() => advance(1)}
          >↓</button
        >
        {#if available.length > 1}
          <span class="group-sep" aria-hidden="true"></span>
          <button
            aria-label="Previous shape"
            title="Previous shape (←)"
            onclick={() => shiftVariant(-1)}>←</button
          >
          <button aria-label="Next shape" title="Next shape (→)" onclick={() => shiftVariant(1)}
            >→</button
          >
        {/if}
      </div>
      <div class="nav-row">
        <!-- Inline die, not U+2684: dice glyphs are tofu in too many fonts. -->
        <button aria-label="Random specimen" title="Random specimen" onclick={shuffle}>
          <svg class="die" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.4" />
            <circle cx="15.5" cy="8.5" r="1.4" />
            <circle cx="12" cy="12" r="1.4" />
            <circle cx="8.5" cy="15.5" r="1.4" />
            <circle cx="15.5" cy="15.5" r="1.4" />
          </svg>
        </button>
        <button
          aria-label={userPaused ? 'Resume the rotation' : 'Pause the rotation'}
          title={userPaused ? 'Resume the rotation' : 'Pause the rotation'}
          aria-pressed={userPaused}
          onclick={togglePause}>{userPaused ? '▷' : '❚❚'}</button
        >
        <button
          class:copied={copyFeedback.copied}
          aria-label="Copy link to this specimen"
          title="Copy link to this specimen"
          onclick={() => current && copyFeedback.copy(`/q/${current.id}`)}
        >
          {#if copyFeedback.copied}
            <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5 10 17.5 19 7" />
            </svg>
          {:else}
            <!-- Two offset sheets: the duplicate/copy glyph, drawn to the die's stroke. -->
            <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
              <path d="M15.5 5.5v-1a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1" />
            </svg>
          {/if}
        </button>
      </div>
    </nav>
  </section>
{/if}

<style>
  /* Full-bleed: escape the narrow page shell, center content up to 72rem. */
  .hero {
    width: 100vw;
    position: relative;
    left: 50%;
    transform: translateX(-50%);
    padding: 2.5rem max(1rem, calc(50vw - 36rem)) 2rem;
  }

  /* Sentence stacked around the anchored phrase. Equal flexible rows above
     and below keep the phrase pinned even when a specimen has no text
     before it; generous min-height gives wrapped fragments room before
     the rows are forced unequal. */
  .stage {
    display: grid;
    grid-template-rows: 1fr auto 1fr;
    align-items: center;
    text-align: center;
    min-height: 15rem;
    gap: 0.5rem;
    font-size: clamp(1.1rem, 2vw, 1.65rem);
    line-height: 1.45;
    position: relative;
  }
  /* The framing ceremony: a faint frame settles around plaqued specimens
     after the sentence has landed, and dissolves as the rotation moves on.
     Lines are --border brightened ~15%; the panel wash sits behind the
     sentence (z-index -1 — the ::before is positioned, so without it the
     background would paint over the non-positioned .side fragments). */
  .stage::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: -0.25rem 0;
    border: 1px solid #343b44;
    outline: 1px solid #343b44;
    outline-offset: 5px;
    border-radius: 2px;
    background: var(--panel);
    opacity: 0;
    transform: scale(1.015);
    transition:
      opacity 0.25s ease,
      transform 0.25s ease;
    pointer-events: none;
  }
  .stage.on-the-wall::before {
    opacity: 0.7;
    transform: scale(1);
    transition:
      opacity 0.6s ease 0.45s,
      transform 0.6s ease 0.45s;
  }
  /* Per-side shrink steps: only the side that would overflow its share of
     the frame steps down, picked by measurement (script above). The class
     rides on the fragment, not the side — a departing fragment must keep
     the size it was measured at through its exit animation. */
  .fragment.compact,
  .m-side.compact {
    font-size: clamp(1rem, 1.7vw, 1.4rem);
  }
  .fragment.dense,
  .m-side.dense {
    font-size: clamp(0.95rem, 1.5vw, 1.2rem);
  }
  /* The measuring twin: every pool fragment at final width, all three type
     sizes, invisible and out of flow. Inset mirrors the hero's content
     padding so wrapping matches the real stage exactly. */
  .measure {
    position: absolute;
    inset: 0 max(1rem, calc(50vw - 36rem));
    visibility: hidden;
    pointer-events: none;
    overflow: hidden;
    font-size: clamp(1.1rem, 2vw, 1.65rem);
    line-height: 1.45;
  }
  .m-side {
    display: block;
    max-width: 46rem;
    margin-inline: auto;
    text-wrap: balance;
  }
  .side {
    display: grid;
    overflow: hidden;
    height: 100%;
    align-items: center;
  }
  .side > .fragment {
    grid-area: 1 / 1;
    text-wrap: balance;
    max-width: 46rem;
    justify-self: center;
  }
  .anchor {
    position: relative;
    text-align: center;
    display: grid;
    justify-items: center;
  }
  /* Clip only the phrase's fly transitions; the variants menu must be able
     to drop below the anchor unclipped. */
  .phrase-clip {
    display: grid;
    justify-items: center;
    overflow: hidden;
  }
  .phrase-clip > .phrase {
    grid-area: 1 / 1;
  }
  .phrase {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    color: var(--accent);
    font-weight: 700;
    font-size: clamp(1.8rem, 5vw, 3.2rem);
    white-space: nowrap;
    cursor: pointer;
  }
  .variants {
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 0.3rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s;
    z-index: 1;
  }
  .anchor:hover .variants,
  .anchor:focus-within .variants,
  .anchor.open .variants {
    opacity: 1;
    pointer-events: auto;
  }
  .variants button {
    background: var(--panel);
    color: var(--dim);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.15rem 0.7rem;
    font: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .variants button:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .timer {
    width: min(16rem, 55%);
    height: 2px;
    margin: 1.1rem auto 0;
  }
  .timer > i {
    display: block;
    height: 100%;
    background: var(--border);
    transform-origin: left;
    animation: timer-fill var(--auto-advance) linear forwards;
  }
  .timer.paused > i {
    animation-play-state: paused;
  }
  /* A one-specimen pool has no rotation to count down, but the bar still
     holds its slot — the caption below must not jump between pools. */
  .timer.idle {
    visibility: hidden;
  }
  .timer.idle > i {
    animation: none;
  }
  @keyframes timer-fill {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }
  .caption {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    gap: 0.3rem 1rem;
    margin-top: 1rem;
    color: var(--dim);
    font-size: 0.8rem;
    text-align: center;
  }
  .caption .who {
    white-space: nowrap;
  }
  /* Catalog data (permalink, family, counter) travels as one unit: it may
     move to its own line, but never breaks apart mid-trio. */
  .caption .meta {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    white-space: nowrap;
  }
  .caption a {
    color: var(--dim);
    text-decoration: none;
  }
  .caption a:hover {
    color: var(--accent);
  }
  .caption a.framed {
    color: var(--accent);
  }
  .family {
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0 0.4rem;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    cursor: help;
  }
  /* Navigation: a fixed home below the reactions, roles hinted by grouping.
     Bigger targets than the pills — these are the most-pressed controls. */
  .nav-sep {
    width: 6rem;
    height: 1px;
    background: var(--border);
    opacity: 0.6;
    margin: 1.4rem auto 0;
  }
  .specimen-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.9rem;
  }
  .nav-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.6rem;
  }
  .die {
    width: 17px;
    height: 17px;
    vertical-align: -3px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .die circle {
    fill: currentColor;
    stroke: none;
  }
  .glyph {
    width: 17px;
    height: 17px;
    vertical-align: -3px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .specimen-nav button {
    background: none;
    color: var(--dim);
    border: 1px solid var(--border);
    border-radius: 8px;
    min-width: 2.8rem;
    height: 2.6rem;
    font: inherit;
    font-size: 1.1rem;
    cursor: pointer;
  }
  /* A moment of accent confirms the copy; the check swaps in via {#if}. */
  .specimen-nav button.copied {
    color: var(--accent);
    border-color: var(--accent);
  }
  .specimen-nav button:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .group-sep {
    width: 1px;
    height: 1.6rem;
    background: var(--border);
    margin: 0 0.4rem;
  }

  @media (max-width: 640px) {
    .stage {
      min-height: 13.5rem;
      gap: 0.3rem;
    }
    .caption .who {
      white-space: normal;
    }
    /* Always two lines on mobile — attribution, then catalog data — so the
       caption's shape never depends on the model name's length. */
    .caption .meta {
      flex-basis: 100%;
      justify-content: center;
    }
  }
</style>

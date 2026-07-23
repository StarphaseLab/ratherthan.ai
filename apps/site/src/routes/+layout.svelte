<script lang="ts">
import { page } from '$app/state'
import ReactionGlyphs from '$lib/components/ReactionGlyphs.svelte'
import { SITE } from '$lib/site.ts'

let { children, data } = $props()

/* One tagline per page load: captured at init so load re-runs (reaction
   clicks call invalidateAll) don't swap the footer mid-visit. */
// svelte-ignore state_referenced_locally
const tagline = data.tagline

/* Specimen pages share their own postcard; everything else the house card.
   Until minting finishes, card.png serves the house image's bytes directly. */
const CARD_ROUTES = new Set(['/q/[id]', '/frames/[id]'])
const ogImage = $derived(
  CARD_ROUTES.has(page.route.id ?? '') && page.params.id
    ? `${SITE}/q/${page.params.id}/card.png`
    : `${SITE}/og.png`,
)
const ogAlt = $derived(
  (page.data as { quote?: { text?: string } }).quote?.text ??
    'ratherthan.ai — a public museum of rather than and other agent rhetoric',
)
</script>

<svelte:head>
  <link rel="canonical" href={SITE + page.url.pathname} />
  <meta property="og:url" content={SITE + page.url.pathname} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={ogAlt} />
  <!-- X's og:* fallback is unreliable in practice (bare links in DMs);
       every og tag gets an explicit twitter: mirror. -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content={ogImage} />
  <meta name="twitter:image:alt" content={ogAlt} />
</svelte:head>

<ReactionGlyphs />

<div class="shell">
  <header>
    <a href="/" class="logo">ratherthan<span class="dim">.ai</span></a>
    <!-- /random lives on for pilgrims (the stage's die replaced it here);
         "top" lives in the archive's own recent|top toggle. The hall wears
         its corner glyphs — the same mark framed specimens carry. -->
    <nav>
      <a href="/frames" class="hall"
        ><span class="tick">⌜</span>hall of frames<span class="tick">⌝</span></a
      >
      <a href="/submit">submit</a>
      <a href="/about">about</a>
      <a href="/privacy">privacy</a>
    </nav>
  </header>

  <main>{@render children()}</main>

  <footer>
    <p>
      <span class="tagline">{tagline}</span>
      <a href="https://github.com/StarphaseLab/ratherthan.ai">source</a>
    </p>
  </footer>
</div>

<style>
  :global(:root) {
    --bg: #0d1117;
    --panel: #161b22;
    --border: #2d333b;
    --text: #e6edf3;
    --dim: #8b949e;
    --accent: #7ee787;
    --reject: #ffa198;
    color-scheme: dark;
  }
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: ui-monospace, 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
    line-height: 1.6;
    /* The hero's full-bleed 100vw can overhang by a scrollbar's width. */
    overflow-x: hidden;
  }
  :global(a) {
    color: var(--accent);
  }
  .shell {
    /* border-box, or min-height + padding overflows the viewport by 2rem
       and every short page grows a pointless scrollbar */
    box-sizing: border-box;
    max-width: 44rem;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    align-items: baseline;
    justify-content: space-between;
    padding: 0.75rem 0 1.5rem;
  }
  .logo {
    font-weight: 700;
    text-decoration: none;
    color: var(--accent);
  }
  .logo .dim {
    color: var(--dim);
    font-weight: 400;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
  }
  nav a {
    color: var(--dim);
    text-decoration: none;
  }
  nav a:hover {
    color: var(--text);
  }
  /* The hall's ticks hint green without claiming the accent for the label —
     full green in the nav would read as "current page". */
  .tick {
    color: var(--accent);
    opacity: 0.65;
  }
  nav a.hall:hover .tick {
    opacity: 1;
  }
  /* Four items + the hall's full name need ~374px at full size; phones give
     ~343px of shell. Slightly smaller type and tighter gaps keep one row
     down to ~360px wide devices (flex-wrap still catches anything narrower). */
  @media (max-width: 430px) {
    nav {
      font-size: 0.86rem;
      gap: 0.25rem 0.65rem;
    }
  }
  main {
    flex: 1;
  }
  footer {
    color: var(--dim);
    font-size: 0.8rem;
    padding-top: 2rem;
  }
  footer p {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .tagline {
    font-style: italic;
  }
</style>

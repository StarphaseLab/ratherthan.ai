<script lang="ts">
/* og:title/description and their twitter:* mirrors from one pair of inputs.
   X's card pipeline is unreliable about falling back to og:*, so every og tag
   needs an explicit twitter: twin — and hand-mirroring the four tags on each
   page drifts (it already did once). Emit both pairs from the two facts.
   Per-page <title> and the layout's og:image stay where they are. */
let { title, description }: { title: string; description: string } = $props()
</script>

<svelte:head>
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
</svelte:head>

<script lang="ts">
import Exhibit from '$lib/components/Exhibit.svelte'

let { data } = $props()
</script>

<svelte:head>
  <title>“{data.quote.text}” — ratherthan.ai</title>
  <meta property="og:title" content="A specimen of agent rhetoric" />
  <meta property="og:description" content={data.quote.text} />
</svelte:head>

<Exhibit quote={data.quote} reactAction="?/react" />

<p class="back"><a href="/">← back to the museum</a></p>

<style>
  .back {
    font-size: 0.9rem;
    margin-top: 2rem;
  }
</style>

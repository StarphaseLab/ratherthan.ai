<script lang="ts">
import Exhibit from '$lib/components/Exhibit.svelte'
import HeadMeta from '$lib/components/HeadMeta.svelte'

let { data } = $props()
</script>

<svelte:head>
  <title>“{data.quote.text}” — ratherthan.ai</title>
</svelte:head>
<HeadMeta title="A specimen of agent rhetoric — visit the museum" description={data.quote.text} />

<Exhibit quote={data.quote} reactAction="?/react" />

<p class="back"><a href="/">← back to the museum</a></p>

<style>
  .back {
    font-size: 0.9rem;
    margin-top: 2rem;
  }
</style>

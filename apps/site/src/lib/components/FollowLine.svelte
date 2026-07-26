<script lang="ts">
import { X_HANDLE, X_URL } from '$lib/site.ts'
</script>

<!-- One sentence, one place: the pages that carry it are the two a visitor
     is most likely to land on, and the promise must read identically on both. -->
<p class="follow">
  the museum posts a new specimen most days:
  <a href={X_URL} rel="me noopener" target="_blank">{X_HANDLE}</a>
</p>

<style>
  .follow {
    margin: 0.75rem 0 0;
    text-align: center;
    font-size: 0.85rem;
    color: var(--dim);
  }
  .follow a {
    text-decoration: none;
  }
  .follow a:hover {
    text-decoration: underline;
  }
</style>

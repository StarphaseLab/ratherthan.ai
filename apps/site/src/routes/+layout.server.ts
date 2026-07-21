import { TAGLINES } from '$lib/taglines.ts'
import type { LayoutServerLoad } from './$types'

/* Server-only, or SSR and hydration each roll their own tagline and the
   footer flickers on every page load. The layout captures the value once,
   so invalidateAll() re-running this load never re-deals mid-visit. */
export const load: LayoutServerLoad = () => ({
  tagline: TAGLINES[Math.floor(Math.random() * TAGLINES.length)] ?? TAGLINES[0],
})

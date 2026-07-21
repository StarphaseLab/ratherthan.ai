import { error } from '@sveltejs/kit'
import { ctx } from '$lib/server/context.ts'
import { listFramed } from '$lib/server/quotes.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform, params }) => {
  const { db } = ctx(platform)
  const framed = await listFramed(db)
  const at = framed.findIndex((q) => q.id === params.id)
  if (at === -1) throw error(404, 'This piece does not hang in the Hall of Frames.')
  return {
    quote: framed[at],
    prevId: framed[at - 1]?.id ?? null,
    nextId: framed[at + 1]?.id ?? null,
    position: at + 1,
    total: framed.length,
  }
}

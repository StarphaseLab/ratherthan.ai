import { error } from '@sveltejs/kit'
import { getCardObjectKey } from '$lib/server/cards.ts'
import { ctx } from '$lib/server/context.ts'
import { listFramed } from '$lib/server/quotes.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform, params }) => {
  const { db } = ctx(platform)
  const [framed, cardKey] = await Promise.all([listFramed(db), getCardObjectKey(db, params.id)])
  const at = framed.findIndex((q) => q.id === params.id)
  if (at === -1) throw error(404, 'This piece does not hang in the Hall of Frames.')
  return {
    quote: framed[at],
    cardKey,
    prevId: framed[at - 1]?.id ?? null,
    nextId: framed[at + 1]?.id ?? null,
    position: at + 1,
    total: framed.length,
  }
}

import { error } from '@sveltejs/kit'
import { getCardObjectKey } from '$lib/server/cards.ts'
import { ctx } from '$lib/server/context.ts'
import { listFramed, ownReactions } from '$lib/server/quotes.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ cookies, platform, params, setHeaders }) => {
  const { db, salt } = ctx(platform)
  const [framed, cardKey, mine] = await Promise.all([
    listFramed(db),
    getCardObjectKey(db, params.id),
    ownReactions(db, cookies, salt),
  ])
  const at = framed.findIndex((q) => q.id === params.id)
  if (at === -1) throw error(404, 'This piece does not hang in the Hall of Frames.')

  /* See the home page: marked pills make the response personal. */
  if (mine.size > 0) setHeaders({ 'cache-control': 'private, no-store' })
  return {
    quote: framed[at],
    cardKey,
    mine,
    prevId: framed[at - 1]?.id ?? null,
    nextId: framed[at + 1]?.id ?? null,
    position: at + 1,
    total: framed.length,
  }
}

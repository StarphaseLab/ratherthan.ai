import { getCard } from '$lib/server/cards.ts'
import { ctx } from '$lib/server/context.ts'
import type { RequestHandler } from './$types'

/*
 * The specimen's postcard. 302 to the default card until one is minted, so
 * og:image may always point here. Day-long edge cache: after a deletion,
 * stray copies age out worldwide within 24h (our origin forgets instantly).
 */
export const GET: RequestHandler = async (event) => {
  const { db } = ctx(event.platform)
  const card = await getCard(db, event.params.id)
  if (!card) return new Response(null, { status: 302, headers: { location: '/og.png' } })

  const etag = `"${event.params.id}:${card.minted_at}"`
  if (event.request.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers: { etag } })

  return new Response(card.png, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
      etag,
    },
  })
}

import { getCard } from '$lib/server/cards.ts'
import type { RequestHandler } from './$types'

type CardEvent = Parameters<RequestHandler>[0]

async function houseCard(event: CardEvent, reason: string): Promise<Response> {
  const assets = event.platform?.env?.ASSETS
  if (assets) {
    try {
      const house = await assets.fetch(new URL('/og.png', event.url.origin))
      if (house.ok) {
        const png = await house.arrayBuffer()
        console.info(
          JSON.stringify({ event: 'card_origin', id: event.params.id, image: 'house', reason }),
        )
        return new Response(png, {
          status: 200,
          headers: {
            'content-type': 'image/png',
            'content-length': String(png.byteLength),
            'cache-control': 'public, max-age=300',
          },
        })
      }
    } catch {
      // The redirect below gives the static-asset path one last independent try.
    }
  }
  console.error(
    JSON.stringify({ event: 'card_origin', id: event.params.id, image: 'redirect', reason }),
  )
  return new Response(null, { status: 302, headers: { location: '/og.png' } })
}

/*
 * The specimen's postcard. og:image always points here.
 *
 * Until a card is minted (the window between publish and the curator's mint
 * sweep) we serve the house card's *bytes* with a 200 — not a 302. X and some
 * chat crawlers don't follow a redirect for og:image, so a 302 leaves them
 * with no image at all; a 200 always hands them one, and a house card beats a
 * broken thumbnail. Short cache so the real postcard takes over promptly once
 * minted. Where the assets binding is absent (some dev setups) we fall back to
 * the old redirect.
 *
 * Minted cards get a short edge cache. This route is no longer the hot path
 * — og:image points at the immutable R2 object once a card is minted, and
 * that URL changes with the pixels. What is left here is the postcard
 * download and legacy links, where a stale copy is a wrong souvenir: a
 * re-mint took 24h to appear (2026-08-03, a restored specimen). Five
 * minutes also propagates deletions faster than the old day-long TTL, and
 * the ETag keeps repeat fetches to a 304.
 */
const MINTED_CACHE_CONTROL = 'public, max-age=300'
export const GET: RequestHandler = async (event) => {
  const db = event.platform?.env?.DB
  if (!db) return houseCard(event, 'db_unavailable')

  let card: Awaited<ReturnType<typeof getCard>>
  try {
    card = await getCard(db, event.params.id)
  } catch {
    return houseCard(event, 'db_read_failed')
  }
  if (!card) return houseCard(event, 'card_missing')

  const etag = `"${event.params.id}:${card.minted_at}"`
  if (event.request.headers.get('if-none-match') === etag)
    return new Response(null, {
      status: 304,
      headers: { etag, 'cache-control': MINTED_CACHE_CONTROL },
    })

  console.info(JSON.stringify({ event: 'card_origin', id: event.params.id, image: 'minted' }))

  return new Response(card.png, {
    headers: {
      'content-type': 'image/png',
      'content-length': String(card.png.byteLength),
      'cache-control': MINTED_CACHE_CONTROL,
      etag,
    },
  })
}

import { ctx } from '$lib/server/context.ts'
import {
  listHeroPool,
  listPublished,
  ownReactions,
  randomPositionForVariant,
} from '$lib/server/quotes.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ cookies, platform, setHeaders, url }) => {
  const { db, salt } = ctx(platform)
  const sort = url.searchParams.get('sort') === 'top' ? 'top' : 'recent'
  const requested = Number(url.searchParams.get('page') ?? '1')
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1
  /* The feed paginates; the stage rotates over the whole collection. The
     visitor's own votes ride along in the same round trip. */
  const [{ quotes, hasMore }, heroPool, mine] = await Promise.all([
    listPublished(db, sort, page - 1),
    listHeroPool(db),
    ownReactions(db, cookies, salt),
  ])
  /* Open on a random specimen from the site's namesake phrase. Choosing on
     the server keeps SSR and hydration in agreement; Hero still owns all
     subsequent browsing and shuffle behavior. */
  const initialHeroPosition = randomPositionForVariant(heroPool, 'rather_than')

  /* Marked pills make this page one visitor's. Said in the response rather
     than in a comment, so a future cache rule can't quietly serve one
     visitor's votes to the next. */
  if (mine.size > 0) setHeaders({ 'cache-control': 'private, no-store' })

  return { sort, page, hasMore, quotes, heroPool, initialHeroPosition, mine }
}

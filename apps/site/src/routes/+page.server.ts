import { ctx } from '$lib/server/context.ts'
import { listHeroPool, listPublished, randomPositionForVariant } from '$lib/server/quotes.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform, url }) => {
  const { db } = ctx(platform)
  const sort = url.searchParams.get('sort') === 'top' ? 'top' : 'recent'
  const requested = Number(url.searchParams.get('page') ?? '1')
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1
  /* The feed paginates; the stage rotates over the whole collection. */
  const [{ quotes, hasMore }, heroPool] = await Promise.all([
    listPublished(db, sort, page - 1),
    listHeroPool(db),
  ])
  /* Open on a random specimen from the site's namesake phrase. Choosing on
     the server keeps SSR and hydration in agreement; Hero still owns all
     subsequent browsing and shuffle behavior. */
  const initialHeroPosition = randomPositionForVariant(heroPool, 'rather_than')

  return { sort, page, hasMore, quotes, heroPool, initialHeroPosition }
}

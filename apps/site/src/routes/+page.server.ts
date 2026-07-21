import { ctx } from '$lib/server/context.ts'
import { listHeroPool, listPublished } from '$lib/server/quotes.ts'
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
  return { sort, page, hasMore, quotes, heroPool }
}

import { ctx } from '$lib/server/context.ts'
import type { RequestHandler } from './$types'

const SITE = 'https://ratherthan.ai'
const STATIC_PATHS = ['/', '/about', '/privacy', '/submit']

/** Published specimens + static pages. Framed specimens add their hall page. */
export const GET: RequestHandler = async (event) => {
  const { db } = ctx(event.platform)
  const { results } = await db
    .prepare(
      `SELECT id, plaque, approved_at FROM quotes
       WHERE status = 'published' ORDER BY approved_at DESC`,
    )
    .all<{ id: string; plaque: string | null; approved_at: string }>()

  const urls: { loc: string; lastmod?: string }[] = STATIC_PATHS.map((p) => ({ loc: SITE + p }))
  for (const q of results) {
    const lastmod = q.approved_at?.slice(0, 10)
    urls.push({ loc: `${SITE}/q/${q.id}`, lastmod })
    if (q.plaque) urls.push({ loc: `${SITE}/frames/${q.id}`, lastmod })
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>
`
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}

import { json } from '@sveltejs/kit'
import { putCard } from '$lib/server/cards.ts'
import { assertAdmin, ctx } from '$lib/server/context.ts'
import type { RequestHandler } from './$types'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const MAX_BYTES = 300_000

/*
 * Card upload. Lives under /admin deliberately: Cloudflare Access fronts
 * this path, so only the curator's browser can hang a postcard. An /api
 * route would sit outside the wall and let anyone repaint the museum.
 */
export const PUT: RequestHandler = async (event) => {
  const { db, cards, requireAccess } = ctx(event.platform)
  assertAdmin(event, requireAccess)

  const body = await event.request.arrayBuffer()
  if (body.byteLength > MAX_BYTES)
    return json({ error: `Card exceeds ${MAX_BYTES} bytes.` }, { status: 413 })
  const head = new Uint8Array(body.slice(0, 8))
  if (body.byteLength < 8 || !PNG_MAGIC.every((b, i) => head[i] === b))
    return json({ error: 'Body is not a PNG.' }, { status: 400 })

  const quote = await db
    .prepare(`SELECT id FROM quotes WHERE id = ? AND status = 'published'`)
    .bind(event.params.id)
    .first<{ id: string }>()
  if (!quote) return json({ error: 'No published quote with that id.' }, { status: 404 })

  const objectKey = await putCard(db, cards, quote.id, body)
  return json({ minted: true, objectKey })
}

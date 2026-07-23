import { json } from '@sveltejs/kit'
import { deleteCard } from '$lib/server/cards.ts'
import { ctx } from '$lib/server/context.ts'
import { deleteByToken } from '$lib/server/quotes.ts'
import type { RequestHandler } from './$types'

/** Anonymous deletion using the token issued at submission. */
export const DELETE: RequestHandler = async (event) => {
  const { db, cards } = ctx(event.platform)
  const token = event.request.headers.get('x-delete-token')
  if (!token) return json({ error: 'Missing X-Delete-Token header.' }, { status: 400 })
  const deleted = await deleteByToken(db, event.params.id, token)
  if (!deleted) return json({ error: 'No matching quote for that token.' }, { status: 404 })

  try {
    await deleteCard(db, cards, event.params.id)
    return json({ deleted: true })
  } catch {
    console.error(JSON.stringify({ event: 'card_delete_pending', id: event.params.id }))
    return json({ deleted: true, cardCleanup: 'pending' }, { status: 202 })
  }
}

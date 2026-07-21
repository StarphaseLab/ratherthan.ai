import { json } from '@sveltejs/kit'
import { ctx } from '$lib/server/context.ts'
import { deleteByToken } from '$lib/server/quotes.ts'
import type { RequestHandler } from './$types'

/** Anonymous deletion using the token issued at submission. */
export const DELETE: RequestHandler = async (event) => {
  const { db } = ctx(event.platform)
  const token = event.request.headers.get('x-delete-token')
  if (!token) return json({ error: 'Missing X-Delete-Token header.' }, { status: 400 })
  const deleted = await deleteByToken(db, event.params.id, token)
  return deleted
    ? json({ deleted: true })
    : json({ error: 'No matching quote for that token.' }, { status: 404 })
}

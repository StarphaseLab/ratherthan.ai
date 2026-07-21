import { redirect } from '@sveltejs/kit'
import { ctx } from '$lib/server/context.ts'
import { listFramed } from '$lib/server/quotes.ts'
import type { RequestHandler } from './$types'

/** The Hall entrance: step in front of the newest hanging. */
export const GET: RequestHandler = async ({ platform }) => {
  const { db } = ctx(platform)
  const framed = await listFramed(db)
  const newest = framed[framed.length - 1]
  throw redirect(303, newest ? `/frames/${newest.id}` : '/')
}

import { redirect } from '@sveltejs/kit'
import { ctx } from '$lib/server/context.ts'
import { randomPublishedId } from '$lib/server/quotes.ts'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ platform }) => {
  const { db } = ctx(platform)
  const id = await randomPublishedId(db)
  throw redirect(303, id ? `/q/${id}` : '/')
}

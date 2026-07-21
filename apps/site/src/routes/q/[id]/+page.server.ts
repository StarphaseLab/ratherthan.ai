import { error, fail } from '@sveltejs/kit'
import { REACTION_KINDS, type ReactionKind } from '$lib/reactions.ts'
import { clientIp, ctx, VOTER_COOKIE } from '$lib/server/context.ts'
import { sha256Hex } from '$lib/server/crypto.ts'
import { getPublished, toggleReaction } from '$lib/server/quotes.ts'
import { allowRequest } from '$lib/server/rate-limit.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform, params }) => {
  const { db } = ctx(platform)
  const quote = await getPublished(db, params.id)
  if (!quote) throw error(404, 'No such specimen in the museum.')
  return { quote }
}

export const actions: Actions = {
  react: async (event) => {
    const { db, rate, salt } = ctx(event.platform)
    const kind = (await event.request.formData()).get('kind')
    if (typeof kind !== 'string' || !REACTION_KINDS.includes(kind as ReactionKind))
      return fail(400, { message: 'Unknown reaction.' })
    if (!(await allowRequest(rate, salt, 'react', clientIp(event), 60, 3600)))
      return fail(429, { message: 'Slow down — the museum appreciates your enthusiasm.' })
    const voter = event.cookies.get(VOTER_COOKIE)
    if (!voter) return fail(400, { message: 'Cookies are required for voting.' })
    await toggleReaction(db, event.params.id, kind as ReactionKind, await sha256Hex(voter + salt))
    return { ok: true }
  },
}

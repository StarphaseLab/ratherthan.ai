import { error, fail } from '@sveltejs/kit'
import { REACTION_KINDS, type ReactionKind } from '$lib/reactions.ts'
import { getCardObjectKey } from '$lib/server/cards.ts'
import { clientIp, ctx, getOrCreateVoter } from '$lib/server/context.ts'
import { sha256Hex } from '$lib/server/crypto.ts'
import { getPublished, listCompanions, toggleReaction } from '$lib/server/quotes.ts'
import { allowRequest } from '$lib/server/rate-limit.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform, params }) => {
  const { db } = ctx(platform)
  const [quote, cardKey, companions] = await Promise.all([
    getPublished(db, params.id),
    getCardObjectKey(db, params.id),
    listCompanions(db, params.id),
  ])
  if (!quote) throw error(404, 'No such specimen in the museum.')
  return { quote, cardKey, companions }
}

export const actions: Actions = {
  react: async (event) => {
    const { db, rate, salt } = ctx(event.platform)
    const kind = (await event.request.formData()).get('kind')
    if (typeof kind !== 'string' || !REACTION_KINDS.includes(kind as ReactionKind))
      return fail(400, { message: 'Unknown reaction.' })
    if (!(await allowRequest(rate, salt, 'react', clientIp(event), 60, 3600)))
      return fail(429, { message: 'Slow down — the museum appreciates your enthusiasm.' })
    const voter = getOrCreateVoter(event.cookies)
    await toggleReaction(db, event.params.id, kind as ReactionKind, await sha256Hex(voter + salt))
    return { ok: true }
  },
}

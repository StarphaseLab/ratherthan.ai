import { fail } from '@sveltejs/kit'
import { listUnminted, purgeOrphanCards } from '$lib/server/cards.ts'
import { assertAdmin, ctx } from '$lib/server/context.ts'
import {
  establishedLabels,
  listPending,
  moderate,
  passToEnd,
  purgeExpiredRejects,
} from '$lib/server/quotes.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const { db, cards, requireAccess } = ctx(event.platform)
  assertAdmin(event, requireAccess)
  /* Housekeeping on every visit: cards whose exhibit left by any door
     (token deletion covers itself; SQL edits and purges land here), and
     the 30-day purge of rejected public submissions PRIVACY.md promises. */
  await Promise.all([purgeOrphanCards(db, cards), purgeExpiredRejects(db)])
  const [pending, known, unminted] = await Promise.all([
    listPending(db, 500),
    establishedLabels(db),
    listUnminted(db),
  ])
  return { pending, known, unminted }
}

export const actions: Actions = {
  moderate: async (event) => {
    const { db, requireAccess } = ctx(event.platform)
    assertAdmin(event, requireAccess)
    const form = await event.request.formData()
    const id = form.get('id')
    const decision = form.get('decision')
    const text = form.get('text')
    if (
      typeof id !== 'string' ||
      (decision !== 'published' && decision !== 'rejected' && decision !== 'passed')
    )
      return fail(400, { id: String(id), message: 'Bad moderation request.' })
    if (decision === 'passed') {
      await passToEnd(db, id)
      return { ok: true }
    }
    const result = await moderate(db, id, decision, typeof text === 'string' ? text : undefined)
    if (!result.ok) return fail(400, { id, message: result.error })
    return { ok: true }
  },
}

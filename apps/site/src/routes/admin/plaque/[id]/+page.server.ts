import { error, fail } from '@sveltejs/kit'
import { assertAdmin, ctx } from '$lib/server/context.ts'
import { getPublished, setPlaque } from '$lib/server/quotes.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const { db, requireAccess } = ctx(event.platform)
  assertAdmin(event, requireAccess)
  const quote = await getPublished(db, event.params.id)
  if (!quote) throw error(404, 'Plaques hang on published exhibits only — publish it first.')
  return { quote }
}

export const actions: Actions = {
  save: async (event) => {
    const { db, requireAccess } = ctx(event.platform)
    assertAdmin(event, requireAccess)
    const form = await event.request.formData()
    const plaque = String(form.get('plaque') ?? '')
    const curator = String(form.get('curator') ?? '')
    const result = await setPlaque(db, event.params.id, plaque, curator)
    if (!result.ok) return fail(400, { message: result.error })
    return { saved: true }
  },
}

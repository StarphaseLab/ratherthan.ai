import { detect } from '@ratherthan/detector'
import { fail } from '@sveltejs/kit'
import { MAX_TEXT_LENGTH } from '$lib/limits.ts'
import { clientIp, ctx } from '$lib/server/context.ts'
import {
  errorMessage,
  establishedLabels,
  insertQuote,
  PROPOSED_VARIANT,
  validateSubmission,
} from '$lib/server/quotes.ts'
import { allowRequest } from '$lib/server/rate-limit.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ platform }) => {
  const { db } = ctx(platform)
  return { suggestions: await establishedLabels(db) }
}

export const actions: Actions = {
  default: async (event) => {
    const { db, rate, salt } = ctx(event.platform)
    const form = await event.request.formData()
    const input = {
      text: String(form.get('text') ?? ''),
      variant: String(form.get('variant') ?? 'auto'),
      model: String(form.get('model') ?? ''),
      provider: String(form.get('provider') ?? ''),
      integration: String(form.get('integration') ?? ''),
    }

    /* Length-gate before detect: this line runs on raw, pre-validation,
       pre-rate-limit input, so the regexes must never see unbounded text.
       Oversized submissions keep variant 'auto' and fail validation anyway.
       The propose flag (the offer's second submit) only matters when
       detection finds nothing — a recognized phrase keeps its family, and
       validateSubmission turns a direct variant=proposed on recognized
       text away with not_proposable. */
    const propose = form.get('propose') === '1'
    const trimmed = input.text.trim()
    if (input.variant === 'auto' && trimmed.length <= MAX_TEXT_LENGTH)
      input.variant = detect(trimmed)[0]?.variant ?? (propose ? PROPOSED_VARIANT : 'auto')

    const errors = validateSubmission(input)
    if (errors.length > 0) return fail(400, { input, messages: errors.map(errorMessage) })

    if (!(await allowRequest(rate, salt, 'submit', clientIp(event), 5, 3600)))
      return fail(429, {
        input,
        messages: ['Submission limit reached (5 per hour). The museum will still be here later.'],
      })

    const { id, deleteToken } = await insertQuote(db, input)
    return { submitted: { id, deleteToken, proposed: input.variant === PROPOSED_VARIANT } }
  },
}

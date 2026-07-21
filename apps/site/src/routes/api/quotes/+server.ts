import { json } from '@sveltejs/kit'
import { clientIp, ctx } from '$lib/server/context.ts'
import { errorMessage, insertQuote, validateSubmission } from '$lib/server/quotes.ts'
import { allowRequest } from '$lib/server/rate-limit.ts'
import type { RequestHandler } from './$types'

const KNOWN_FIELDS = new Set(['text', 'variant', 'model', 'provider', 'integration'])

/**
 * Anonymous programmatic submission — the endpoint the future CLI/skill uses.
 * Same validation as the form; unknown fields are rejected loudly so clients
 * can never quietly ship data we did not agree to receive.
 */
export const POST: RequestHandler = async (event) => {
  const { db, rate, salt } = ctx(event.platform)

  let body: Record<string, unknown>
  try {
    body = await event.request.json()
  } catch {
    return json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return json({ error: 'Body must be a JSON object.' }, { status: 400 })

  const unknown = Object.keys(body).filter((k) => !KNOWN_FIELDS.has(k))
  if (unknown.length > 0)
    return json({ error: `Unknown fields: ${unknown.join(', ')}` }, { status: 400 })

  const input = {
    text: typeof body.text === 'string' ? body.text : '',
    variant: typeof body.variant === 'string' ? body.variant : '',
    model: typeof body.model === 'string' ? body.model : undefined,
    provider: typeof body.provider === 'string' ? body.provider : undefined,
    integration: typeof body.integration === 'string' ? body.integration : undefined,
  }

  const errors = validateSubmission(input)
  if (errors.length > 0) return json({ errors: errors.map(errorMessage) }, { status: 400 })

  if (!(await allowRequest(rate, salt, 'submit', clientIp(event), 5, 3600)))
    return json({ error: 'Rate limit exceeded (5 submissions per hour).' }, { status: 429 })

  const { id, deleteToken } = await insertQuote(db, input)
  return json({ id, delete_token: deleteToken, status: 'pending' }, { status: 201 })
}

import type { Handle } from '@sveltejs/kit'
import { VOTER_COOKIE } from '$lib/server/context.ts'
import { randomId } from '$lib/server/crypto.ts'

/** Give every visitor an anonymous first-party voter id. No accounts, no tracking. */
export const handle: Handle = async ({ event, resolve }) => {
  if (!event.cookies.get(VOTER_COOKIE)) {
    event.cookies.set(VOTER_COOKIE, randomId(20), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return resolve(event)
}

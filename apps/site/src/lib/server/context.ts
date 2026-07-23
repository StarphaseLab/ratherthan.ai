import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import { type Cookies, error, type RequestEvent } from '@sveltejs/kit'
import { randomId } from './crypto.ts'

export interface Ctx {
  db: D1Database
  cards: R2Bucket
  rate: KVNamespace
  salt: string
  requireAccess: boolean
}

export function ctx(platform: App.Platform | undefined): Ctx {
  if (!platform?.env?.DB || !platform?.env?.CARDS || !platform?.env?.RATE)
    throw error(500, 'Platform bindings unavailable — is wrangler configured?')
  const requireAccess = platform.env.REQUIRE_ACCESS === 'true'
  /* The dev fallback is fine locally, but hashing voters and rate-limit keys
     against a public constant would let anyone reverse IPv4 hashes offline.
     REQUIRE_ACCESS doubles as the "this is production" signal, so refuse to
     serve rather than silently degrade the privacy the salt exists for. */
  if (requireAccess && !platform.env.VOTER_SALT)
    throw error(500, 'VOTER_SALT is not set — deploy the secret before serving traffic.')
  return {
    db: platform.env.DB,
    cards: platform.env.CARDS,
    rate: platform.env.RATE,
    salt: platform.env.VOTER_SALT ?? 'dev-salt-not-secret',
    requireAccess,
  }
}

export function clientIp(event: RequestEvent): string {
  return event.request.headers.get('cf-connecting-ip') ?? event.getClientAddress()
}

export const VOTER_COOKIE = 'rt_voter'

/** Create anonymous voter identity only when someone actually votes. */
export function getOrCreateVoter(cookies: Pick<Cookies, 'get' | 'set'>): string {
  const existing = cookies.get(VOTER_COOKIE)
  if (existing) return existing

  const voter = randomId(20)
  cookies.set(VOTER_COOKIE, voter, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
  return voter
}

/**
 * Admin guard. Real enforcement is Cloudflare Access at the edge in front of
 * /admin. This header check is NOT independent protection: cf-access-* headers
 * are only trustworthy on a hostname Access actually fronts — anywhere else a
 * client can forge them. It exists so a totally-misconfigured deploy still
 * refuses by default, and to let local dev pass with REQUIRE_ACCESS=false.
 * Hardening (validate the Cf-Access-Jwt-Assertion JWT) is tracked in DEPLOY.md.
 *
 * ADMIN_EMAILS (secret, comma-separated) is a second gate behind Access: if
 * the Access policy is ever broadened by mistake, identities outside the list
 * still cannot curate. Unset means presence-only — set it in production.
 */
export function assertAdmin(event: RequestEvent, requireAccess: boolean): void {
  if (!requireAccess) return
  const email = event.request.headers.get('cf-access-authenticated-user-email')
  if (!email) throw error(403, 'Admin access requires Cloudflare Access authentication.')
  const allowed = (event.platform?.env?.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  if (allowed.length > 0 && !allowed.includes(email.toLowerCase()))
    throw error(403, 'This identity is not on the curator list.')
}

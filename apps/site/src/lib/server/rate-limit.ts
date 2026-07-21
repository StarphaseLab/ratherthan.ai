import type { KVNamespace } from '@cloudflare/workers-types'
import { sha256Hex } from './crypto.ts'

/**
 * Fixed-window rate limit backed by KV. KV reads are eventually consistent and
 * writes are last-write-wins, so a genuinely parallel burst from one IP can all
 * read 0 and pass — this damps casual/sequential abuse, it is not a hard cap.
 * That's acceptable here: publication is human-gated (a burst only fills the
 * pending queue a curator then rejects), and Cloudflare's edge is the real DDoS
 * layer. Move to a Durable Object or the Rate Limiting binding if a hard cap is
 * ever needed.
 */
export async function allowRequest(
  kv: KVNamespace,
  salt: string,
  scope: string,
  clientIp: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds)
  const key = `rl:${scope}:${window}:${await sha256Hex(clientIp + salt)}`
  const count = Number((await kv.get(key)) ?? '0')
  if (count >= limit) return false
  await kv.put(key, String(count + 1), { expirationTtl: Math.max(windowSeconds * 2, 60) })
  return true
}

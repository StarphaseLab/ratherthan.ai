import type { D1Database, Fetcher, KVNamespace, R2Bucket } from '@cloudflare/workers-types'

declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database
        RATE: KVNamespace
        /** Immutable share-card images. */
        CARDS: R2Bucket
        /** Static assets (wrangler.jsonc assets.binding) — the house card falls back through here. */
        ASSETS: Fetcher
        /** Salt for voter/IP hashing. Set as a secret in production. */
        VOTER_SALT?: string
        /** "true" in production: admin routes require a Cloudflare Access header. */
        REQUIRE_ACCESS?: string
        /** Comma-separated curator emails. Set as a secret in production. */
        ADMIN_EMAILS?: string
      }
    }
  }
}

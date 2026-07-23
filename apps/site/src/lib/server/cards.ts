import type { D1Database } from '@cloudflare/workers-types'
import { CARD_STYLE_VERSION } from '$lib/card-style.ts'

/**
 * Store a freshly minted card, snapshotting the quote row so staleness is a
 * SQL comparison: however a quote later changes, the sweep notices and offers
 * a re-mint. (Narrow window: if the quote is edited in the seconds between the
 * admin page loading and this upload, the snapshot matches the new row while
 * the pixels show the old — self-heals on the next admin visit's sweep.)
 */
export async function putCard(db: D1Database, quoteId: string, png: ArrayBuffer): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO cards
         (quote_id, png, style_version, minted_at,
          rendered_text, rendered_variant, rendered_model, rendered_integration)
       SELECT id, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), text, variant, model, integration
       FROM quotes WHERE id = ?`,
    )
    .bind(png, CARD_STYLE_VERSION, quoteId)
    .run()
}

/* D1 returns BLOBs as ArrayBuffer in some drivers and as a plain number
   array in others (anything that crossed a JSON boundary, e.g. local dev).
   Normalize, or Response() serves the bytes as decimal CSV text. */
function toArrayBuffer(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value
  if (value instanceof Uint8Array)
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer
  if (Array.isArray(value)) return Uint8Array.from(value as number[]).buffer as ArrayBuffer
  throw new Error('unexpected BLOB shape from D1')
}

/** Card for a still-published quote — deleted or unpublished exhibits serve nothing. */
export async function getCard(
  db: D1Database,
  quoteId: string,
): Promise<{ png: ArrayBuffer; minted_at: string } | null> {
  const row = await db
    .prepare(
      `SELECT c.png, c.minted_at FROM cards c
       JOIN quotes q ON q.id = c.quote_id AND q.status = 'published'
       WHERE c.quote_id = ?`,
    )
    .bind(quoteId)
    .first<{ png: unknown; minted_at: string }>()
  return row ? { png: toArrayBuffer(row.png), minted_at: row.minted_at } : null
}

/** Drop cards whose exhibit left the museum by any door (SQL included). */
export async function purgeOrphanCards(db: D1Database): Promise<void> {
  await db
    .prepare(
      `DELETE FROM cards WHERE quote_id IN (
         SELECT c.quote_id FROM cards c
         LEFT JOIN quotes q ON q.id = c.quote_id
         WHERE q.id IS NULL OR q.status != 'published')`,
    )
    .run()
}

/**
 * Published specimens whose postcard is missing, styled by an older design,
 * or rendered from content that has since changed (IS NOT is null-safe).
 * Feeds the admin's mint sweep — backfill, edits, and redesigns alike.
 */
export async function listUnminted(db: D1Database, limit = 200) {
  const { results } = await db
    .prepare(
      `SELECT q.id, q.text, q.variant, q.model, q.integration
       FROM quotes q LEFT JOIN cards c ON c.quote_id = q.id
       WHERE q.status = 'published' AND (
         c.quote_id IS NULL
         OR c.style_version != ?
         OR c.rendered_text IS NOT q.text
         OR c.rendered_variant IS NOT q.variant
         OR c.rendered_model IS NOT q.model
         OR c.rendered_integration IS NOT q.integration)
       ORDER BY q.created_at ASC LIMIT ?`,
    )
    .bind(CARD_STYLE_VERSION, limit)
    .all<{
      id: string
      text: string
      variant: string
      model: string | null
      integration: string | null
    }>()
  return results
}

import type { D1Database } from '@cloudflare/workers-types'
import { detect, sensitiveReasons, VARIANTS, type VariantId } from '@ratherthan/detector'
import type { Cookies } from '@sveltejs/kit'
import { MAX_LABEL_LENGTH, MAX_PLAQUE_LENGTH, MAX_TEXT_LENGTH } from '$lib/limits.ts'
import { type PendingVariant, PROPOSED_VARIANT } from '$lib/proposed.ts'
import { REACTION_KINDS, type ReactionKind, voteKey } from '$lib/reactions.ts'
import { VOTER_COOKIE, voterHash } from './context.ts'
import { randomId, sha256Hex } from './crypto.ts'

export interface QuoteRow {
  id: string
  text: string
  variant: VariantId
  model: string | null
  provider: string | null
  integration: string | null
  created_at: string
  plaque: string | null
  plaque_by: string | null
  reactions: Partial<Record<ReactionKind, number>>
}

export interface SubmissionInput {
  text: string
  variant: string
  model?: string
  provider?: string
  integration?: string
}

export type ValidationError =
  | { field: 'text'; code: 'empty' | 'too_long' | 'no_match' | 'sensitive'; detail?: string }
  | { field: 'variant'; code: 'unknown' | 'not_proposable' }
  | { field: 'labels'; code: 'too_long' }

export { PROPOSED_VARIANT }

/**
 * Server-side validation. This is the second line of defense — the primary
 * privacy mechanism is that a human wrote/reviewed the text before sending.
 */
export function validateSubmission(input: SubmissionInput): ValidationError[] {
  const errors: ValidationError[] = []
  const text = input.text.trim()

  if (text.length === 0) errors.push({ field: 'text', code: 'empty' })
  else if (text.length > MAX_TEXT_LENGTH) errors.push({ field: 'text', code: 'too_long' })
  else {
    const sensitive = sensitiveReasons(text)
    if (sensitive.length > 0)
      errors.push({ field: 'text', code: 'sensitive', detail: sensitive.join(', ') })
    const matches = detect(text)
    if (input.variant === PROPOSED_VARIANT) {
      /* A proposal is only honest while the detector has no name for the
         phrase — recognized specimens submit under their family. */
      if (matches.length > 0) errors.push({ field: 'variant', code: 'not_proposable' })
    } else if (matches.length === 0) errors.push({ field: 'text', code: 'no_match' })
    else if (!(input.variant in VARIANTS) || !matches.some((m) => m.variant === input.variant))
      errors.push({ field: 'variant', code: 'unknown' })
  }

  for (const label of [input.model, input.provider, input.integration])
    if (label && label.length > MAX_LABEL_LENGTH) {
      errors.push({ field: 'labels', code: 'too_long' })
      break
    }

  return errors
}

export function errorMessage(error: ValidationError): string {
  switch (error.code) {
    case 'empty':
      return 'The quote is empty.'
    case 'too_long':
      return error.field === 'labels'
        ? `Model, provider, and integration labels are limited to ${MAX_LABEL_LENGTH} characters.`
        : `Quotes are limited to ${MAX_TEXT_LENGTH} characters — the museum collects sentences, not transcripts.`
    case 'no_match':
      return 'No contrastive phrase detected. The museum only accepts specimens containing a known pattern (e.g. “rather than”, “instead of”).'
    case 'sensitive':
      return `The text looks like it contains something private (${error.detail}). Please edit it out — the museum wants the rhetoric, not your infrastructure.`
    case 'unknown':
      return 'Pick the phrase variant that actually appears in the quote.'
    case 'not_proposable':
      return 'The museum recognizes this phrasing — submit it under its family; proposals are for shapes without a name.'
  }
}

export async function insertQuote(
  db: D1Database,
  input: SubmissionInput,
): Promise<{ id: string; deleteToken: string }> {
  const id = randomId()
  const deleteToken = randomId(24)
  await db
    .prepare(
      `INSERT INTO quotes (id, text, variant, model, provider, integration, source, status, delete_token_hash)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', 'pending', ?)`,
    )
    .bind(
      id,
      input.text.trim(),
      input.variant,
      input.model?.trim() || null,
      input.provider?.trim() || null,
      input.integration?.trim() || null,
      await sha256Hex(deleteToken),
    )
    .run()
  return { id, deleteToken }
}

interface QuoteQueryRow {
  id: string
  text: string
  variant: VariantId
  model: string | null
  provider: string | null
  integration: string | null
  created_at: string
  plaque: string | null
  plaque_by: string | null
  reaction_counts: string | null
}

function toQuote(row: QuoteQueryRow): QuoteRow {
  const reactions: QuoteRow['reactions'] = {}
  if (row.reaction_counts)
    for (const pair of row.reaction_counts.split(',')) {
      const [kind, count] = pair.split(':')
      if (kind && REACTION_KINDS.includes(kind as ReactionKind))
        reactions[kind as ReactionKind] = Number(count)
    }
  const { reaction_counts: _, ...rest } = row
  return { ...rest, reactions }
}

const QUOTE_SELECT = `
  SELECT q.id, q.text, q.variant, q.model, q.provider, q.integration, q.created_at,
         q.plaque, q.plaque_by,
         (SELECT group_concat(kind || ':' || n) FROM
           (SELECT kind, COUNT(*) AS n FROM reactions r WHERE r.quote_id = q.id GROUP BY kind)
         ) AS reaction_counts
  FROM quotes q`

export const FEED_PAGE_SIZE = 50

export async function listPublished(
  db: D1Database,
  order: 'recent' | 'top',
  page = 0,
): Promise<{ quotes: QuoteRow[]; hasMore: boolean }> {
  const orderBy =
    order === 'top'
      ? '(SELECT COUNT(*) FROM reactions r WHERE r.quote_id = q.id) DESC, q.created_at DESC'
      : 'q.created_at DESC'
  /* Offset pagination on purpose: at museum scale OFFSET is free, and one
     stateless ?page=N beats cursor bookkeeping for both sort orders. The
     extra row answers "is there a next page" without a COUNT query. */
  const { results } = await db
    .prepare(`${QUOTE_SELECT} WHERE q.status = 'published' ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .bind(FEED_PAGE_SIZE + 1, page * FEED_PAGE_SIZE)
    .all<QuoteQueryRow>()
  return {
    quotes: results.slice(0, FEED_PAGE_SIZE).map(toQuote),
    hasMore: results.length > FEED_PAGE_SIZE,
  }
}

/**
 * The stage rotates over the entire collection, not the feed's current
 * page — one fetch of every published specimen, newest first. Fine at
 * museum scale; if it ever needs bounding, bound per-variant (newest N
 * per family) so small families like a lone vow never fall off the stage.
 */
export async function listHeroPool(db: D1Database): Promise<QuoteRow[]> {
  const { results } = await db
    .prepare(`${QUOTE_SELECT} WHERE q.status = 'published' ORDER BY q.created_at DESC`)
    .all<QuoteQueryRow>()
  return results.map(toQuote)
}

/** Pick a zero-based position within one variant's stage pool. */
export function randomPositionForVariant(
  quotes: readonly Pick<QuoteRow, 'variant'>[],
  variant: VariantId,
  random = Math.random,
): number {
  const count = quotes.filter((quote) => quote.variant === variant).length
  return count > 0 ? Math.floor(random() * count) : 0
}

export async function getPublished(db: D1Database, id: string): Promise<QuoteRow | null> {
  const row = await db
    .prepare(`${QUOTE_SELECT} WHERE q.id = ? AND q.status = 'published'`)
    .bind(id)
    .first<QuoteQueryRow>()
  return row ? toQuote(row) : null
}

/** The permanent collection: plaqued exhibits, ordered by acquisition. */
export async function listFramed(db: D1Database): Promise<QuoteRow[]> {
  const { results } = await db
    .prepare(
      `${QUOTE_SELECT} WHERE q.status = 'published' AND q.plaque IS NOT NULL
       ORDER BY q.plaque_at ASC, q.created_at ASC`,
    )
    .all<QuoteQueryRow>()
  return results.map(toQuote)
}

/**
 * A few other specimens to hang beside the one a visitor arrived at.
 * Random, not recent: an arrival from a shared link has seen none of the
 * collection, and a fresh three on every load rewards a second visit.
 */
export async function listCompanions(db: D1Database, excludeId: string): Promise<QuoteRow[]> {
  /* Shuffle ids, then hydrate the three winners. Ordering QUOTE_SELECT itself
     by RANDOM() would run its reaction-count subquery for every published
     row and throw all but three away — cost growing with the collection on
     the museum's most-visited route. */
  const { results } = await db
    .prepare(
      `${QUOTE_SELECT} WHERE q.id IN
         (SELECT id FROM quotes WHERE status = 'published' AND id != ? ORDER BY RANDOM() LIMIT 3)`,
    )
    .bind(excludeId)
    .all<QuoteQueryRow>()
  return results.map(toQuote)
}

/**
 * Where /random lands: one of the museum's best-received pieces, not any
 * page of the catalog. A visitor following "another specimen" is being
 * shown around — hand them a highlight; the archive is one click away.
 * The pool of 12 keeps repeat rolls from feeling like a loop.
 */
export async function randomPublishedId(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT id FROM (
         SELECT q.id FROM quotes q WHERE q.status = 'published'
         ORDER BY (SELECT COUNT(*) FROM reactions r WHERE r.quote_id = q.id) DESC, q.created_at DESC
         LIMIT 12
       ) ORDER BY RANDOM() LIMIT 1`,
    )
    .first<{ id: string }>()
  return row?.id ?? null
}

/**
 * The visitor's own votes, as "specimen:kind" keys, so a pill can show that
 * the vote is theirs. Reads an existing ticket and never issues one: a page
 * load must not make a voter of someone who has only ever looked, so a
 * ticketless visitor costs an empty set and no query at all.
 *
 * Every vote they hold, not just this page's: the stage rotates through the
 * whole collection client-side, so a page-scoped answer would go stale as
 * the visitor browses without asking the server again.
 *
 * Whatever renders this is personal to one visitor — the loads that call it
 * mark the response uncacheable.
 */
export async function ownReactions(
  db: D1Database,
  cookies: Pick<Cookies, 'get'>,
  salt: string,
): Promise<Set<string>> {
  const voter = cookies.get(VOTER_COOKIE)
  if (!voter) return new Set()
  const { results } = await db
    .prepare(`SELECT quote_id, kind FROM reactions WHERE voter_hash = ?`)
    .bind(await voterHash(voter, salt))
    .all<{ quote_id: string; kind: ReactionKind }>()
  return new Set(results.map((row) => voteKey(row.quote_id, row.kind)))
}

/** Toggle a reaction; returns whether it is now set on a published quote. */
export async function toggleReaction(
  db: D1Database,
  quoteId: string,
  kind: ReactionKind,
  voterHash: string,
): Promise<boolean> {
  const removed = await db
    .prepare(`DELETE FROM reactions WHERE quote_id = ? AND kind = ? AND voter_hash = ?`)
    .bind(quoteId, kind, voterHash)
    .run()
  if (removed.meta.changes > 0) return false
  /* OR IGNORE: a double-click races two inserts past the DELETE; the PK
     conflict is swallowed rather than 500-ing. EXISTS gates unpublished ids
     to zero rows, so the return honestly reports whether it landed. */
  const inserted = await db
    .prepare(
      `INSERT OR IGNORE INTO reactions (quote_id, kind, voter_hash)
       SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM quotes WHERE id = ? AND status = 'published')`,
    )
    .bind(quoteId, kind, voterHash, quoteId)
    .run()
  return inserted.meta.changes > 0
}

/** Anonymous deletion via the token issued at submission. Honored forever. */
export async function deleteByToken(
  db: D1Database,
  quoteId: string,
  token: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE quotes SET text = '[deleted by submitter]', status = 'deleted'
       WHERE id = ? AND delete_token_hash = ? AND status != 'deleted'`,
    )
    .bind(quoteId, await sha256Hex(token))
    .run()
  /* The API removes every immutable object before deleting the card row. If
     object cleanup fails, the hidden quote leaves its row for the admin
     housekeeping pass to retry. */
  return result.meta.changes > 0
}

/**
 * Hang, replace, or remove a signed curator's note on a published exhibit.
 * Empty text takes the plaque down.
 */
export async function setPlaque(
  db: D1Database,
  quoteId: string,
  plaque: string,
  curator: string,
): Promise<{ ok: boolean; error?: string }> {
  const text = plaque.trim()
  const by = curator.trim()
  if (text.length > MAX_PLAQUE_LENGTH)
    return { ok: false, error: `Plaques are limited to ${MAX_PLAQUE_LENGTH} characters.` }
  if (text.length > 0 && by.length === 0)
    return { ok: false, error: 'A plaque must be signed — the museum names its critics.' }
  /* ?1 is the plaque text, reused in the CASE: taking a plaque down (empty
     text) clears plaque_at; hanging or editing one preserves the original
     acquisition time. The three binds are ?1, ?2, ?3 in order. */
  const result = await db
    .prepare(
      `UPDATE quotes SET plaque = ?1, plaque_by = ?2,
         plaque_at = CASE WHEN ?1 IS NULL THEN NULL ELSE COALESCE(plaque_at, datetime('now')) END
       WHERE id = ?3 AND status = 'published'`,
    )
    .bind(text || null, text ? by : null, quoteId)
    .run()
  return result.meta.changes > 0
    ? { ok: true }
    : { ok: false, error: 'No published exhibit with that id.' }
}

/**
 * PRIVACY.md: "rejected submissions are purged after 30 days." Runs as
 * housekeeping on admin visits — no cron needed at museum scale. The
 * curator's own backlog (log_import) is deliberately exempt: those rejects
 * are the triage record, and purging them would let a wild-import re-run
 * resurrect already-rejected specimens as pending.
 */
export async function purgeExpiredRejects(db: D1Database): Promise<void> {
  await db
    .prepare(
      `DELETE FROM quotes WHERE status = 'rejected' AND source != 'log_import'
       AND created_at < datetime('now', '-30 days')`,
    )
    .run()
}

/**
 * "I can't decide yet": push a pending quote to the end of the queue. Moves
 * queued_at, never created_at — the latter is the public feed's sort key and
 * displayed date, and must stay the honest submission time.
 */
export async function passToEnd(db: D1Database, quoteId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE quotes SET queued_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
       WHERE id = ? AND status = 'pending'`,
    )
    .bind(quoteId)
    .run()
}

/*
 * The established label vocabulary: spellings worn by at least two published
 * specimens. The threshold keeps one-off typos and jokes from becoming
 * suggestions — a genuinely new model crosses it with its second approval.
 * Feeds the submit form's datalists and the admin queue's novelty flags.
 */
export async function establishedLabels(db: D1Database) {
  async function distinct(column: 'model' | 'provider' | 'integration') {
    const { results } = await db
      .prepare(
        `SELECT ${column} AS v FROM quotes
         WHERE status = 'published' AND ${column} IS NOT NULL AND ${column} != ''
         GROUP BY ${column} HAVING COUNT(*) >= 2 ORDER BY v`,
      )
      .all<{ v: string }>()
    return results.map((r) => r.v)
  }
  const [models, providers, integrations] = await Promise.all([
    distinct('model'),
    distinct('provider'),
    distinct('integration'),
  ])
  return { models, providers, integrations }
}

export async function listPending(db: D1Database, limit = 100) {
  /* The museum reads its mail before its diary: strangers' recognized
     submissions first, then their proposed acquisitions, then the curator's
     own backlog (log_import). queued_at (nudged by passToEnd) falls back
     to created_at when unset. */
  const { results } = await db
    .prepare(
      `SELECT id, text, variant, model, provider, integration, source, created_at
       FROM quotes WHERE status = 'pending'
       ORDER BY CASE WHEN source = 'log_import' THEN 2 WHEN variant = ? THEN 1 ELSE 0 END ASC,
                COALESCE(queued_at, created_at) ASC LIMIT ?`,
    )
    .bind(PROPOSED_VARIANT, limit)
    .all<
      Omit<QuoteQueryRow, 'reaction_counts' | 'variant'> & {
        source: string
        variant: PendingVariant
      }
    >()
  return results
}

/**
 * Approve or reject a pending quote. On publish the curator may hand in an
 * edited text (trimming context, redacting); it passes the same validation
 * as a fresh submission, and the variant is re-detected so an edit can never
 * strand a quote with a phrase it no longer contains.
 */
export async function moderate(
  db: D1Database,
  quoteId: string,
  decision: 'published' | 'rejected',
  editedText?: string,
  house = false,
): Promise<{ ok: boolean; error?: string }> {
  if (decision === 'rejected') {
    const rejected = await db
      .prepare(`UPDATE quotes SET status = 'rejected' WHERE id = ? AND status = 'pending'`)
      .bind(quoteId)
      .run()
    return rejected.meta.changes > 0
      ? { ok: true }
      : { ok: false, error: `Quote ${quoteId} is not pending.` }
  }

  const row = await db
    .prepare(`SELECT text, variant FROM quotes WHERE id = ? AND status = 'pending'`)
    .bind(quoteId)
    .first<{ text: string; variant: string }>()
  if (!row) return { ok: false, error: `Quote ${quoteId} is not pending.` }

  const text = (editedText ?? row.text).trim()
  const matches = detect(text)
  /* A proposal publishes only after its family is coined: with no match the
     re-detect below would keep variant 'proposed', which the proposal branch
     of validateSubmission accepts — correct at the door, wrong on the wall. */
  if (row.variant === PROPOSED_VARIANT && matches.length === 0)
    return {
      ok: false,
      error: `Quote ${quoteId} is still a proposal — the detector has no family for it yet.`,
    }
  const variant = matches.some((m) => m.variant === row.variant)
    ? row.variant
    : (matches[0]?.variant ?? row.variant)
  const errors = validateSubmission({ text, variant })
  if (errors.length > 0) return { ok: false, error: errors.map(errorMessage).join(' ') }

  /* Re-assert status = 'pending' in the UPDATE: if another tab published or
     rejected between the SELECT above and here, changes is 0 and we report
     the miss instead of a phantom success. */
  /* The house flag marks a specimen the museum submitted to itself — set
     here because nothing about a submitter is stored at submission time, so
     the moderation desk is the only honest moment to record it. NULL leaves
     the existing value alone. Internal: never shown to visitors, by the
     director's ruling. */
  const published = await db
    .prepare(
      `UPDATE quotes SET text = ?, variant = ?, status = 'published',
         approved_at = datetime('now'), house = COALESCE(?, house)
       WHERE id = ? AND status = 'pending'`,
    )
    .bind(text, variant, house ? 1 : null, quoteId)
    .run()
  return published.meta.changes > 0
    ? { ok: true }
    : { ok: false, error: `Quote ${quoteId} is not pending.` }
}

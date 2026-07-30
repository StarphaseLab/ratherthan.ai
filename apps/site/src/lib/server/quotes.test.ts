import type { D1Database } from '@cloudflare/workers-types'
import { describe, expect, it } from 'vitest'
import { MAX_TEXT_LENGTH } from '$lib/limits.ts'
import {
  moderate,
  PROPOSED_VARIANT,
  randomPositionForVariant,
  validateSubmission,
} from './quotes.ts'

const valid = {
  text: "I'll inspect the actual logs rather than speculate.",
  variant: 'rather_than',
}

describe('validateSubmission', () => {
  it('accepts a canonical specimen', () => {
    expect(validateSubmission(valid)).toEqual([])
  })

  it('rejects empty text', () => {
    expect(validateSubmission({ ...valid, text: '  ' })).toContainEqual({
      field: 'text',
      code: 'empty',
    })
  })

  it('rejects text over the length cap', () => {
    const long = `${'x'.repeat(MAX_TEXT_LENGTH)} rather than y`
    expect(validateSubmission({ ...valid, text: long })).toContainEqual({
      field: 'text',
      code: 'too_long',
    })
  })

  it('rejects text without a contrastive phrase', () => {
    expect(validateSubmission({ ...valid, text: 'All tests pass, deploying now.' })).toContainEqual(
      {
        field: 'text',
        code: 'no_match',
      },
    )
  })

  it('rejects a variant that does not appear in the text', () => {
    expect(validateSubmission({ ...valid, variant: 'instead_of' })).toContainEqual({
      field: 'variant',
      code: 'unknown',
    })
  })

  it('rejects sensitive content as a second line of defense', () => {
    const result = validateSubmission({
      ...valid,
      text: "I'll fetch https://internal.acme.dev rather than guess.",
    })
    expect(result.some((e) => e.code === 'sensitive')).toBe(true)
  })

  it('rejects oversized labels', () => {
    expect(validateSubmission({ ...valid, model: 'm'.repeat(61) })).toContainEqual({
      field: 'labels',
      code: 'too_long',
    })
  })
})

describe('proposed acquisitions', () => {
  const unnamed = 'I chose the boring fix over the clever one.'

  it('accepts an unrecognized specimen offered as a proposal', () => {
    expect(validateSubmission({ text: unnamed, variant: PROPOSED_VARIANT })).toEqual([])
  })

  it('refuses a recognized specimen smuggled in as a proposal', () => {
    expect(validateSubmission({ ...valid, variant: PROPOSED_VARIANT })).toContainEqual({
      field: 'variant',
      code: 'not_proposable',
    })
  })

  it('still screens proposals for sensitive content', () => {
    const result = validateSubmission({
      text: 'I chose https://internal.acme.dev over the clever one.',
      variant: PROPOSED_VARIANT,
    })
    expect(result.some((e) => e.code === 'sensitive')).toBe(true)
  })

  /* moderate() only needs prepare().bind().first/run — a hand stub stands in
     for D1: first() serves the pending row, run() records what would land. */
  const fakeDb = (row: { text: string; variant: string }) => {
    const writes: unknown[][] = []
    const db = {
      prepare: () => ({
        bind: (...args: unknown[]) => ({
          first: async () => row,
          run: async () => {
            writes.push(args)
            return { meta: { changes: 1 } }
          },
        }),
      }),
    }
    return { db: db as unknown as D1Database, writes }
  }

  it('refuses to publish a proposal the detector cannot name (forged form path)', async () => {
    const { db, writes } = fakeDb({ text: unnamed, variant: PROPOSED_VARIANT })
    const result = await moderate(db, 'x1', 'published')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('proposal')
    expect(writes).toEqual([])
  })

  it('publishes a proposal once the text detects, under the detected family', async () => {
    const { db, writes } = fakeDb({ text: valid.text, variant: PROPOSED_VARIANT })
    const result = await moderate(db, 'x2', 'published')
    expect(result.ok).toBe(true)
    expect(writes[0]).toContain('rather_than')
  })
})

describe('randomPositionForVariant', () => {
  const quotes = [
    { variant: 'rather_than' },
    { variant: 'instead_of' },
    { variant: 'rather_than' },
  ] as const

  it('selects a valid position within the requested variant', () => {
    expect(randomPositionForVariant(quotes, 'rather_than', () => 0)).toBe(0)
    expect(randomPositionForVariant(quotes, 'rather_than', () => 0.999)).toBe(1)
  })

  it('falls back to the first position when the variant is absent', () => {
    expect(randomPositionForVariant(quotes, 'not_just', () => 0.5)).toBe(0)
  })
})

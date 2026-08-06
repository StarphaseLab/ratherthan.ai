import type { D1Database } from '@cloudflare/workers-types'
import { describe, expect, it } from 'vitest'
import { MAX_TEXT_LENGTH } from '$lib/limits.ts'

import { voterHash } from './context.ts'
import {
  moderate,
  ownReactions,
  PROPOSED_VARIANT,
  randomPositionForVariant,
  validateSubmission,
} from './quotes.ts'

const valid = {
  text: "I'll inspect the actual logs rather than speculate.",
  variant: 'rather_than',
}

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

describe("the museum's own submissions", () => {
  /* The house flag is bound third; NULL is COALESCE's "leave it alone". */
  const houseArg = async (house?: boolean) => {
    const { db, writes } = fakeDb({ text: valid.text, variant: 'rather_than' })
    await moderate(db, 'h1', 'published', undefined, house)
    return writes[0]?.[2]
  }

  it('flags the specimen when the curator marks a publish as the house’s own', async () => {
    expect(await houseArg(true)).toBe(1)
  })

  it('leaves a visitor’s submission alone when the box is clear', async () => {
    expect(await houseArg()).toBeNull()
  })
})

describe('ownReactions', () => {
  const rows = [
    { quote_id: 'a1', kind: 'peak_agent' },
    { quote_id: 'a1', kind: 'actually_funny' },
    { quote_id: 'b2', kind: 'useful_contrast' },
  ]
  const reactionsDb = () => {
    const queries: unknown[][] = []
    const db = {
      prepare: () => ({
        bind: (...args: unknown[]) => {
          queries.push(args)
          return { all: async () => ({ results: rows }) }
        },
      }),
    }
    return { db: db as unknown as D1Database, queries }
  }

  it('keys every vote by specimen and kind', async () => {
    const { db } = reactionsDb()
    const mine = await ownReactions(db, { get: () => 'ticket' }, 'salt')
    expect([...mine].sort()).toEqual(['a1:actually_funny', 'a1:peak_agent', 'b2:useful_contrast'])
  })

  /* The privacy claim of the whole feature: looking is not voting. */
  it('asks the database nothing for a visitor holding no ticket', async () => {
    const { db, queries } = reactionsDb()
    const mine = await ownReactions(db, { get: () => undefined }, 'salt')
    expect(mine.size).toBe(0)
    expect(queries).toEqual([])
  })

  it('reads votes under the same hash the vote was written with', async () => {
    const { db, queries } = reactionsDb()
    await ownReactions(db, { get: () => 'ticket' }, 'salt')
    expect(queries[0]).toEqual([await voterHash('ticket', 'salt')])
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

import { describe, expect, it } from 'vitest'
import { MAX_TEXT_LENGTH } from '$lib/limits.ts'
import { randomPositionForVariant, validateSubmission } from './quotes.ts'

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

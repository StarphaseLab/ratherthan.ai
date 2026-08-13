import { describe, expect, it } from 'vitest'
import { detect, looksSensitive, sensitiveReasons, splitByVariant } from '../src/index.ts'
import negatives from './fixtures/negatives.json'
import positives from './fixtures/positives.json'
import sensitive from './fixtures/sensitive.json'

describe('detect — golden positives', () => {
  for (const fixture of positives) {
    it(fixture.name, () => {
      const matches = detect(fixture.text)
      expect(matches.map((m) => ({ variant: m.variant, sentence: m.sentence }))).toEqual(
        fixture.expect,
      )
    })
  }
})

describe('detect — known false positives stay negative', () => {
  for (const fixture of negatives) {
    it(fixture.name, () => {
      expect(detect(fixture.text)).toEqual([])
    })
  }
})

describe('detect — offsets map back to the original text', () => {
  it('phrase slice at the reported index equals the reported phrase', () => {
    const text = 'First line.\n```\nrather than in code\n```\nI tested it instead of assuming.'
    for (const m of detect(text)) {
      expect(text.slice(m.index, m.index + m.phrase.length)).toBe(m.phrase)
    }
  })
})

describe('sensitiveReasons — refusal screen', () => {
  for (const fixture of sensitive) {
    it(fixture.name, () => {
      expect(sensitiveReasons(fixture.text).sort()).toEqual([...fixture.reasons].sort())
      expect(looksSensitive(fixture.text)).toBe(fixture.reasons.length > 0)
    })
  }
})

describe('detect — quoted-context pairing', () => {
  it('suppresses a phrase between a closing quote reused as an opener', () => {
    expect(detect('a "b" rather than "c.')).toEqual([])
  })

  it('keeps a phrase that follows a closed quote pair', () => {
    const matches = detect('We chose X "carefully" rather than Y.')
    expect(matches.map((m) => m.variant)).toEqual(['rather_than'])
  })

  it('keeps a phrase after an unclosed quote', () => {
    const matches = detect('“He never finished — rather than guess, I asked.')
    expect(matches.map((m) => m.variant)).toEqual(['rather_than'])
  })
})

describe('detect — adversarial input stays near-linear', () => {
  it('an unclosed quote followed by thousands of phrases returns quickly', () => {
    // Pre-fix, the quoted-context regex backtracked super-linearly on this
    // shape: ~45 s at 25 KB. Post-fix it completes in well under a second.
    const hostile = `“${'not just rather than instead of '.repeat(800)}`
    const start = performance.now()
    const matches = detect(hostile)
    expect(performance.now() - start).toBeLessThan(2000)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('adversarial slash runs do not stall the file_path screen', () => {
    const hostile = `${'a/'.repeat(12000)}b`
    const start = performance.now()
    sensitiveReasons(hostile)
    expect(performance.now() - start).toBeLessThan(2000)
  })
})

describe('splitByVariant', () => {
  it('splits around the phrase', () => {
    expect(splitByVariant('I will read rather than guess.', 'rather_than')).toEqual({
      left: 'I will read ',
      phrase: 'rather than',
      right: ' guess.',
    })
  })

  it('returns null when the variant is absent', () => {
    expect(splitByVariant('I will read the logs.', 'rather_than')).toBeNull()
  })

  it('keeps the gating punctuation out of the not_just phrase', () => {
    expect(splitByVariant('proven at the apply path — not just the dry-run.', 'not_just')).toEqual({
      left: 'proven at the apply path — ',
      phrase: 'not just',
      right: ' the dry-run.',
    })
  })

  it('keeps the gating punctuation out of the not_another phrase', () => {
    expect(splitByVariant('a proper migration, not another band-aid.', 'not_another')).toEqual({
      left: 'a proper migration, ',
      phrase: 'not another',
      right: ' band-aid.',
    })
  })

  /* Every rendering surface — the stage, the hall, the minted postcard —
     splits through here, so the closing full stop must not become an orphan
     fragment on any of them. */
  it('takes the closing punctuation with a phrase that ends the sentence', () => {
    expect(
      splitByVariant("The card would be a verdict wearing a ground's clothes.", 'wearing_clothes'),
    ).toEqual({
      left: 'The card would be a verdict ',
      phrase: "wearing a ground's clothes.",
      right: '',
    })
  })

  it('leaves a mid-sentence phrase alone', () => {
    expect(splitByVariant('a move dressed as an appeal.', 'dressed_as')).toEqual({
      left: 'a move ',
      phrase: 'dressed as',
      right: ' an appeal.',
    })
  })

  it('absorbs a closing quote and stop together', () => {
    const parts = splitByVariant('It was a rewrite in a refactor’s clothing.”', 'wearing_clothes')
    expect(parts?.phrase).toBe('in a refactor’s clothing.”')
    expect(parts?.right).toBe('')
  })

  it('anchors on the first occurrence when the phrase repeats', () => {
    const parts = splitByVariant('fix it rather than patch rather than ignore', 'rather_than')
    expect(parts?.left).toBe('fix it ')
    expect(parts?.right).toBe(' patch rather than ignore')
  })
})

/**
 * @ratherthan/detector — deterministic detection of contrastive agent rhetoric.
 *
 * Design constraints, in order:
 *  1. Zero runtime dependencies. No network. No state.
 *  2. Predictable: same input, same output, rules published openly.
 *  3. Conservative: prefers missing a specimen over flagging prose that
 *     merely contains the words (code, quotations, citations).
 */

/**
 * Families group variants by rhetorical shape:
 *  - pivot: one phrase splitting the chosen path from the rejected one.
 *  - vow:   a refusal of the bare minimum (won't just / without merely / not just).
 * Families are presentation metadata; the database only ever stores variant ids.
 */
export type Family = 'pivot' | 'vow'

export type VariantId =
  | 'rather_than'
  | 'instead_of'
  | 'as_opposed_to'
  | 'wont_just'
  | 'without_merely'
  | 'not_just'
  | 'not_another'

export const FAMILIES: Record<Family, { label: string; description: string }> = {
  pivot: { label: 'pivot', description: 'the chosen path, split from the rejected one' },
  vow: { label: 'vow', description: 'a refusal of the bare minimum' },
}

/* Every vow is a refusal built on the same minimizers; patterns share this
   alternation so the accepted adverb set can never drift between variants. */
const MINIMIZERS = '(?:just|merely|simply)'

/* The postfix-dismissal gate: bare "not just" / "not another" saturate
   innocent English, so they only count when a dash or comma sets them off.
   One shared wrapper keeps the accepted gate punctuation byte-identical across
   every gated vow (same rationale as MINIMIZERS above). The lookbehind is
   zero-width, so the match — and splitByVariant's phrase — starts at "not",
   never at the dash. */
const gated = (core: RegExp) => new RegExp(`(?<=[—–,-]\\s{0,3})${core.source}`, 'i')

/* The ungated cores of the two gated vows — the phrase shape without the gate.
   not_just dismisses the bare minimum; not_another dismisses a whole genre
   ("not another prompt tweak"), a disjoint alternation ("another" confesses
   there were priors). `isNearMiss` reads them; they never escape this module. */
const NOT_JUST_CORE = new RegExp(`\\bnot\\s+${MINIMIZERS}\\b`, 'i')
const NOT_ANOTHER_CORE = /\bnot\s+(?:yet\s+another|another|one\s+more)\b/i

/**
 * A near-miss: text whose only vow phrase is an ungated bare core (a mid-clause
 * "not just" / "not another"). Interfaces use this to explain the punctuation
 * gate instead of appearing blind when detect() returns nothing. Centralized
 * here so adding a gated vow never has to touch the UI.
 */
export function isNearMiss(text: string): boolean {
  return NOT_JUST_CORE.test(text) || NOT_ANOTHER_CORE.test(text)
}

/**
 * Published detection rules — the single source of truth for the taxonomy.
 * Patterns are stored without flags; consumers derive fresh regexes from
 * `pattern.source`, so the stateful `g` flag never leaks between uses.
 * `forms` lists every surface form a pattern accepts, canonical (label) first.
 */
export const VARIANTS: Record<
  VariantId,
  { label: string; family: Family; pattern: RegExp; forms: readonly string[] }
> = {
  rather_than: {
    label: 'rather than',
    family: 'pivot',
    pattern: /\brather\s+than\b/i,
    forms: ['rather than'],
  },
  instead_of: {
    label: 'instead of',
    family: 'pivot',
    pattern: /\binstead\s+of\b/i,
    forms: ['instead of'],
  },
  as_opposed_to: {
    label: 'as opposed to',
    family: 'pivot',
    pattern: /\bas\s+opposed\s+to\b/i,
    forms: ['as opposed to'],
  },
  wont_just: {
    label: 'won’t just',
    family: 'vow',
    pattern: new RegExp(`\\b(?:won[’']t|will\\s+not)\\s+${MINIMIZERS}\\b`, 'i'),
    forms: ['won’t just', 'won’t merely', 'won’t simply'],
  },
  without_merely: {
    label: 'without merely',
    family: 'vow',
    pattern: new RegExp(`\\bwithout\\s+${MINIMIZERS}\\b`, 'i'),
    forms: ['without merely', 'without just', 'without simply'],
  },
  not_just: {
    label: 'not just',
    family: 'vow',
    pattern: gated(NOT_JUST_CORE),
    forms: ['not just', 'not merely', 'not simply'],
  },
  not_another: {
    label: 'not another',
    family: 'vow',
    /* Disjoint alternation from not_just — a category dismissed, not a minimum.
       The two vows never collide because just/merely/simply and another/one-more
       are mutually exclusive words. */
    pattern: gated(NOT_ANOTHER_CORE),
    forms: ['not another', 'not yet another', 'not one more'],
  },
}

/** Variant ids in canonical presentation order (pivots first, then vows). */
export const VARIANT_IDS = Object.keys(VARIANTS) as VariantId[]

const ANY_PHRASE = VARIANT_IDS.map((id) => VARIANTS[id].pattern.source).join('|')

export interface Match {
  variant: VariantId
  /** The full sentence containing the matched phrase, trimmed. */
  sentence: string
  /** Character offset of the matched phrase within the original input. */
  index: number
  /** The exact phrase text as it appeared. */
  phrase: string
}

/** Sentence boundary: terminal punctuation followed by whitespace, or a newline. */
const SENTENCE_BREAK = /(?<=[.!?])\s+|\n+/

/**
 * Replace fenced and inline code with spaces of equal length so that
 * character offsets in the stripped text still map to the original input.
 */
function blankCode(text: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ')
  return text.replace(/```[\s\S]*?(```|$)/g, blank).replace(/`[^`\n]*`/g, blank)
}

/** Find the sentence (in the original text) that contains the given offset. */
function sentenceAt(text: string, offset: number): string {
  let start = 0
  for (const boundary of text.matchAll(new RegExp(SENTENCE_BREAK, 'g'))) {
    const end = boundary.index
    if (offset < end) return text.slice(start, end).trim()
    start = boundary.index + boundary[0].length
  }
  return text.slice(start).trim()
}

/* A sentence we refuse to attribute: quoted speech or an explicit citation.
   Only true quotation marks delimit — a straight apostrophe is a contraction
   ("I'll", "don't"), not a quote, and treating it as one silently dropped
   ordinary agent sentences. */
const PHRASE_ANYWHERE = new RegExp(ANY_PHRASE, 'i')

function isQuotedContext(sentence: string): boolean {
  if (/^\s*>/.test(sentence)) return true // markdown blockquote
  /* Manual span walk, not the obvious ["“][^"”]*phrase[^"”]*["”] regex: that
     shape backtracks super-linearly on an unclosed quote, a ReDoS when input
     arrives unbounded. Pairing rules kept from the regex it replaces: a
     straight " both closes the open span and opens the next; ” only closes;
     a “ inside an already-open span does not reset it. */
  let open = -1
  for (let i = 0; i < sentence.length; i++) {
    const ch = sentence[i]
    if (ch === '"' || ch === '”') {
      if (open >= 0 && PHRASE_ANYWHERE.test(sentence.slice(open, i))) return true
      open = ch === '"' ? i + 1 : -1
    } else if (ch === '“' && open < 0) {
      open = i + 1
    }
  }
  return false
}

/**
 * Detect contrastive phrases in agent output text.
 * Matches inside code blocks, inline code, blockquotes, and quoted strings
 * are excluded — those are someone else's words or not words at all.
 */
/* Compiled once, not per detect() call — the submit form runs detection on
   every keystroke. Safe to share: matchAll iterates a per-call clone (spec),
   so these instances' lastIndex is never advanced and detection stays
   stateless. */
const COMPILED: readonly (readonly [VariantId, RegExp])[] = VARIANT_IDS.map((id) => [
  id,
  new RegExp(VARIANTS[id].pattern.source, 'gi'),
])

export function detect(text: string): Match[] {
  const stripped = blankCode(text)
  const matches: Match[] = []
  for (const [id, pattern] of COMPILED) {
    for (const hit of stripped.matchAll(pattern)) {
      const sentence = sentenceAt(text, hit.index)
      if (isQuotedContext(sentence)) continue
      matches.push({
        variant: id,
        sentence,
        index: hit.index,
        phrase: text.slice(hit.index, hit.index + hit[0].length),
      })
    }
  }
  return matches.sort((a, b) => a.index - b.index)
}

/**
 * Split a text around its variant phrase for display (anchored-keyword
 * rendering). Returns null when the phrase is absent so callers can fall
 * back to plain text.
 */
export function splitByVariant(
  text: string,
  variant: VariantId,
): { left: string; phrase: string; right: string } | null {
  const meta = VARIANTS[variant]
  if (!meta) return null
  const match = new RegExp(meta.pattern.source, 'i').exec(text)
  if (!match) return null
  return {
    left: text.slice(0, match.index),
    phrase: match[0],
    right: text.slice(match.index + match[0].length),
  }
}

/**
 * Reasons a sentence is unsafe to prefill for submission.
 * This is deliberately paranoid: the tool refuses and asks the human to edit,
 * rather than pretending regexes can redact reliably.
 */
export type SensitiveReason = 'url' | 'email' | 'file_path' | 'code' | 'token_like' | 'ip_address'

const SENSITIVE_CHECKS: readonly { reason: SensitiveReason; pattern: RegExp }[] = [
  { reason: 'url', pattern: /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\./i },
  { reason: 'email', pattern: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i },
  /* Anchored paths (/, ~/, ./, ../, C:\) plus bare relative paths that carry
     a file extension (src/index.ts) — the latter needs the extension so prose
     slashes ("and/or", "TCP/IP") don't trip. The segment repetition is bounded
     ({1,64} chars, {0,8} extra segments) so backtracking stays O(1) per
     position instead of quadratic on adversarial slash runs; paths deeper or
     longer than that are out of scope for prose screening. */
  {
    reason: 'file_path',
    pattern:
      /(?:^|[\s("'`])(?:\/|~\/|\.{1,2}\/|[A-Za-z]:\\)[\w./\\-]+|\b[\w-]+\/[\w-]+(?:\/[\w.-]{1,64}){0,8}\.[a-z]{1,5}\b/i,
  },
  /* No lone `;`: semicolons are ordinary prose — and the vow family's native
     punctuation ("I won't just X; I'll Y"). Braces, backticks, arrows and
     call-shapes remain the code signals. */
  { reason: 'code', pattern: /`|[{}]|=>|\(\)|::|\$\(/ },
  { reason: 'token_like', pattern: /\b(?=\w*\d)(?=\w*[a-zA-Z])[\w-]{20,}\b/ },
  /* Real IPv4 octets (0–255), so version strings like 1.0.0.0 don't read as IPs. */
  {
    reason: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/,
  },
]

/**
 * Screen a sentence for content that must not leave the machine unreviewed.
 * Returns the list of reasons; an empty list means no known risk pattern.
 * An empty list is NOT a guarantee of safety — the human review still happens.
 */
export function sensitiveReasons(sentence: string): SensitiveReason[] {
  return SENSITIVE_CHECKS.filter((c) => c.pattern.test(sentence)).map((c) => c.reason)
}

/** Convenience wrapper for a plain safe/unsafe answer. */
export function looksSensitive(sentence: string): boolean {
  return sensitiveReasons(sentence).length > 0
}

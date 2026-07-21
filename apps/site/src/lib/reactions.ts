export const REACTION_KINDS = [
  'useful_contrast',
  'peak_agent',
  'obvious_alternative',
  'self_congratulation',
  'actually_funny',
] as const

export type ReactionKind = (typeof REACTION_KINDS)[number]

/* Glyphs live in ReactionGlyphs.svelte as <symbol id="reaction-<kind>">. */
export const REACTION_META: Record<ReactionKind, { label: string; hint: string }> = {
  useful_contrast: {
    label: 'useful contrast',
    hint: 'the distinction genuinely helped',
  },
  peak_agent: { label: 'peak agent', hint: 'iconic specimen of agent-speak' },
  obvious_alternative: {
    label: 'obvious alternative',
    hint: 'rejected something nobody proposed',
  },
  self_congratulation: {
    label: 'self-congratulation',
    hint: 'praised its own basic competence',
  },
  actually_funny: {
    label: 'actually funny',
    hint: 'intentionally or accidentally excellent',
  },
}

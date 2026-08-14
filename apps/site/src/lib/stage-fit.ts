/*
 * Fixed-frame typography, shared by the hero and the hall's stage preview.
 *
 * A stage keeps its CSS height and each side of the sentence owns an equal
 * fixed share of it; a side that would overflow its share steps its type
 * down (full → compact → dense) alone — a long hook never shrinks the
 * punchline. Components render an invisible twin (`.m-item` holding each
 * side at all three sizes as `.m-side` spans, in SIZES order) so the fit
 * is measured, not guessed from char counts, and holds at any viewport.
 * A specimen too long even at dense grows the stage — degrade to a nudge,
 * never to clipped text.
 */

export const SIZES = ['', 'compact', 'dense'] as const

/* Every named phrase fits the anchor at full size. This guards the one span
   that isn't a named phrase: a match with no anchor inside it, like the
   verbless "in X's clothing", which at the full clamp overflows a phone and
   would be cut by the anchor's own overflow. No specimen on the wall uses
   that form yet; the picker offers it. */
const ANCHOR_ONE_LINE_CHARS = 16

/** Whether a phrase must step its type down to fit the anchor (see above). */
export const isLongAnchor = (phrase: string): boolean => phrase.length > ANCHOR_ONE_LINE_CHARS

/** One side's share of the stage frame: (min-height − anchor − gaps) / 2. */
export function sideShare(stage: HTMLElement, anchor: HTMLElement): number {
  const style = getComputedStyle(stage)
  const frame = Number.parseFloat(style.minHeight) || 0
  const gaps = 2 * (Number.parseFloat(style.rowGap) || 0)
  return (frame - anchor.offsetHeight - gaps) / 2
}

/** Largest size per side that fits the share, read off a rendered twin. */
export function pickSizes(item: HTMLElement, share: number): { left: string; right: string } {
  const spans = item.querySelectorAll<HTMLElement>('.m-side')
  const pick = (offset: number) => {
    for (let i = 0; i < SIZES.length; i++)
      if ((spans[2 * i + offset]?.offsetHeight ?? 0) <= share) return SIZES[i]
    return 'dense'
  }
  return { left: pick(0), right: pick(1) }
}

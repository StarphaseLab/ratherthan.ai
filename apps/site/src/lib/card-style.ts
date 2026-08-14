/*
 * Shared card constants. Bump CARD_STYLE_VERSION after a design change:
 * every existing card becomes stale and the admin page offers to re-mint.
 * Staleness compares a card's text, never how that text was split, so a
 * change to the anchoring rule is invisible to the sweep without a bump.
 */
export const CARD_STYLE_VERSION = 2
export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

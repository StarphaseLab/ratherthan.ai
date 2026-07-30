import type { VariantId } from '@ratherthan/detector'

/* Reserved variant id: a specimen offered from a family the detector can't
   name yet. Never a real VariantId (those live in VARIANTS) and never
   publishable — moderate() refuses until the curator coins the family.
   Non-server (cf. limits.ts) so the admin UI and the server validator read
   the same string. */
export const PROPOSED_VARIANT = 'proposed'

/* What a pending row may carry. Published rows always hold a real
   VariantId — the publish guard is what keeps this union out of them. */
export type PendingVariant = VariantId | typeof PROPOSED_VARIANT

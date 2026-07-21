/** The museum's one attribution convention, shared by every surface that
    signs a specimen. Empty labels fall back to the anonymous artist. */
export function attributionLabel(quote: {
  model?: string | null
  integration?: string | null
}): string {
  return (
    [quote.model, quote.integration && `via ${quote.integration}`].filter(Boolean).join(' · ') ||
    'an anonymous agent'
  )
}

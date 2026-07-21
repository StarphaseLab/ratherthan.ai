const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no lookalikes (0/O, 1/l/i)

/** URL-safe random id, e.g. for quotes and deletion tokens. */
export function randomId(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let id = ''
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length]
  return id
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

import { describe, expect, it, vi } from 'vitest'
import { putCard } from './cards.ts'

describe('putCard', () => {
  it('mints with a fractional timestamp suitable for the response ETag', async () => {
    const run = vi.fn().mockResolvedValue(undefined)
    const bind = vi.fn().mockReturnValue({ run })
    const prepare = vi.fn().mockReturnValue({ bind })
    const db = { prepare } as unknown as Parameters<typeof putCard>[0]
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer

    await putCard(db, 'specimen', png)

    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"),
    )
    expect(bind).toHaveBeenCalledWith(png, 1, 'specimen')
    expect(run).toHaveBeenCalledOnce()
  })
})

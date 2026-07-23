import { describe, expect, it, vi } from 'vitest'
import { deleteCard, putCard } from './cards.ts'

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer

function database(run = vi.fn().mockResolvedValue(undefined)) {
  const bind = vi.fn().mockReturnValue({ run })
  const prepare = vi.fn().mockReturnValue({ bind })
  return { db: { prepare } as Parameters<typeof putCard>[0], prepare, bind, run }
}

function bucket(existing = false) {
  const head = vi.fn().mockResolvedValue(existing ? { key: 'existing' } : null)
  const put = vi.fn().mockResolvedValue({ key: 'stored' })
  const del = vi.fn().mockResolvedValue(undefined)
  const list = vi.fn().mockResolvedValue({ objects: [], truncated: false })
  return {
    objects: { head, put, delete: del, list } as Parameters<typeof putCard>[1],
    head,
    put,
    del,
    list,
  }
}

describe('putCard', () => {
  it('stores immutable object metadata before setting the D1 pointer', async () => {
    const { db, prepare, bind, run } = database()
    const { objects, head, put } = bucket()

    const key = await putCard(db, objects, 'specimen', PNG)

    expect(key).toMatch(/^specimen\/[a-f0-9]{64}\.png$/)
    expect(head).toHaveBeenCalledWith(key)
    expect(put).toHaveBeenCalledWith(key, PNG, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=86400, immutable',
      },
    })
    expect(put.mock.invocationCallOrder[0]).toBeLessThan(prepare.mock.invocationCallOrder[0])
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"),
    )
    expect(bind).toHaveBeenCalledWith(PNG, 1, key, 'specimen')
    expect(run).toHaveBeenCalledOnce()
  })

  it('reuses an existing content-addressed object', async () => {
    const { db } = database()
    const { objects, put } = bucket(true)

    await putCard(db, objects, 'specimen', PNG)

    expect(put).not.toHaveBeenCalled()
  })

  it('removes a newly written object when the D1 pointer fails', async () => {
    const failure = new Error('D1 unavailable')
    const { db } = database(vi.fn().mockRejectedValue(failure))
    const { objects, del } = bucket()

    await expect(putCard(db, objects, 'specimen', PNG)).rejects.toBe(failure)
    expect(del).toHaveBeenCalledWith(expect.stringMatching(/^specimen\/[a-f0-9]{64}\.png$/))
  })
})

describe('deleteCard', () => {
  it('removes every immutable version before deleting the D1 fallback', async () => {
    const { db, prepare } = database()
    const { objects, list, del } = bucket()
    list.mockResolvedValue({
      objects: [{ key: 'specimen/one.png' }, { key: 'specimen/two.png' }],
      truncated: false,
    })

    await deleteCard(db, objects, 'specimen')

    expect(list).toHaveBeenCalledWith({ prefix: 'specimen/', cursor: undefined })
    expect(del).toHaveBeenCalledWith(['specimen/one.png', 'specimen/two.png'])
    expect(del.mock.invocationCallOrder[0]).toBeLessThan(prepare.mock.invocationCallOrder[0])
  })
})

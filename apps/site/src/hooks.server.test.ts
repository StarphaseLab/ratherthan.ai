import { describe, expect, it, vi } from 'vitest'
import { handle } from './hooks.server.ts'

async function run(routeId: string, existing?: string) {
  const cookies = {
    get: vi.fn().mockReturnValue(existing),
    set: vi.fn(),
  }
  const resolve = vi.fn().mockResolvedValue(new Response('ok'))
  const event = { route: { id: routeId }, cookies }

  await handle({ event, resolve } as unknown as Parameters<typeof handle>[0])
  return { cookies, resolve }
}

describe('voter cookie hook', () => {
  it('does not set a voter cookie on card images', async () => {
    const { cookies, resolve } = await run('/q/[id]/card.png')

    expect(cookies.set).not.toHaveBeenCalled()
    expect(resolve).toHaveBeenCalledOnce()
  })

  it('still sets a voter cookie on ordinary pages', async () => {
    const { cookies } = await run('/q/[id]')

    expect(cookies.set).toHaveBeenCalledOnce()
    expect(cookies.set).toHaveBeenCalledWith(
      'rt_voter',
      expect.any(String),
      expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' }),
    )
  })

  it('keeps an existing voter cookie', async () => {
    const { cookies } = await run('/q/[id]', 'existing')

    expect(cookies.set).not.toHaveBeenCalled()
  })
})

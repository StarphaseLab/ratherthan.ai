import { describe, expect, it, vi } from 'vitest'
import { getOrCreateVoter } from './context.ts'

function cookieJar(existing?: string) {
  return {
    get: vi.fn().mockReturnValue(existing),
    set: vi.fn(),
  }
}

describe('getOrCreateVoter', () => {
  it('creates the anonymous cookie when a visitor first reacts', () => {
    const cookies = cookieJar()

    const voter = getOrCreateVoter(cookies)

    expect(voter).toHaveLength(20)
    expect(cookies.set).toHaveBeenCalledWith(
      'rt_voter',
      voter,
      expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' }),
    )
  })

  it('keeps an existing voter identity', () => {
    const cookies = cookieJar('existing')

    expect(getOrCreateVoter(cookies)).toBe('existing')
    expect(cookies.set).not.toHaveBeenCalled()
  })
})

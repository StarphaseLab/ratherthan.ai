import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './+server.ts'

const getCard = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/cards.ts', () => ({ getCard }))

const CARD = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2]).buffer
const HOUSE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 3, 4]).buffer
const DB = { name: 'test-db' }

function event(options: { db?: boolean; assets?: ReturnType<typeof vi.fn>; etag?: string } = {}) {
  const url = new URL('https://ratherthan.ai/q/specimen/card.png')
  const headers = options.etag ? { 'if-none-match': options.etag } : undefined
  return {
    params: { id: 'specimen' },
    platform: {
      env: {
        ...(options.db === false ? {} : { DB }),
        ...(options.assets ? { ASSETS: { fetch: options.assets } } : {}),
      },
    },
    request: new Request(url, { headers }),
    url,
  } as unknown as Parameters<typeof GET>[0]
}

describe('specimen card response', () => {
  beforeEach(() => {
    getCard.mockReset()
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('serves a minted card with its cache policy and validator', async () => {
    getCard.mockResolvedValue({ png: CARD, minted_at: '2026-07-23T12:34:56.789Z' })

    const response = await GET(event())

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('content-length')).toBe(String(CARD.byteLength))
    expect(response.headers.get('cache-control')).toBe('public, max-age=86400')
    expect(response.headers.get('etag')).toBe('"specimen:2026-07-23T12:34:56.789Z"')
    expect(response.headers.has('set-cookie')).toBe(false)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(CARD))
    expect(getCard).toHaveBeenCalledWith(DB, 'specimen')
  })

  it('answers a matching conditional request without reading the body again', async () => {
    const etag = '"specimen:2026-07-23T12:34:56.789Z"'
    getCard.mockResolvedValue({ png: CARD, minted_at: '2026-07-23T12:34:56.789Z' })

    const response = await GET(event({ etag }))

    expect(response.status).toBe(304)
    expect(response.headers.get('etag')).toBe(etag)
    expect((await response.arrayBuffer()).byteLength).toBe(0)
  })

  it('serves house-card bytes with a short cache when the card is missing', async () => {
    getCard.mockResolvedValue(null)
    const assets = vi
      .fn()
      .mockResolvedValue(new Response(HOUSE, { headers: { 'content-type': 'image/png' } }))

    const response = await GET(event({ assets }))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('content-length')).toBe(String(HOUSE.byteLength))
    expect(response.headers.get('cache-control')).toBe('public, max-age=300')
    expect(response.headers.has('location')).toBe(false)
    expect(response.headers.has('set-cookie')).toBe(false)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(HOUSE))
  })

  it('fails soft to the house card when D1 is unavailable', async () => {
    const assets = vi.fn().mockResolvedValue(new Response(HOUSE))

    const response = await GET(event({ db: false, assets }))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=300')
    expect(getCard).not.toHaveBeenCalled()
  })

  it('fails soft to the house card when the D1 read throws', async () => {
    getCard.mockRejectedValue(new Error('D1 unavailable'))
    const assets = vi.fn().mockResolvedValue(new Response(HOUSE))

    const response = await GET(event({ assets }))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=300')
  })

  it('uses the redirect only when the house asset cannot be read', async () => {
    getCard.mockResolvedValue(null)
    const assets = vi.fn().mockRejectedValue(new Error('assets unavailable'))

    const response = await GET(event({ assets }))

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/og.png')
  })
})

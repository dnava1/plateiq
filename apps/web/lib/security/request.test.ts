import { describe, expect, it } from 'vitest'
import { isSameOriginRequest, PRIVATE_NO_STORE_HEADERS } from './request'

describe('request security helpers', () => {
  it('requires a same-origin Origin header for state-changing requests', () => {
    expect(isSameOriginRequest(new Request('https://plateiq.test/api/feedback', {
      headers: { origin: 'https://plateiq.test' },
    }))).toBe(true)

    expect(isSameOriginRequest(new Request('https://plateiq.test/api/feedback', {
      headers: { origin: 'https://evil.test' },
    }))).toBe(false)

    expect(isSameOriginRequest(new Request('https://plateiq.test/api/feedback'))).toBe(false)
  })

  it('uses private no-store cache headers for authenticated API responses', () => {
    expect(PRIVATE_NO_STORE_HEADERS).toEqual({
      'Cache-Control': 'private, no-store',
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  finalizePendingGuestMerge: vi.fn(),
  getExpiredMergeIntentCookieOptions: vi.fn(() => ({ path: '/', maxAge: 0 })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/lib/auth/merge', () => ({
  MERGE_INTENT_COOKIE_NAME: 'plateiq-merge-intent',
  finalizePendingGuestMerge: mocks.finalizePendingGuestMerge,
  getExpiredMergeIntentCookieOptions: mocks.getExpiredMergeIntentCookieOptions,
}))

function createRequest() {
  return new Request('http://localhost/api/auth/merge/finalize', {
    method: 'POST',
    headers: {
      origin: 'http://localhost',
    },
  })
}

function createSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'permanent-user',
            is_anonymous: false,
          },
        },
        error: null,
      }),
    },
  }
}

describe('POST /api/auth/merge/finalize', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
    mocks.finalizePendingGuestMerge.mockReset()
    mocks.getExpiredMergeIntentCookieOptions.mockClear()
  })

  it('clears the merge cookie after a successful merge', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.finalizePendingGuestMerge.mockResolvedValue({ status: 'merged', summary: { workouts: 4 } })

    const response = await POST(createRequest())

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=;')
  })

  it('preserves the merge cookie when the wrong target account is signed in', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.finalizePendingGuestMerge.mockResolvedValue({ status: 'invalid_target' })

    const response = await POST(createRequest())

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Sign in to the account you selected for this merge before trying again.',
    })
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('clears the merge cookie when the pending intent is no longer valid', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.finalizePendingGuestMerge.mockResolvedValue({ status: 'expired' })

    const response = await POST(createRequest())

    expect(response.status).toBe(409)
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=;')
  })
})
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

function createSupabaseClient({
  user = {
    id: 'permanent-user',
    is_anonymous: false,
  },
  authError = null,
}: {
  user?: { id: string; is_anonymous: boolean } | null
  authError?: { message: string } | null
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user,
        },
        error: authError,
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

  it('rejects cross-origin finalize attempts', async () => {
    const response = await POST(new Request('http://localhost/api/auth/merge/finalize', {
      method: 'POST',
      headers: {
        origin: 'http://malicious.example',
      },
    }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('requires an authenticated permanent user before finalizing', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ user: null }))

    const response = await POST(createRequest())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(mocks.finalizePendingGuestMerge).not.toHaveBeenCalled()
  })

  it('rejects anonymous users before invoking the merge RPC', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({
      user: {
        id: 'guest-user',
        is_anonymous: true,
      },
    }))

    const response = await POST(createRequest())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Guest sessions must sign in to an existing account before finalizing a merge.',
    })
    expect(mocks.finalizePendingGuestMerge).not.toHaveBeenCalled()
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

  it('returns not found when no guest merge is in progress', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.finalizePendingGuestMerge.mockResolvedValue({ status: 'none' })

    const response = await POST(createRequest())

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'No guest merge is in progress.' })
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=;')
  })
})
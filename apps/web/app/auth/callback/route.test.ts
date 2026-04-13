import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  cancelPendingGuestMerge: vi.fn(),
  finalizePendingGuestMerge: vi.fn(),
  getExpiredMergeIntentCookieOptions: vi.fn(() => ({ path: '/', maxAge: 0 })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/lib/auth/merge', () => ({
  MERGE_INTENT_COOKIE_NAME: 'plateiq-merge-intent',
  cancelPendingGuestMerge: mocks.cancelPendingGuestMerge,
  finalizePendingGuestMerge: mocks.finalizePendingGuestMerge,
  getExpiredMergeIntentCookieOptions: mocks.getExpiredMergeIntentCookieOptions,
}))

function createSupabaseClient({
  authSucceeded = true,
  user = { id: 'permanent-user', is_anonymous: false },
  userError = null,
}: {
  authSucceeded?: boolean
  user?: { id: string; is_anonymous: boolean } | null
  userError?: { message: string } | null
} = {}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: authSucceeded ? null : { message: 'bad code' } }),
      verifyOtp: vi.fn().mockResolvedValue({ error: { message: 'unused' } }),
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: userError }),
    },
  }
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
    mocks.cancelPendingGuestMerge.mockReset()
    mocks.finalizePendingGuestMerge.mockReset()
  })

  it('clears pending merge state when auth callback verification fails', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ authSucceeded: false }))
    mocks.cancelPendingGuestMerge.mockResolvedValue(false)

    const response = await GET(new Request('http://localhost/auth/callback?code=bad-code') as never)

    expect(response.headers.get('location')).toBe('http://localhost/login?error=auth_failed')
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=;')
  })

  it('preserves the merge cookie when the callback lands on the wrong account', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.finalizePendingGuestMerge.mockResolvedValue({ status: 'invalid_target' })

    const response = await GET(new Request('http://localhost/auth/callback?code=good-code&merge=1&next=%2Fsettings%3Fmerged%3D1') as never)

    expect(response.headers.get('location')).toBe('http://localhost/settings?merge=resume')
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('treats a missing merge intent as expired during merge callbacks', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.finalizePendingGuestMerge.mockResolvedValue({ status: 'none' })

    const response = await GET(new Request('http://localhost/auth/callback?code=good-code&merge=1&next=%2Fsettings%3Fmerged%3D1') as never)

    expect(response.headers.get('location')).toBe('http://localhost/settings?merge=expired')
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=;')
  })

  it('redirects merged callbacks to settings and clears the merge cookie', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.finalizePendingGuestMerge.mockResolvedValue({ status: 'merged', summary: { merged: true } })

    const response = await GET(new Request('http://localhost/auth/callback?code=good-code&merge=1&next=%2Fsettings%3Fmerged%3D1') as never)

    expect(response.headers.get('location')).toBe('http://localhost/settings?merged=1')
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=;')
  })

  it('clears the merge cookie when auth succeeds but no user is returned', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ user: null }))
    mocks.cancelPendingGuestMerge.mockResolvedValue(false)

    const response = await GET(new Request('http://localhost/auth/callback?code=good-code&merge=1') as never)

    expect(response.headers.get('location')).toBe('http://localhost/login?error=auth_failed')
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=;')
  })

  it('preserves the merge cookie when merge finalization throws during callback recovery', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.finalizePendingGuestMerge.mockRejectedValue(new Error('merge failed'))

    const response = await GET(new Request('http://localhost/auth/callback?code=good-code&merge=1&next=%2Fsettings%3Fmerged%3D1') as never)

    expect(response.headers.get('location')).toBe('http://localhost/settings?merge=resume')
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('does not finalize merge state on normal auth callbacks', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())

    const response = await GET(new Request('http://localhost/auth/callback?code=good-code&next=%2Fdashboard') as never)

    expect(response.headers.get('location')).toBe('http://localhost/dashboard')
    expect(mocks.finalizePendingGuestMerge).not.toHaveBeenCalled()
  })
})
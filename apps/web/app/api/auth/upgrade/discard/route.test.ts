import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, POST } from './route'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  isAnonymousUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/lib/auth/auth-state', () => ({
  isAnonymousUser: mocks.isAnonymousUser,
}))

function createSupabaseClient(user: { id: string; is_anonymous: boolean } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  }
}

describe('POST /api/auth/upgrade/discard', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
    mocks.isAnonymousUser.mockReset()
  })

  it('stores the guest user id in a cleanup cookie', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ id: 'guest-user', is_anonymous: true }))
    mocks.isAnonymousUser.mockReturnValue(true)

    const response = await POST(new Request('http://localhost/api/auth/upgrade/discard', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
      },
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('plateiq-discard-guest-user=guest-user')
  })

  it('rejects non-guest users', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ id: 'permanent-user', is_anonymous: false }))
    mocks.isAnonymousUser.mockReturnValue(false)

    const response = await POST(new Request('http://localhost/api/auth/upgrade/discard', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
      },
    }))

    expect(response.status).toBe(403)
  })

  it('clears the cleanup cookie on same-origin delete', async () => {
    const response = await DELETE(new Request('http://localhost/api/auth/upgrade/discard', {
      method: 'DELETE',
      headers: {
        origin: 'http://localhost',
      },
    }))

    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toContain('plateiq-discard-guest-user=;')
  })
})
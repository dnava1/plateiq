import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

function createSupabaseClient({
  exchangeCodeError = null,
  verifyOtpError = null,
  user = { id: 'permanent-user', is_anonymous: false },
}: {
  exchangeCodeError?: { message: string } | null
  verifyOtpError?: { message: string } | null
  user?: { id: string; is_anonymous: boolean } | null
} = {}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: exchangeCodeError }),
      verifyOtp: vi.fn().mockResolvedValue({ error: verifyOtpError }),
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  }
}

function createAdminSupabaseClient({
  sourceUser = { id: 'guest-user', is_anonymous: true },
}: {
  sourceUser?: { id: string; is_anonymous: boolean } | null
} = {}) {
  return {
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getUserById: vi.fn().mockResolvedValue({ data: { user: sourceUser }, error: null }),
      },
    },
  }
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    mocks.createAdminClient.mockReset()
    mocks.createClient.mockReset()
  })

  it('redirects successful auth callbacks to the requested path', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())

    const response = await GET(new Request('http://localhost/auth/callback?code=good-code&next=%2Fdashboard') as never)

    expect(response.headers.get('location')).toBe('http://localhost/dashboard')
  })

  it('redirects failed signed-out auth callbacks back to continue', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ exchangeCodeError: { message: 'bad code' }, user: null }))

    const response = await GET(new Request('http://localhost/auth/callback?code=bad-code&next=%2Fanalytics') as never)

    expect(response.headers.get('location')).toBe('http://localhost/continue?error=auth_failed&next=%2Fanalytics')
  })

  it('redirects verified token callbacks to the requested path', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ exchangeCodeError: { message: 'missing code' } }))

    const response = await GET(new Request('http://localhost/auth/callback?token_hash=test-token&type=magiclink&next=%2Fdashboard') as never)

    expect(response.headers.get('location')).toBe('http://localhost/dashboard')
  })

  it('redirects failed anonymous auth callbacks back to upgrade', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({
      exchangeCodeError: { message: 'bad code' },
      user: { id: 'guest-user', is_anonymous: true },
    }))

    const response = await GET(new Request('http://localhost/auth/callback?code=bad-code') as never)

    expect(response.headers.get('location')).toBe('http://localhost/upgrade?error=auth_failed')
  })

  it('falls back to a Google sign-in flow when the provider callback reports identity_already_exists directly', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({
      user: { id: 'guest-user', is_anonymous: true },
    }))

    const response = await GET(new Request(
      'http://localhost/auth/callback?error=server_error&error_code=identity_already_exists&next=%2Fsettings',
    ) as never)

    expect(response.headers.get('location')).toBe('http://localhost/upgrade?upgrade_mode=existing_google')
    expect(response.headers.get('set-cookie')).toContain('plateiq-discard-guest-user=guest-user')
  })

  it('falls back to a Google sign-in flow when a guest upgrade targets an existing account', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({
      exchangeCodeError: { message: '422: Identity is already linked to another user' },
      user: { id: 'guest-user', is_anonymous: true },
    }))

    const response = await GET(new Request('http://localhost/auth/callback?code=bad-code&next=%2Fsettings') as never)

    expect(response.headers.get('location')).toBe('http://localhost/upgrade?upgrade_mode=existing_google')
    expect(response.headers.get('set-cookie')).toContain('plateiq-discard-guest-user=guest-user')
  })

  it('clears the discarded guest cookie when the retry sign-in fails', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({
      exchangeCodeError: { message: 'bad code' },
      user: null,
    }))

    const response = await GET(new Request(
      'http://localhost/auth/callback?code=bad-code&next=%2Fsettings&upgrade_mode=existing_google',
      {
        headers: {
          cookie: 'plateiq-discard-guest-user=guest-user',
        },
      },
    ) as never)

    expect(response.headers.get('location')).toBe('http://localhost/continue?error=auth_failed&next=%2Fsettings')
    expect(response.headers.get('set-cookie')).toContain('plateiq-discard-guest-user=;')
  })

  it('deletes the discarded guest user after the fallback signs into an existing account', async () => {
    const admin = createAdminSupabaseClient()
    mocks.createAdminClient.mockReturnValue(admin)
    mocks.createClient.mockResolvedValue(createSupabaseClient())

    const response = await GET(new Request(
      'http://localhost/auth/callback?code=good-code&next=%2Fsettings&upgrade_mode=existing_google',
      {
        headers: {
          cookie: 'plateiq-discard-guest-user=guest-user',
        },
      },
    ) as never)

    expect(admin.auth.admin.getUserById).toHaveBeenCalledWith('guest-user')
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('guest-user')
    expect(response.headers.get('location')).toBe('http://localhost/settings')
    expect(response.headers.get('set-cookie')).toContain('plateiq-discard-guest-user=;')
  })
})
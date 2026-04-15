import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
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

describe('GET /auth/callback', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
  })

  it('redirects successful auth callbacks to the requested path', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())

    const response = await GET(new Request('http://localhost/auth/callback?code=good-code&next=%2Fdashboard') as never)

    expect(response.headers.get('location')).toBe('http://localhost/dashboard')
  })

  it('redirects verified email callbacks to the requested path', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ exchangeCodeError: { message: 'missing code' } }))

    const response = await GET(new Request('http://localhost/auth/callback?token_hash=test-token&type=email&next=%2Fupgrade%3Fstep%3Dpassword') as never)

    expect(response.headers.get('location')).toBe('http://localhost/upgrade?step=password')
  })

  it('redirects failed auth callbacks back to login', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ exchangeCodeError: { message: 'bad code' } }))

    const response = await GET(new Request('http://localhost/auth/callback?code=bad-code') as never)

    expect(response.headers.get('location')).toBe('http://localhost/login?error=auth_failed')
  })
})
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  findAuthUserByEmail: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
  findAuthUserByEmail: mocks.findAuthUserByEmail,
}))

function createRequest(body: unknown) {
  return new Request('http://localhost/api/auth/merge/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost',
    },
    body: JSON.stringify(body),
  })
}

function createSupabaseClient(userId = 'guest-user') {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  const is = vi.fn(() => ({ maybeSingle }))
  const eqAfterSelect = vi.fn(() => ({ is }))
  const select = vi.fn(() => ({ eq: eqAfterSelect }))
  const deleteEq = vi.fn().mockResolvedValue({ error: null })
  const deleteFn = vi.fn(() => ({ eq: deleteEq }))
  const insert = vi.fn().mockResolvedValue({ error: null })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: userId,
            is_anonymous: true,
          },
        },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select,
      delete: deleteFn,
      insert,
    })),
    maybeSingle,
    deleteEq,
    eqAfterSelect,
    insert,
    is,
    select,
  }
}

describe('POST /api/auth/merge/prepare', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
    mocks.createAdminClient.mockReset()
    mocks.findAuthUserByEmail.mockReset()
  })

  it('rejects requests without a target email', async () => {
    const response = await POST(createRequest({}))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Enter the email address of the account you want to merge into.',
    })
  })

  it('prepares the same outward merge response for unknown accounts', async () => {
    const supabase = createSupabaseClient()
    mocks.createClient.mockResolvedValue(supabase)
    mocks.createAdminClient.mockReturnValue({})
    mocks.findAuthUserByEmail.mockResolvedValue(null)

    const response = await POST(createRequest({ targetEmail: 'existing@example.com' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      prepared: true,
      expiresAt: expect.any(String),
    })
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      source_user_id: 'guest-user',
      target_user_id: 'guest-user',
    }))
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=')
  })

  it('creates a target-bound merge intent and sets the merge cookie', async () => {
    const supabase = createSupabaseClient('guest-user')
    mocks.createClient.mockResolvedValue(supabase)
    mocks.createAdminClient.mockReturnValue({})
    mocks.findAuthUserByEmail.mockResolvedValue({
      id: 'permanent-user',
      is_anonymous: false,
    })

    const response = await POST(createRequest({ targetEmail: 'existing@example.com' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      prepared: true,
      expiresAt: expect.any(String),
    })
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      source_user_id: 'guest-user',
      target_user_id: 'permanent-user',
    }))
    expect(response.headers.get('set-cookie')).toContain('plateiq-merge-intent=')
  })

  it('rate limits repeated merge preparation attempts', async () => {
    const supabase = createSupabaseClient('guest-user')
    supabase.maybeSingle.mockResolvedValue({
      data: {
        id: 1,
        created_at: new Date().toISOString(),
      },
      error: null,
    })
    mocks.createClient.mockResolvedValue(supabase)

    const response = await POST(createRequest({ targetEmail: 'existing@example.com' }))

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: 'Wait a few seconds before trying another account merge.',
    })
    expect(supabase.insert).not.toHaveBeenCalled()
  })
})
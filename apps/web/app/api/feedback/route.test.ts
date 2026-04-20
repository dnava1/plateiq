import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

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

function createJsonRequest(body: unknown, origin = 'http://localhost') {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin,
    },
    body: JSON.stringify(body),
  })
}

function createInvalidJsonRequest() {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost',
    },
    body: '{invalid-json',
  })
}

function createSupabaseClient({
  user = { id: 'user-1' },
}: {
  user?: { id: string } | null
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  }
}

function createAdminClient({
  insertedRow = {
    id: 17,
    created_at: '2026-04-20T12:45:00.000Z',
  },
  insertError = null,
}: {
  insertedRow?: { id: number; created_at: string } | null
  insertError?: { message: string } | null
}) {
  const single = vi.fn().mockResolvedValue({
    data: insertError ? null : insertedRow,
    error: insertError,
  })
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  const from = vi.fn().mockReturnValue({ insert })

  return {
    from,
    __mocks: {
      insert,
    },
  }
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    mocks.createAdminClient.mockReset()
    mocks.createClient.mockReset()
  })

  it('rejects non-same-origin submissions', async () => {
    const response = await POST(createJsonRequest({
      category: 'bug',
      message: 'This submission should be blocked before validation.',
    }, 'https://malicious.example'))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
  })

  it('rejects invalid JSON', async () => {
    const response = await POST(createInvalidJsonRequest())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Request body must be valid JSON.',
    })
  })

  it('validates request input before hitting Supabase', async () => {
    const response = await POST(createJsonRequest({
      category: 'bug',
      message: 'short',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Add at least 10 characters so we have enough context.',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated submissions', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ user: null }))

    const response = await POST(createJsonRequest({
      category: 'feature_request',
      message: 'Please add a clearer cycle review summary in programs.',
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('stores feedback for the authenticated user and ignores spoofed identity fields', async () => {
    const supabase = createSupabaseClient({})
    const admin = createAdminClient({})
    mocks.createClient.mockResolvedValue(supabase)
    mocks.createAdminClient.mockReturnValue(admin)

    const response = await POST(createJsonRequest({
      category: 'bug',
      message: 'The workout summary kept the previous set note after refresh.',
      sourcePath: '/settings',
      userId: 'spoofed-user',
    }))

    expect(response.status).toBe(201)
    expect(admin.from).toHaveBeenCalledWith('feedback_submissions')
    expect(admin.__mocks.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      category: 'bug',
      message: 'The workout summary kept the previous set note after refresh.',
      source_path: '/settings',
      status: 'new',
    })
    await expect(response.json()).resolves.toEqual({
      submissionId: 17,
      createdAt: '2026-04-20T12:45:00.000Z',
    })
  })

  it('returns a clean error when the insert fails', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({}))
    mocks.createAdminClient.mockReturnValue(createAdminClient({
      insertError: { message: 'insert failed' },
    }))

    const response = await POST(createJsonRequest({
      category: 'other',
      message: 'Something felt off about the current trust copy placement.',
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to save feedback right now.',
    })
  })
})
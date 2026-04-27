import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

function createAdminClient({
  count = 12,
  error = null,
}: {
  count?: number | null
  error?: { message: string } | null
}) {
  const select = vi.fn().mockResolvedValue({ count, error })
  const from = vi.fn().mockReturnValue({ select })

  return {
    from,
  }
}

describe('GET /api/cron/keepalive', () => {
  beforeEach(() => {
    mocks.createAdminClient.mockReset()
    vi.stubEnv('NODE_ENV', 'test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows local requests when no cron secret is configured outside production', async () => {
    mocks.createAdminClient.mockReturnValue(createAdminClient({ count: 7 }))

    const response = await GET(new Request('http://localhost/api/cron/keepalive'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      exerciseCount: 7,
    })
  })

  it('rejects requests with an invalid bearer token when a cron secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', 'expected-secret')

    const response = await GET(new Request('http://localhost/api/cron/keepalive', {
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('fails closed in production when the cron secret is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const response = await GET(new Request('https://example.com/api/cron/keepalive'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Cron is not configured.' })
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('returns a clean error when the healthcheck query fails', async () => {
    vi.stubEnv('CRON_SECRET', 'expected-secret')
    mocks.createAdminClient.mockReturnValue(createAdminClient({
      error: { message: 'database unavailable' },
    }))

    const response = await GET(new Request('http://localhost/api/cron/keepalive', {
      headers: {
        authorization: 'Bearer expected-secret',
      },
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Unable to complete cron keepalive.' })
  })
})
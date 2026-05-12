import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

function createRequest(query: Record<string, string>) {
  const params = new URLSearchParams(query)
  return new Request(`http://localhost/api/insights/last?${params.toString()}`, {
    method: 'GET',
  })
}

function createSupabaseClient({
  user = { id: 'user-1' },
  cacheRpcData = null,
  cacheRpcError = null,
}: {
  user?: { id: string } | null
  cacheRpcData?: unknown
  cacheRpcError?: { message: string } | null
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === 'get_ai_insight_cache') {
        return Promise.resolve({ data: cacheRpcData, error: cacheRpcError })
      }

      return Promise.resolve({ data: null, error: { message: `Unexpected rpc call: ${fn}` } })
    }),
  }
}

describe('GET /api/insights/last', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
  })

  it('rejects unauthenticated requests', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ user: null }))

    const response = await GET(createRequest({
      dateFrom: '2026-02-01',
      dateTo: '2026-04-01',
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('validates query parameters before hitting Supabase', async () => {
    const response = await GET(createRequest({
      dateFrom: 'not-a-date',
      dateTo: '2026-04-01',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'dateFrom must use YYYY-MM-DD format.',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('returns 204 when there is no saved insight for the current filter', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ cacheRpcData: null }))

    const response = await GET(createRequest({
      dateFrom: '2026-02-01',
      dateTo: '2026-04-01',
      exerciseId: '1',
    }))

    expect(response.status).toBe(204)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('returns the last saved insight without requiring an Origin header', async () => {
    const supabase = createSupabaseClient({
      cacheRpcData: {
        generated_at: '2026-04-01T12:00:00.000Z',
        insight: {
          summary: 'Bench press is trending up.',
          strengths: ['Bench press estimated 1RM improved.'],
          concerns: ['Volume balance data is limited in this filter.'],
          recommendations: ['Keep top-end bench work steady next week.'],
          progressionGuidance: {
            disposition: 'actionable',
            action: 'increase',
            exerciseName: 'Bench Press',
            methodContext: 'loaded_strength',
            rationale: 'You have enough comparable signal to move Bench Press forward conservatively.',
          },
        },
      },
    })
    mocks.createClient.mockResolvedValue(supabase)

    const response = await GET(createRequest({
      dateFrom: '2026-02-01',
      dateTo: '2026-04-01',
      exerciseId: '1',
    }))

    expect(response.status).toBe(200)
    expect(supabase.rpc).toHaveBeenCalledWith('get_ai_insight_cache', {
      p_date_from: '2026-02-01',
      p_date_to: '2026-04-01',
      p_exercise_id: 1,
    })
    await expect(response.json()).resolves.toEqual({
      summary: 'Bench press is trending up.',
      strengths: ['Bench press estimated 1RM improved.'],
      concerns: ['Volume balance data is limited in this filter.'],
      recommendations: ['Keep top-end bench work steady next week.'],
      progressionGuidance: {
        disposition: 'actionable',
        action: 'increase',
        exerciseName: 'Bench Press',
        methodContext: 'loaded_strength',
        rationale: 'You have enough comparable signal to move Bench Press forward conservatively.',
      },
      generatedAt: '2026-04-01T12:00:00.000Z',
      source: 'cached',
    })
  })

  it('maps cache read failures to a clean public response', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({
      cacheRpcError: { message: 'rpc failed' },
    }))

    const response = await GET(createRequest({
      dateFrom: '2026-02-01',
      dateTo: '2026-04-01',
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to load the last saved insight right now.',
    })
  })
})
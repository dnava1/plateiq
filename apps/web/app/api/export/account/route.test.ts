// @vitest-environment node

import { strFromU8, unzipSync } from 'fflate'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCOUNT_EXPORT_SERIALIZED_MAX_BYTES,
  ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION,
} from '@/lib/export/account-export'
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

function createRequest(body: unknown, origin = 'http://localhost') {
  return new Request('http://localhost/api/export/account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin,
    },
    body: JSON.stringify(body),
  })
}

function createInvalidJsonRequest() {
  return new Request('http://localhost/api/export/account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost',
    },
    body: '{invalid-json',
  })
}

function createQuotaPayload({
  allowed = true,
  limit = 5,
  used = 1,
  remaining = 4,
  resetAt = '2026-05-12T15:00:00.000Z',
}: {
  allowed?: boolean
  limit?: number
  used?: number
  remaining?: number
  resetAt?: string
} = {}) {
  return {
    allowed,
    limit,
    used,
    remaining,
    reset_at: resetAt,
  }
}

function createExportPayload() {
  return {
    schemaVersion: ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION,
    snapshotAt: '2026-05-12T14:30:00.000Z',
    ownerUserId: '550e8400-e29b-41d4-a716-446655440000',
    training_programs: [
      {
        config: null,
        created_at: '2026-05-01T12:00:00.000Z',
        id: 7,
        is_active: true,
        name: '5/3/1 BBB',
        start_date: '2026-05-01',
        template_key: 'wendler-531-bbb',
        updated_at: '2026-05-02T12:00:00.000Z',
      },
    ],
    cycles: [
      {
        auto_progression_applied: false,
        completed_at: null,
        config: null,
        created_at: '2026-05-01T12:00:00.000Z',
        cycle_number: 1,
        id: 11,
        program_id: 7,
        start_date: '2026-05-01',
        template_key: 'wendler-531-bbb',
      },
    ],
    workouts: [
      {
        completed_at: '2026-05-03T12:15:00.000Z',
        created_at: '2026-05-03T12:00:00.000Z',
        cycle_id: 11,
        day_label: 'Bench Day',
        id: 19,
        notes: 'Felt strong today.',
        primary_exercise_id: 3,
        scheduled_date: '2026-05-03',
        started_at: '2026-05-03T12:00:00.000Z',
        week_number: 1,
      },
    ],
    workout_sets: [
      {
        exercise_id: 3,
        id: 27,
        intensity_type: 'percentage',
        is_amrap: false,
        logged_at: '2026-05-03T12:05:00.000Z',
        prescribed_intensity: 0.75,
        prescribed_weight_lbs: 170,
        prescription_base_weight_lbs: 225,
        reps_actual: 5,
        reps_prescribed: 5,
        reps_prescribed_max: null,
        rpe: 8,
        set_order: 1,
        set_type: 'work',
        updated_at: '2026-05-03T12:05:00.000Z',
        weight_lbs: 170,
        workout_id: 19,
      },
    ],
    exercises: [
      {
        analytics_track: 'bench_press',
        created_at: '2026-04-01T00:00:00.000Z',
        id: 3,
        is_custom: false,
        movement_pattern: 'push',
        name: 'Bench Press',
        progression_increment_lbs: 5,
        strength_lift_slug: 'bench',
      },
    ],
  }
}

function createSupabaseClient({
  user = { id: '550e8400-e29b-41d4-a716-446655440000', is_anonymous: false },
}: {
  user?: { id: string; is_anonymous?: boolean } | null
} = {}) {
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
  exportRpcData = createExportPayload(),
  exportRpcError = null,
  reserveQuotaRpcData = createQuotaPayload(),
  reserveQuotaRpcError = null,
  commitQuotaRpcData = createQuotaPayload(),
  commitQuotaRpcError = null,
  releaseQuotaRpcData = createQuotaPayload({ used: 0, remaining: 5 }),
  releaseQuotaRpcError = null,
}: {
  reserveQuotaRpcData?: unknown
  reserveQuotaRpcError?: { message: string } | null
  commitQuotaRpcData?: unknown
  commitQuotaRpcError?: { message: string } | null
  releaseQuotaRpcData?: unknown
  releaseQuotaRpcError?: { message: string } | null
  exportRpcData?: unknown
  exportRpcError?: { message: string } | null
} = {}) {
  return {
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === 'export_my_training_graph_v1') {
        return Promise.resolve({ data: exportRpcData, error: exportRpcError })
      }

      if (fn === 'reserve_account_export_slot') {
        return Promise.resolve({ data: reserveQuotaRpcData, error: reserveQuotaRpcError })
      }

      if (fn === 'commit_account_export') {
        return Promise.resolve({ data: commitQuotaRpcData, error: commitQuotaRpcError })
      }

      if (fn === 'release_account_export_slot') {
        return Promise.resolve({ data: releaseQuotaRpcData, error: releaseQuotaRpcError })
      }

      return Promise.resolve({ data: null, error: { message: `Unexpected rpc call: ${fn}` } })
    }),
  }
}

describe('POST /api/export/account', () => {
  beforeEach(() => {
    mocks.createAdminClient.mockReset()
    mocks.createClient.mockReset()
  })

  it('rejects non-same-origin submissions', async () => {
    const response = await POST(createRequest({ format: 'zip-json-v1' }, 'https://malicious.example'))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON before hitting Supabase', async () => {
    const response = await POST(createInvalidJsonRequest())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Request body must be valid JSON.' })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('validates the request body before hitting Supabase', async () => {
    const response = await POST(createRequest({ format: 'not-supported' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid input: expected "zip-json-v1"' })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated requests', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({ user: null }))

    const response = await POST(createRequest({ format: 'zip-json-v1' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('rejects guest-account exports', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        is_anonymous: true,
      },
    }))

    const response = await POST(createRequest({ format: 'zip-json-v1' }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Export is unavailable for guest sessions.' })
  })

  it('returns 429 with rate-limit headers when the quota is exhausted', async () => {
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.createAdminClient.mockReturnValue(createAdminClient({
      reserveQuotaRpcData: createQuotaPayload({
        allowed: false,
        used: 5,
        remaining: 0,
      }),
    }))

    const response = await POST(createRequest({ format: 'zip-json-v1' }))

    expect(response.status).toBe(429)
    expect(response.headers.get('x-ratelimit-limit')).toBe('5')
    expect(response.headers.get('x-ratelimit-remaining')).toBe('0')
    expect(response.headers.get('retry-after')).toBeDefined()
    await expect(response.json()).resolves.toEqual({
      error: 'Account export limit reached. You can prepare up to 5 exports per UTC hour.',
    })
  })

  it('releases the reservation and returns a clean error when the export rpc fails', async () => {
    const supabase = createSupabaseClient()
    const admin = createAdminClient({
      exportRpcError: { message: 'rpc failed' },
    })

    mocks.createClient.mockResolvedValue(supabase)
    mocks.createAdminClient.mockReturnValue(admin)

    const response = await POST(createRequest({ format: 'zip-json-v1' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Unable to prepare your export right now.' })
    expect(admin.rpc).toHaveBeenCalledWith('export_my_training_graph_v1', {
      p_user_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(admin.rpc).toHaveBeenCalledWith('release_account_export_slot', expect.objectContaining({
      p_hourly_limit: 5,
      p_user_id: '550e8400-e29b-41d4-a716-446655440000',
    }))
  })

  it('returns 413 when the serialized export exceeds the in-app ceiling', async () => {
    const oversizedPayload = createExportPayload()
    oversizedPayload.workouts = oversizedPayload.workouts.map((workout) => ({
      ...workout,
      notes: 'x'.repeat(ACCOUNT_EXPORT_SERIALIZED_MAX_BYTES),
    }))

    const admin = createAdminClient({ exportRpcData: oversizedPayload })
    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.createAdminClient.mockReturnValue(admin)

    const response = await POST(createRequest({ format: 'zip-json-v1' }))

    expect(response.status).toBe(413)
    expect(response.headers.get('x-ratelimit-limit')).toBe('5')
    await expect(response.json()).resolves.toEqual({
      code: 'export_too_large_for_in_app_download',
      error: 'This account is too large for the current in-app export flow.',
    })
    expect(admin.rpc).toHaveBeenCalledWith('commit_account_export', expect.objectContaining({
      p_hourly_limit: 5,
      p_user_id: '550e8400-e29b-41d4-a716-446655440000',
    }))
  })

  it('returns a zip archive with a manifest and server payload on success', async () => {
    const admin = createAdminClient()

    mocks.createClient.mockResolvedValue(createSupabaseClient())
    mocks.createAdminClient.mockReturnValue(admin)

    const response = await POST(createRequest({ format: 'zip-json-v1' }))
    const zipEntries = unzipSync(new Uint8Array(await response.arrayBuffer()))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/zip')
    expect(response.headers.get('content-disposition')).toContain('plateiq-export-20260512T143000Z.zip')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-ratelimit-limit')).toBe('5')
    expect(Object.keys(zipEntries).sort()).toEqual([
      'manifest.json',
      'server/account-data.json',
    ])

    const manifest = JSON.parse(strFromU8(zipEntries['manifest.json'])) as Record<string, unknown>
    const serverPayload = JSON.parse(strFromU8(zipEntries['server/account-data.json'])) as Record<string, unknown>

    expect(manifest).toEqual(expect.objectContaining({
      archiveSchemaVersion: 'plateiq-archive-v1',
      serverPayloadSchemaVersion: 'plateiq-training-graph-v1',
      ownerUserId: '550e8400-e29b-41d4-a716-446655440000',
    }))
    expect(serverPayload).toEqual(expect.objectContaining({
      schemaVersion: 'plateiq-training-graph-v1',
      ownerUserId: '550e8400-e29b-41d4-a716-446655440000',
    }))
    expect(serverPayload.training_programs).toHaveLength(1)
    expect(serverPayload.workouts).toHaveLength(1)
  })
})
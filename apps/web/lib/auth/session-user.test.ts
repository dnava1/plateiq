import { beforeEach, describe, expect, it, vi } from 'vitest'
import { probeSameOriginNetworkReachability } from './session-user'

const mocks = vi.hoisted(() => ({
  getLastPersistedQueryCacheUserId: vi.fn(),
  getLastSnapshotUserId: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@/lib/offline-workout-store', () => ({
  getLastSnapshotUserId: () => mocks.getLastSnapshotUserId(),
}))

vi.mock('@/lib/query-persistence', () => ({
  getLastPersistedQueryCacheUserId: () => mocks.getLastPersistedQueryCacheUserId(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
    },
  }),
}))

describe('probeSameOriginNetworkReachability', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns reachable when the same-origin probe responds', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    await expect(probeSameOriginNetworkReachability()).resolves.toBe('reachable')
  })

  it('returns unreachable when the same-origin probe fails immediately', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(probeSameOriginNetworkReachability()).resolves.toBe('unreachable')
  })

  it('returns unknown when the same-origin probe aborts', async () => {
    vi.mocked(fetch).mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))

    await expect(probeSameOriginNetworkReachability()).resolves.toBe('unknown')
  })
})
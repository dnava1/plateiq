import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildPersistedQueryCacheMetadata,
  clearAllPersistedQueryCaches,
  countPersistedPendingMutations,
  clearLegacyPersistedQueryCache,
  createIdbPersister,
  flushPendingMutations,
  getLastPersistedQueryCacheUserId,
  getPersistedPendingMutationCount,
  getPersistedQueryCacheKey,
  getPendingMutationCount,
  getQueryPersistenceBuster,
  isPersistedQueryCacheMetadataFresh,
  QUERY_CACHE_MAX_AGE,
  QUERY_CACHE_SCHEMA_VERSION,
  resetPersistedQueryState,
} from './query-persistence'

const delMock = vi.fn()
const delManyMock = vi.fn()
const getMock = vi.fn()
const keysMock = vi.fn()
const setMock = vi.fn()

vi.mock('idb-keyval', () => ({
  del: (...args: unknown[]) => delMock(...args),
  delMany: (...args: unknown[]) => delManyMock(...args),
  get: (...args: unknown[]) => getMock(...args),
  keys: (...args: unknown[]) => keysMock(...args),
  set: (...args: unknown[]) => setMock(...args),
}))

describe('query persistence helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delMock.mockReset()
    delManyMock.mockReset()
    getMock.mockReset()
    keysMock.mockReset()
    setMock.mockReset()
  })

  it('builds a user-scoped cache key and buster', () => {
    expect(getPersistedQueryCacheKey('user-123')).toBe('plateiq-query-cache:user-123')
    expect(getQueryPersistenceBuster('user-123')).toBe('plateiq-query-cache:v4:user-123')
  })

  it('stores and restores persisted cache data with the user-scoped key', async () => {
    const persistedClient = { timestamp: Date.now(), buster: 'b', clientState: { mutations: [], queries: [] } }
    getMock.mockResolvedValue(persistedClient)
    const persister = createIdbPersister('user-123')

    await persister.persistClient(persistedClient)
    const restored = await persister.restoreClient()
    await persister.removeClient()

    expect(setMock).toHaveBeenCalledWith('plateiq-query-cache:user-123', {
      ...persistedClient,
      metadata: expect.objectContaining({
        schemaVersion: QUERY_CACHE_SCHEMA_VERSION,
        stale: false,
        userId: 'user-123',
      }),
    })
    expect(getMock).toHaveBeenCalledWith('plateiq-query-cache:user-123')
    expect(restored).toBe(persistedClient)
    expect(delMock).toHaveBeenCalledWith('plateiq-query-cache:user-123')
  })

  it('remembers the last persisted query user for warm boots and clears it on removal', async () => {
    const persister = createIdbPersister('user-123')

    await persister.persistClient({ clientState: { mutations: [], queries: [] } })
    expect(getLastPersistedQueryCacheUserId()).toBe('user-123')

    await persister.removeClient()
    expect(getLastPersistedQueryCacheUserId()).toBeNull()
  })

  it('builds explicit cache metadata for user-scoped persisted data', () => {
    const metadata = buildPersistedQueryCacheMetadata('user-123')

    expect(metadata).toMatchObject({
      schemaVersion: QUERY_CACHE_SCHEMA_VERSION,
      stale: false,
      userId: 'user-123',
    })
    expect(Date.parse(metadata.updatedAt)).not.toBeNaN()
  })

  it('treats persisted query metadata older than the max age as not fresh', () => {
    const freshMetadata: ReturnType<typeof buildPersistedQueryCacheMetadata> = {
      schemaVersion: QUERY_CACHE_SCHEMA_VERSION,
      stale: false,
      updatedAt: '2026-05-08T12:00:00.000Z',
      userId: 'user-123',
    }
    const staleMetadata: ReturnType<typeof buildPersistedQueryCacheMetadata> = {
      ...freshMetadata,
      updatedAt: '2026-05-06T11:59:59.000Z',
    }
    const now = Date.parse('2026-05-09T11:59:59.000Z')

    expect(isPersistedQueryCacheMetadataFresh(freshMetadata, now)).toBe(true)
    expect(isPersistedQueryCacheMetadataFresh(staleMetadata, now + QUERY_CACHE_MAX_AGE)).toBe(false)
  })

  it('treats stale persisted metadata as not fresh even when the timestamp is recent', () => {
    const metadata: ReturnType<typeof buildPersistedQueryCacheMetadata> = {
      schemaVersion: QUERY_CACHE_SCHEMA_VERSION,
      stale: true,
      updatedAt: '2026-05-08T12:00:00.000Z',
      userId: 'user-123',
    }

    expect(isPersistedQueryCacheMetadataFresh(metadata, Date.parse('2026-05-08T12:05:00.000Z'))).toBe(false)
  })

  it('drops persisted cache data when metadata belongs to another user', async () => {
    getMock.mockResolvedValue({
      timestamp: Date.now(),
      buster: 'b',
      clientState: { mutations: [], queries: [] },
      metadata: {
        schemaVersion: QUERY_CACHE_SCHEMA_VERSION,
        stale: false,
        updatedAt: '2026-05-01T00:00:00.000Z',
        userId: 'user-456',
      },
    })
    const persister = createIdbPersister('user-123')

    await expect(persister.restoreClient()).resolves.toBeUndefined()

    expect(delMock).toHaveBeenCalledWith('plateiq-query-cache:user-123')
  })

  it('clears in-memory and persisted cache state on auth transitions', async () => {
    const queryClient = new QueryClient()
    const cancelQueriesSpy = vi.spyOn(queryClient, 'cancelQueries')
    const clearSpy = vi.spyOn(queryClient, 'clear')

    await resetPersistedQueryState(queryClient, 'user-123')

    expect(cancelQueriesSpy).toHaveBeenCalledTimes(1)
    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(delMock).toHaveBeenCalledWith('plateiq-query-cache:user-123')
    expect(delMock).toHaveBeenCalledWith('plateiq-query-cache')
  })

  it('can remove the legacy shared cache key directly', async () => {
    await clearLegacyPersistedQueryCache()

    expect(delMock).toHaveBeenCalledWith('plateiq-query-cache')
  })

  it('can remove every persisted query cache entry in one pass', async () => {
    keysMock.mockResolvedValue([
      'plateiq-query-cache:user-123',
      'plateiq-query-cache:user-456',
      'other-key',
    ])

    await clearAllPersistedQueryCaches()

    expect(delManyMock).toHaveBeenCalledWith([
      'plateiq-query-cache:user-123',
      'plateiq-query-cache:user-456',
    ])
  })

  it('counts pending and paused mutations before an auth transition', () => {
    const queryClient = {
      getMutationCache: () => ({
        getAll: () => [
          { state: { status: 'pending', isPaused: false } },
          { state: { status: 'success', isPaused: false } },
          { state: { status: 'idle', isPaused: true } },
        ],
      }),
    } as unknown as QueryClient

    expect(getPendingMutationCount(queryClient)).toBe(2)
  })

  it('counts persisted pending mutations from the user-scoped cache snapshot', async () => {
    getMock.mockResolvedValue({
      clientState: {
        mutations: [
          { state: { isPaused: false, status: 'pending' } },
          { state: { isPaused: true, status: 'idle' } },
          { state: { isPaused: false, status: 'success' } },
        ],
      },
      metadata: {
        schemaVersion: QUERY_CACHE_SCHEMA_VERSION,
        stale: false,
        updatedAt: '2026-05-08T18:00:00.000Z',
        userId: 'user-123',
      },
    })

    expect(countPersistedPendingMutations({
      clientState: {
        mutations: [
          { state: { isPaused: false, status: 'pending' } },
          { state: { isPaused: true, status: 'idle' } },
        ],
      },
    })).toBe(2)
    await expect(getPersistedPendingMutationCount('user-123')).resolves.toBe(2)
  })

  it('resumes paused mutations before checking whether a merge can proceed', async () => {
    const resumePausedMutations = vi.fn().mockResolvedValue(undefined)
    const queryClient = {
      resumePausedMutations,
      getMutationCache: () => ({
        getAll: () => [
          { state: { status: 'pending', isPaused: false } },
        ],
      }),
    } as unknown as QueryClient

    await expect(flushPendingMutations(queryClient)).resolves.toBe(1)
    expect(resumePausedMutations).toHaveBeenCalledTimes(1)
  })
})

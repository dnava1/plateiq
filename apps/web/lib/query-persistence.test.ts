import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllPersistedQueryCaches,
  clearLegacyPersistedQueryCache,
  createIdbPersister,
  getPersistedQueryCacheKey,
  getQueryPersistenceBuster,
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
    delMock.mockReset()
    delManyMock.mockReset()
    getMock.mockReset()
    keysMock.mockReset()
    setMock.mockReset()
  })

  it('builds a user-scoped cache key and buster', () => {
    expect(getPersistedQueryCacheKey('user-123')).toBe('plateiq-query-cache:user-123')
    expect(getQueryPersistenceBuster('user-123')).toBe('plateiq-query-cache:v2:user-123')
  })

  it('stores and restores persisted cache data with the user-scoped key', async () => {
    const persistedClient = { timestamp: Date.now(), buster: 'b', clientState: { mutations: [], queries: [] } }
    getMock.mockResolvedValue(persistedClient)
    const persister = createIdbPersister('user-123')

    await persister.persistClient(persistedClient)
    const restored = await persister.restoreClient()
    await persister.removeClient()

    expect(setMock).toHaveBeenCalledWith('plateiq-query-cache:user-123', persistedClient)
    expect(getMock).toHaveBeenCalledWith('plateiq-query-cache:user-123')
    expect(restored).toBe(persistedClient)
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
})
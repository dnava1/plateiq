import type { QueryClient } from '@tanstack/react-query'
import { del, delMany, get, keys, set } from 'idb-keyval'

const QUERY_CACHE_KEY_PREFIX = 'plateiq-query-cache'
const QUERY_CACHE_BUSTER_PREFIX = 'plateiq-query-cache:v3'
const LEGACY_QUERY_CACHE_KEY = QUERY_CACHE_KEY_PREFIX

export function getPersistedQueryCacheKey(userId: string) {
  return `${QUERY_CACHE_KEY_PREFIX}:${userId}`
}

export function getQueryPersistenceBuster(userId: string) {
  return `${QUERY_CACHE_BUSTER_PREFIX}:${userId}`
}

export function createIdbPersister(userId: string) {
  const cacheKey = getPersistedQueryCacheKey(userId)

  return {
    persistClient: async (client: unknown) => {
      await set(cacheKey, client)
    },
    restoreClient: async () => {
      return await get(cacheKey)
    },
    removeClient: async () => {
      await del(cacheKey)
    },
  }
}

export function getPendingMutationCount(queryClient: QueryClient) {
  return queryClient
    .getMutationCache()
    .getAll()
    .filter((mutation) => mutation.state.status === 'pending' || mutation.state.isPaused)
    .length
}

export async function flushPendingMutations(queryClient: QueryClient) {
  await queryClient.resumePausedMutations()
  return getPendingMutationCount(queryClient)
}

export async function clearPersistedQueryCache(userId: string) {
  await del(getPersistedQueryCacheKey(userId))
}

export async function clearLegacyPersistedQueryCache() {
  await del(LEGACY_QUERY_CACHE_KEY)
}

export async function clearAllPersistedQueryCaches() {
  const storedKeys = await keys()
  const queryCacheKeys = storedKeys
    .map((key) => String(key))
    .filter((key) => key.startsWith(QUERY_CACHE_KEY_PREFIX))

  if (queryCacheKeys.length === 0) {
    return
  }

  await delMany(queryCacheKeys)
}

export async function resetPersistedQueryState(queryClient: QueryClient, userId: string) {
  try {
    await queryClient.cancelQueries()
  } finally {
    queryClient.clear()
  }

  await Promise.all([
    clearPersistedQueryCache(userId),
    clearLegacyPersistedQueryCache(),
  ])
}
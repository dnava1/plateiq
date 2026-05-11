import type { QueryClient } from '@tanstack/react-query'
import { del, delMany, get, keys, set } from 'idb-keyval'

const QUERY_CACHE_KEY_PREFIX = 'plateiq-query-cache'
const LAST_QUERY_CACHE_USER_KEY = 'plateiq-query-cache:last-user'
export const QUERY_CACHE_SCHEMA_VERSION = 4
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24
const QUERY_CACHE_BUSTER_PREFIX = `plateiq-query-cache:v${QUERY_CACHE_SCHEMA_VERSION}`
const LEGACY_QUERY_CACHE_KEY = QUERY_CACHE_KEY_PREFIX

export interface PersistedQueryCacheMetadata {
  schemaVersion: typeof QUERY_CACHE_SCHEMA_VERSION
  stale: boolean
  updatedAt: string
  userId: string
}

interface PersistedQueryClientRecord {
  clientState?: {
    mutations?: Array<{
      state?: {
        isPaused?: boolean
        status?: string
      }
    }>
  }
  metadata?: PersistedQueryCacheMetadata
}

export function getPersistedQueryCacheKey(userId: string) {
  return `${QUERY_CACHE_KEY_PREFIX}:${userId}`
}

export function getQueryPersistenceBuster(userId: string) {
  return `${QUERY_CACHE_BUSTER_PREFIX}:${userId}`
}

export function buildPersistedQueryCacheMetadata(userId: string): PersistedQueryCacheMetadata {
  return {
    schemaVersion: QUERY_CACHE_SCHEMA_VERSION,
    stale: false,
    updatedAt: new Date().toISOString(),
    userId,
  }
}

export function isPersistedQueryCacheMetadataFresh(
  metadata: PersistedQueryCacheMetadata | null | undefined,
  now = Date.now(),
) {
  if (!metadata || metadata.stale) {
    return false
  }

  const updatedAt = Date.parse(metadata.updatedAt)

  if (Number.isNaN(updatedAt)) {
    return false
  }

  return now - updatedAt <= QUERY_CACHE_MAX_AGE
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasValidQueryCacheMetadata(value: unknown, userId: string) {
  if (!isObject(value) || !isObject(value.metadata)) {
    return true
  }

  return value.metadata.userId === userId
    && value.metadata.schemaVersion === QUERY_CACHE_SCHEMA_VERSION
}

function rememberLastPersistedQueryCacheUserId(userId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAST_QUERY_CACHE_USER_KEY, userId)
}

export function getLastPersistedQueryCacheUserId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(LAST_QUERY_CACHE_USER_KEY)
}

export function clearLastPersistedQueryCacheUserId(userId?: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  const currentUserId = getLastPersistedQueryCacheUserId()

  if (!userId || currentUserId === userId) {
    window.localStorage.removeItem(LAST_QUERY_CACHE_USER_KEY)
  }
}

function getPersistedQueryClientRecord(value: unknown, userId: string): PersistedQueryClientRecord | null {
  if (!isObject(value) || !hasValidQueryCacheMetadata(value, userId)) {
    return null
  }

  return value as PersistedQueryClientRecord
}

export async function getPersistedQueryCacheMetadata(userId: string) {
  const cachedClient = await get(getPersistedQueryCacheKey(userId))
  const persistedRecord = getPersistedQueryClientRecord(cachedClient, userId)

  if (!persistedRecord?.metadata) {
    return null
  }

  return persistedRecord.metadata
}

export function countPersistedPendingMutations(client: unknown) {
  const persistedRecord = client as PersistedQueryClientRecord | null
  const mutations = persistedRecord?.clientState?.mutations

  if (!Array.isArray(mutations)) {
    return 0
  }

  return mutations.filter((mutation) => {
    const mutationState = mutation?.state

    return mutationState?.status === 'pending' || mutationState?.isPaused === true
  }).length
}

export async function getPersistedPendingMutationCount(userId: string) {
  const cachedClient = await get(getPersistedQueryCacheKey(userId))
  const persistedRecord = getPersistedQueryClientRecord(cachedClient, userId)

  if (!persistedRecord) {
    return 0
  }

  return countPersistedPendingMutations(persistedRecord)
}

export function createIdbPersister(userId: string) {
  const cacheKey = getPersistedQueryCacheKey(userId)

  return {
    persistClient: async (client: unknown) => {
      rememberLastPersistedQueryCacheUserId(userId)
      await set(cacheKey, isObject(client)
        ? {
          ...client,
          metadata: buildPersistedQueryCacheMetadata(userId),
        }
        : client)
    },
    restoreClient: async () => {
      const cachedClient = await get(cacheKey)

      if (!hasValidQueryCacheMetadata(cachedClient, userId)) {
        await del(cacheKey)
        clearLastPersistedQueryCacheUserId(userId)
        return undefined
      }

       if (cachedClient) {
        rememberLastPersistedQueryCacheUserId(userId)
      }

      return cachedClient
    },
    removeClient: async () => {
      await del(cacheKey)
      clearLastPersistedQueryCacheUserId(userId)
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
  clearLastPersistedQueryCacheUserId(userId)
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
    clearLastPersistedQueryCacheUserId()
    return
  }

  await delMany(queryCacheKeys)
  clearLastPersistedQueryCacheUserId()
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

import { getLastSnapshotUserId } from '@/lib/offline-workout-store'
import { getLastPersistedQueryCacheUserId } from '@/lib/query-persistence'
import { createClient } from '@/lib/supabase/client'

const SESSION_LOOKUP_TIMEOUT_MS = 1200
const NETWORK_PROBE_TIMEOUT_MS = 1500
const NETWORK_REACHABILITY_PROBE_PATH = '/api/network/reachability'

export type NetworkReachability = 'reachable' | 'unreachable' | 'unknown'

export function getStoredAuthScopeHint() {
  return getLastPersistedQueryCacheUserId() ?? getLastSnapshotUserId()
}

export async function getSessionUserIdWithTimeout(timeoutMs = SESSION_LOOKUP_TIMEOUT_MS) {
  if (typeof window === 'undefined') {
    return null
  }

  return new Promise<string | null>((resolve) => {
    let isSettled = false

    const resolveOnce = (userId: string | null) => {
      if (isSettled) {
        return
      }

      isSettled = true
      window.clearTimeout(timeoutId)
      resolve(userId)
    }

    const timeoutId = window.setTimeout(() => resolveOnce(null), timeoutMs)

    try {
      const supabase = createClient()

      void supabase.auth.getSession()
        .then(({ data }) => resolveOnce(data.session?.user.id ?? null))
        .catch(() => resolveOnce(null))
    } catch {
      resolveOnce(null)
    }
  })
}

export async function probeSameOriginNetworkReachability(timeoutMs = NETWORK_PROBE_TIMEOUT_MS) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return 'unknown' satisfies NetworkReachability
  }

  const abortController = new AbortController()
  const timeoutId = window.setTimeout(() => abortController.abort(), timeoutMs)

  try {
    await fetch(NETWORK_REACHABILITY_PROBE_PATH, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'cache-control': 'no-store',
      },
      method: 'HEAD',
      signal: abortController.signal,
    })

    return 'reachable' satisfies NetworkReachability
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'unknown' satisfies NetworkReachability
    }

    return 'unreachable' satisfies NetworkReachability
  } finally {
    window.clearTimeout(timeoutId)
  }
}
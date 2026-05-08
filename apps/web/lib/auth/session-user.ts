import { getLastSnapshotUserId } from '@/lib/offline-workout-store'
import { getLastPersistedQueryCacheUserId } from '@/lib/query-persistence'
import { createClient } from '@/lib/supabase/client'

const SESSION_LOOKUP_TIMEOUT_MS = 1200

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
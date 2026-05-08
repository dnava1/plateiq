'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppShellClientState } from '@/components/layout/AppShellClientState'
import { getInactiveNavPrefetchHrefs } from '@/components/layout/navigation'

const FIRST_ROUTE_PREFETCH_DELAY_MS = 60
const ROUTE_PREFETCH_GAP_MS = 110

export function AppRoutePrefetcher() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthReady, isWarmDataReady } = useAppShellClientState()

  useEffect(() => {
    if (!isAuthReady || !isWarmDataReady) {
      return
    }

    const timeoutIds: number[] = []
    getInactiveNavPrefetchHrefs(pathname)
      .forEach((href, index) => {
        const timeoutId = window.setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            return
          }

          router.prefetch(href)
        }, FIRST_ROUTE_PREFETCH_DELAY_MS + (index * ROUTE_PREFETCH_GAP_MS))

        timeoutIds.push(timeoutId)
      })

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [isAuthReady, isWarmDataReady, pathname, router])

  return null
}

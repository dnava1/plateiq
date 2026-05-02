'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { APP_NAV_ITEMS, isActiveNavPath } from '@/components/layout/navigation'

const FALLBACK_DELAY_MS = 900
const IDLE_TIMEOUT_MS = 2_500
const ROUTE_PREFETCH_GAP_MS = 450

type IdleCapableWindow = Window & typeof globalThis & {
  cancelIdleCallback?: (handle: number) => void
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
}

function scheduleAfterIdle(callback: () => void) {
  const browserWindow = window as IdleCapableWindow

  if (
    typeof browserWindow.requestIdleCallback === 'function'
    && typeof browserWindow.cancelIdleCallback === 'function'
  ) {
    const idleCallbackId = browserWindow.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS })

    return () => browserWindow.cancelIdleCallback?.(idleCallbackId)
  }

  const timeoutId = browserWindow.setTimeout(callback, FALLBACK_DELAY_MS)

  return () => browserWindow.clearTimeout(timeoutId)
}

export function AppRoutePrefetcher() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const timeoutIds: number[] = []
    let isCancelled = false

    const cancelIdle = scheduleAfterIdle(() => {
      APP_NAV_ITEMS
        .map((item) => item.href)
        .filter((href) => !isActiveNavPath(pathname, href))
        .forEach((href, index) => {
          const timeoutId = window.setTimeout(() => {
            if (isCancelled || document.visibilityState === 'hidden') {
              return
            }

            router.prefetch(href)
          }, index * ROUTE_PREFETCH_GAP_MS)

          timeoutIds.push(timeoutId)
        })
    })

    return () => {
      isCancelled = true
      cancelIdle()
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [pathname, router])

  return null
}

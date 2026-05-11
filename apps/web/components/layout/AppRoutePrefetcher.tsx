'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAppShellClientState } from '@/components/layout/AppShellClientState'
import { getBackgroundPrefetchHrefs } from '@/components/layout/navigation'

const FIRST_ROUTE_PREFETCH_DELAY_MS = 60
const ROUTE_PREFETCH_GAP_MS = 110
const STANDALONE_FIRST_ROUTE_PREFETCH_DELAY_MS = 1200
const STANDALONE_ROUTE_PREFETCH_GAP_MS = 250

function isStandaloneMode() {
  const displayModeStandalone = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false

  return displayModeStandalone
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function AppRoutePrefetcher() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthReady, isWarmDataReady } = useAppShellClientState()

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-app-scroll-region="true"]')
        ?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [pathname])

  useEffect(() => {
    if (!isAuthReady || !isWarmDataReady) {
      return
    }

    const standaloneMode = isStandaloneMode()
    const firstRoutePrefetchDelay = standaloneMode
      ? STANDALONE_FIRST_ROUTE_PREFETCH_DELAY_MS
      : FIRST_ROUTE_PREFETCH_DELAY_MS
    const routePrefetchGap = standaloneMode
      ? STANDALONE_ROUTE_PREFETCH_GAP_MS
      : ROUTE_PREFETCH_GAP_MS
    const timeoutIds: number[] = []
    getBackgroundPrefetchHrefs(pathname)
      .forEach((href, index) => {
        const timeoutId = window.setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            return
          }

          router.prefetch(href)
        }, firstRoutePrefetchDelay + (index * routePrefetchGap))

        timeoutIds.push(timeoutId)
      })

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [isAuthReady, isWarmDataReady, pathname, router])

  return null
}

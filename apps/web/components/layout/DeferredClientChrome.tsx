'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const PwaSupport = dynamic(
  () => import('@/components/pwa/PwaSupport').then((mod) => mod.PwaSupport),
  { ssr: false },
)

const Toaster = dynamic(
  () => import('@/components/ui/sonner').then((mod) => mod.Toaster),
  { ssr: false },
)

const FALLBACK_DELAY_MS = 800
const IDLE_TIMEOUT_MS = 2_000

type IdleCapableWindow = Window & typeof globalThis & {
  cancelIdleCallback?: (handle: number) => void
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
}

function scheduleAfterCriticalPaint(callback: () => void) {
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

export function DeferredClientChrome() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    return scheduleAfterCriticalPaint(() => setIsReady(true))
  }, [])

  if (!isReady) {
    return null
  }

  return (
    <>
      <PwaSupport />
      <Toaster />
    </>
  )
}

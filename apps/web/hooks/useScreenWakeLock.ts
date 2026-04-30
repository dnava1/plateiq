'use client'

import { useEffect, useState } from 'react'

type WakeLockType = 'screen'

interface WakeLockSentinelLike extends EventTarget {
  released: boolean
  release: () => Promise<void>
  type: WakeLockType
}

export type ScreenWakeLockStatus = 'unsupported' | 'inactive' | 'requesting' | 'active' | 'error'

export function useScreenWakeLock(enabled: boolean) {
  const [status, setStatus] = useState<ScreenWakeLockStatus>('inactive')
  const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  useEffect(() => {
    const wakeLock = 'wakeLock' in navigator
      ? navigator.wakeLock as { request: (type: WakeLockType) => Promise<WakeLockSentinelLike> }
      : undefined

    if (!enabled || !wakeLock) {
      return
    }

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const release = () => {
      const currentSentinel = sentinel
      sentinel = null

      if (!currentSentinel || currentSentinel.released) {
        return
      }

      void currentSentinel.release().catch(() => undefined)
    }

    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') {
        return
      }

      try {
        sentinel = await wakeLock.request('screen')

        if (cancelled) {
          release()
          return
        }

        sentinel.addEventListener('release', () => {
          if (!cancelled) {
            setStatus('inactive')
          }
        })
        setStatus('active')
      } catch {
        if (!cancelled) {
          setStatus('error')
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !sentinel) {
        void request()
      }
    }

    void request()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      release()
    }
  }, [enabled])

  if (!enabled) {
    return 'inactive'
  }

  return wakeLockSupported ? status : 'unsupported'
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CloudOff, Loader2 } from 'lucide-react'
import { sanitizeNextPath } from '@/lib/auth/auth-state'
import {
  getSessionUserIdWithTimeout,
  getStoredAuthScopeHint,
  probeSameOriginNetworkReachability,
} from '@/lib/auth/session-user'
import { PlateIqMark } from '@/components/brand/PlateIqMark'
import { OfflineAuthenticatedShell } from '@/components/pwa/OfflineAuthenticatedShell'
import { getActiveWorkoutSnapshot, getOfflineWorkoutPack } from '@/lib/offline-workout-store'
import { getPersistedQueryCacheMetadata, isPersistedQueryCacheMetadataFresh } from '@/lib/query-persistence'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppShellClientState } from '@/components/layout/AppShellClientState'

interface LaunchShellState {
  detail: string | null
  status: 'launching' | 'offline-unavailable'
  title: string
}

interface PendingLaunchNavigation {
  nextPath: string
  requestId: number
}

interface LaunchSearchParamsLike {
  get(name: string): string | null
}

function getRequestedLaunchPath(searchParams: LaunchSearchParamsLike) {
  const requestedNextPath = searchParams.get('next')

  if (requestedNextPath) {
    return sanitizeNextPath(requestedNextPath, '/dashboard')
  }

  if (typeof window !== 'undefined' && window.location.pathname !== '/launch') {
    return sanitizeNextPath(`${window.location.pathname}${window.location.search}`, '/dashboard')
  }

  return '/dashboard'
}

function normalizeOfflineLaunchUrl(requestedPath: string) {
  if (typeof window === 'undefined') {
    return
  }

  const launchUrl = new URL('/launch', window.location.origin)
  launchUrl.searchParams.set('next', sanitizeNextPath(requestedPath, '/dashboard'))
  const normalizedLocation = `${launchUrl.pathname}${launchUrl.search}`
  const currentLocation = `${window.location.pathname}${window.location.search}`

  if (normalizedLocation !== currentLocation) {
    window.history.replaceState(window.history.state, '', normalizedLocation)
  }
}

export function PwaLaunchShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isWarmDataReady } = useAppShellClientState()
  const [state, setState] = useState<LaunchShellState>({
    detail: null,
    status: 'launching',
    title: 'PlateIQ',
  })
  const [offlineShellPath, setOfflineShellPath] = useState<string | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<PendingLaunchNavigation | null>(null)
  const launchRequestIdRef = useRef(0)

  useEffect(() => {
    return () => {
      if (!document.documentElement.hasAttribute('data-pwa-boot')) {
        document.documentElement.removeAttribute('data-pwa-launch-slow')
      }
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const requestedPath = getRequestedLaunchPath(searchParams)
    const requestId = ++launchRequestIdRef.current
    setOfflineShellPath(null)

    void (async () => {
      const localScopeHint = getStoredAuthScopeHint()
      const [sessionUserId, networkReachability] = await Promise.all([
        getSessionUserIdWithTimeout(),
        probeSameOriginNetworkReachability(),
      ])
      const isNetworkReachable = networkReachability === 'reachable'
      const isNetworkUnreachable = networkReachability === 'unreachable'
      const hasConfirmedOnlineAuth = Boolean(sessionUserId && isNetworkReachable)
      const resolvedUserId = sessionUserId ?? (isNetworkUnreachable ? localScopeHint : null)

      if (!isActive) {
        return
      }

      if (!resolvedUserId) {
        if (isNetworkReachable) {
          setOfflineShellPath(null)
          setPendingNavigation({
            nextPath: '/continue',
            requestId,
          })
          return
        }

        setPendingNavigation(null)
        setState({
          detail: 'Open PlateIQ online once so this device can prepare your cached shell and offline data.',
          status: 'offline-unavailable',
          title: 'Offline access is not ready yet',
        })
        return
      }

      if (hasConfirmedOnlineAuth) {
        setOfflineShellPath(null)
        setState({
          detail: null,
          status: 'launching',
          title: 'PlateIQ',
        })

        setPendingNavigation({
          nextPath: requestedPath,
          requestId,
        })
        return
      }

      const [cacheMetadata, activeWorkout, offlineWorkoutPack] = await Promise.all([
        getPersistedQueryCacheMetadata(resolvedUserId),
        getActiveWorkoutSnapshot(resolvedUserId),
        getOfflineWorkoutPack(resolvedUserId),
      ])

      if (!isActive) {
        return
      }
      const hasFreshWarmSnapshot = isPersistedQueryCacheMetadataFresh(cacheMetadata)
      const hasOfflineWorkoutState = Boolean(activeWorkout || offlineWorkoutPack)

      if (!isNetworkReachable && !hasFreshWarmSnapshot && !hasOfflineWorkoutState) {
        setPendingNavigation(null)
        setState({
          detail: 'Open PlateIQ online once so this device can refresh your cached shell, or save a workout pack before going offline.',
          status: 'offline-unavailable',
          title: 'Offline access is not ready yet',
        })
        return
      }

      if (!isNetworkReachable && hasOfflineWorkoutState && (!hasFreshWarmSnapshot || requestedPath === '/workouts')) {
        setOfflineShellPath(null)
        setState({
          detail: null,
          status: 'launching',
          title: 'PlateIQ',
        })

        setPendingNavigation({
          nextPath: '/gym',
          requestId,
        })
        return
      }

      if (!isNetworkReachable && hasFreshWarmSnapshot) {
        normalizeOfflineLaunchUrl(requestedPath)
        setPendingNavigation(null)
        setState({
          detail: null,
          status: 'launching',
          title: 'PlateIQ',
        })
        setOfflineShellPath(requestedPath)
        return
      }

      setOfflineShellPath(null)
      setState({
        detail: null,
        status: 'launching',
        title: 'PlateIQ',
      })

      setPendingNavigation({
        nextPath: requestedPath,
        requestId,
      })
    })().catch(() => {
      if (!isActive) {
        return
      }

      if (launchRequestIdRef.current === requestId) {
        setOfflineShellPath(null)
        setPendingNavigation(null)
      }

      setState({
        detail: 'Return online to re-establish the authenticated shell.',
        status: 'offline-unavailable',
        title: 'Unable to restore the cached shell',
      })
    })

    return () => {
      isActive = false
    }
  }, [searchParams])

  useEffect(() => {
    if (!pendingNavigation || pendingNavigation.requestId !== launchRequestIdRef.current || !isWarmDataReady) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (pendingNavigation.requestId === launchRequestIdRef.current) {
        router.replace(pendingNavigation.nextPath)
      }
    }, 40)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isWarmDataReady, pendingNavigation, router])

  if (offlineShellPath && isWarmDataReady) {
    return <OfflineAuthenticatedShell initialPath={offlineShellPath} />
  }

  return (
    <div className="pwa-launch-shell" data-status={state.status}>
      <Card className="pwa-launch-card surface-panel w-full max-w-xl py-0" role="status" aria-live="polite">
        <CardHeader className="pwa-launch-card-header w-full items-center justify-items-center gap-5 px-6 py-8 text-center sm:px-8 sm:py-10">
          <div className="relative mx-auto grid size-28 place-items-center rounded-[36px] border border-border/70 bg-background/80 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.45)] dark:shadow-[0_28px_80px_-40px_rgba(0,0,0,0.85)]">
            <div className="absolute inset-3 rounded-[28px] bg-primary/8 blur-2xl dark:bg-primary/12" />
            <div className="absolute inset-4 rounded-[28px] border border-white/65 bg-linear-to-b from-white/85 via-white/45 to-white/10 dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-transparent" />
            <PlateIqMark className="relative size-20" preload />
          </div>
          <div className="flex flex-col items-center gap-2">
            <CardTitle className="mx-auto text-center text-3xl tracking-tight sm:text-[2.15rem]">{state.title}</CardTitle>
            <div className="pwa-launch-spinner-slot">
              <Loader2 className="pwa-launch-spinner" aria-hidden="true" />
              {state.status === 'launching' ? <span className="sr-only">Launching PlateIQ</span> : null}
            </div>
          </div>
          {state.status === 'offline-unavailable' && state.detail ? (
            <CardDescription className="mx-auto flex max-w-md items-start gap-2 rounded-full border border-border/70 bg-muted/45 px-4 py-2 text-sm text-muted-foreground">
              <CloudOff className="mt-0.5 size-4 shrink-0 text-foreground" />
              <span>{state.detail}</span>
            </CardDescription>
          ) : null}
        </CardHeader>
      </Card>
    </div>
  )
}

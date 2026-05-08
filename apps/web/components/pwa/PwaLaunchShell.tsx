'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CloudOff, LoaderCircle } from 'lucide-react'
import { sanitizeNextPath } from '@/lib/auth/auth-state'
import { getSessionUserIdWithTimeout, getStoredAuthScopeHint } from '@/lib/auth/session-user'
import { getActiveWorkoutSnapshot, getOfflineWorkoutPack } from '@/lib/offline-workout-store'
import { getPersistedQueryCacheMetadata, isPersistedQueryCacheMetadataFresh } from '@/lib/query-persistence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LaunchShellState {
  detail: string | null
  status: 'launching' | 'offline-unavailable'
  title: string
}

interface PendingLaunchNavigation {
  nextPath: string
  requestId: number
}

function formatCachedSnapshotTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function PwaLaunchShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<LaunchShellState>({
    detail: null,
    status: 'launching',
    title: 'Preparing PlateIQ',
  })
  const [pendingNavigation, setPendingNavigation] = useState<PendingLaunchNavigation | null>(null)
  const launchRequestIdRef = useRef(0)

  useEffect(() => {
    let isActive = true
    const requestedPath = sanitizeNextPath(searchParams.get('next'), '/dashboard')
    const requestId = ++launchRequestIdRef.current

    void (async () => {
      const isOfflineLaunch = !navigator.onLine
      const offlineScopeHint = isOfflineLaunch ? getStoredAuthScopeHint() : null
      const sessionUserId = offlineScopeHint ? null : await getSessionUserIdWithTimeout()
      const resolvedUserId = sessionUserId ?? offlineScopeHint

      if (!isActive) {
        return
      }

      if (!resolvedUserId) {
        if (navigator.onLine) {
          setPendingNavigation({
            nextPath: '/continue',
            requestId,
          })
          return
        }

        setState({
          detail: 'Open PlateIQ online once so this device can prepare your cached shell and offline data.',
          status: 'offline-unavailable',
          title: 'Offline access is not ready yet',
        })
        return
      }

      if (!isOfflineLaunch && sessionUserId) {
        setState({
          detail: 'Restoring your saved data in the background.',
          status: 'launching',
          title: 'Opening PlateIQ',
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

      const formattedSnapshotTime = formatCachedSnapshotTime(cacheMetadata?.updatedAt)
      const hasFreshWarmSnapshot = isPersistedQueryCacheMetadataFresh(cacheMetadata)
      const hasOfflineWorkoutState = Boolean(activeWorkout || offlineWorkoutPack)

      if (isOfflineLaunch && !hasFreshWarmSnapshot && !hasOfflineWorkoutState) {
        setState({
          detail: 'Open PlateIQ online once so this device can refresh your cached shell, or save a workout pack before going offline.',
          status: 'offline-unavailable',
          title: 'Offline access is not ready yet',
        })
        return
      }

      const nextPath = isOfflineLaunch && hasOfflineWorkoutState && (!hasFreshWarmSnapshot || requestedPath === '/workouts')
        ? '/gym'
        : requestedPath

      setState({
        detail: formattedSnapshotTime
          ? `${cacheMetadata?.stale || !hasFreshWarmSnapshot ? 'Cached snapshot' : 'Warm snapshot'} updated ${formattedSnapshotTime}.`
          : hasOfflineWorkoutState
            ? 'Offline workout state is available on this device.'
            : 'Opening your cached application shell.',
        status: 'launching',
        title: isOfflineLaunch && hasOfflineWorkoutState && !hasFreshWarmSnapshot
          ? 'Opening workout offline mode'
          : isOfflineLaunch
            ? 'Opening your cached shell'
            : 'Opening PlateIQ',
      })

      setPendingNavigation({
        nextPath,
        requestId,
      })
    })().catch(() => {
      if (!isActive) {
        return
      }

      if (launchRequestIdRef.current === requestId) {
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
    if (!pendingNavigation || pendingNavigation.requestId !== launchRequestIdRef.current) {
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
  }, [pendingNavigation, router])

  return (
    <div className="page-shell flex min-h-[calc(100dvh-7rem)] max-w-3xl items-center justify-center py-8 sm:py-12">
      <Card className="surface-panel w-full max-w-xl" role="status" aria-live="polite">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              {state.status === 'launching'
                ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
                : <CloudOff className="size-5" />}
            </div>
            <div className="flex flex-col gap-1">
              <span className="eyebrow">PlateIQ</span>
              <CardTitle className="text-xl">{state.title}</CardTitle>
            </div>
          </div>
          <CardDescription>
            {state.detail ?? 'Loading your app shell and cached workout data.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4" />
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4" />
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Activity, CloudOff, Dumbbell, Play, RefreshCw } from 'lucide-react'
import { useOfflineWorkoutSync } from '@/hooks/useOfflineWorkoutSync'
import { createClient } from '@/lib/supabase/client'
import {
  createOfflineWorkoutSnapshotFromPackWorkout,
  getActiveWorkoutSnapshot,
  getLastSnapshotUserId,
  getOfflineWorkoutPack,
  saveActiveWorkoutSnapshot,
  type OfflineWorkoutOutboxEntry,
  type OfflineWorkoutPack,
  type OfflineWorkoutPackWorkout,
  type OfflineWorkoutSnapshot,
} from '@/lib/offline-workout-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CompleteWorkoutButton } from './CompleteWorkoutButton'
import { SetRow } from './SetRow'
import {
  buildWorkoutExecutionSnapshot,
  formatDurationClock,
  getRecommendedRestSeconds,
  hasRemainingPendingWork,
  shouldAutoStartRestTimer,
  type WorkoutDisplaySet,
} from './types'

const SESSION_LOOKUP_TIMEOUT_MS = 1200

async function getSessionUserIdWithTimeout() {
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

    const timeoutId = window.setTimeout(() => resolveOnce(null), SESSION_LOOKUP_TIMEOUT_MS)

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

function formatSnapshotTime(value: string | null | undefined) {
  if (!value) {
    return 'Not synced yet'
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function updateSnapshotSet(
  set: WorkoutDisplaySet,
  update: {
    actualRpe: number | null
    repsActual: number
    setOrder: number
    weightLbs: number
  },
) {
  if (set.set_order !== update.setOrder) {
    return set
  }

  return {
    ...set,
    loggedAt: new Date().toISOString(),
    repsActual: update.repsActual,
    rpe: update.actualRpe,
    weight_lbs: update.weightLbs,
  } satisfies WorkoutDisplaySet
}

export function OfflineGymResumePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [pack, setPack] = useState<OfflineWorkoutPack | null>(null)
  const [snapshot, setSnapshot] = useState<OfflineWorkoutSnapshot | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now())
  const offlineSync = useOfflineWorkoutSync(userId)

  useEffect(() => {
    let isActive = true

    const loadSnapshot = async () => {
      const offlineUserId = navigator.onLine ? null : getLastSnapshotUserId()
      const sessionUserId = offlineUserId ? null : await getSessionUserIdWithTimeout()
      const resolvedUserId = sessionUserId ?? offlineUserId

      if (!isActive) {
        return
      }

      setUserId(resolvedUserId)

      if (!resolvedUserId) {
        setIsLoading(false)
        return
      }

      const [storedSnapshot, storedPack] = await Promise.all([
        getActiveWorkoutSnapshot(resolvedUserId),
        getOfflineWorkoutPack(resolvedUserId),
      ])

      if (!isActive) {
        return
      }

      setSnapshot(storedSnapshot)
      setPack(storedPack)
      setIsLoading(false)
    }

    void loadSnapshot().catch(() => {
      if (isActive) {
        setIsLoading(false)
      }
    })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    const initialStatusId = window.setTimeout(() => {
      setIsOnline(navigator.onLine)
    }, 0)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.clearTimeout(initialStatusId)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimerNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (isLoading || !isOnline || snapshot || pack || !navigator.onLine) {
      return
    }

    router.replace('/dashboard')
  }, [isLoading, isOnline, pack, router, snapshot])

  const execution = useMemo(
    () => buildWorkoutExecutionSnapshot(snapshot?.sets ?? []),
    [snapshot?.sets],
  )
  const pendingCount = Math.max(offlineSync.entries.length, snapshot?.pendingMutationCount ?? 0)
  const nextSet = execution.nextSet
  const restTimer = snapshot?.restTimer ?? null
  const isRestTimerForSnapshot = Boolean(
    restTimer?.workoutId === snapshot?.workoutId && restTimer?.endsAt !== null,
  )
  const remainingRestSeconds = isRestTimerForSnapshot && restTimer?.endsAt
    ? Math.max(0, Math.ceil((restTimer.endsAt - timerNowMs) / 1000))
    : null
  const isWorkoutFullyLogged = Boolean(snapshot && snapshot.sets.length > 0 && execution.completedSets === execution.totalSets)
  const pageTitle = snapshot ? 'Resume workout' : pack ? 'Saved workout pack' : 'Gym Mode'
  const pageCopy = (() => {
    if (isLoading) {
      return 'Checking this device for saved workout data.'
    }

    if (pendingCount > 0) {
      return `${isOnline ? 'Connected' : 'Offline'} - ${pendingCount} pending ${pendingCount === 1 ? 'change' : 'changes'}`
    }

    if (snapshot) {
      return `${isOnline ? 'Connected' : 'Offline'} - no pending changes`
    }

    if (pack) {
      return isOnline
        ? 'Connected - choose a saved workout to resume.'
        : 'Offline - choose a saved workout from this device.'
    }

    return isOnline
      ? 'Opening your dashboard.'
      : 'No offline workout is available on this device yet.'
  })()

  const persistSnapshot = (nextSnapshot: OfflineWorkoutSnapshot) => {
    setSnapshot(nextSnapshot)
    void saveActiveWorkoutSnapshot(nextSnapshot).catch(() => undefined)
  }

  const refreshOutbox = () => {
    offlineSync.refresh()
  }

  const resumePackedWorkout = (workout: OfflineWorkoutPackWorkout) => {
    if (!pack) {
      return
    }

    const nextSnapshot = createOfflineWorkoutSnapshotFromPackWorkout(pack, workout)

    if (!nextSnapshot) {
      return
    }

    persistSnapshot(nextSnapshot)
  }

  const markSnapshotCompletionQueued = () => {
    if (!snapshot) {
      return
    }

    persistSnapshot({
      ...snapshot,
      pendingCompletionWorkoutId: snapshot.workoutId,
      savedAt: new Date().toISOString(),
    })
  }

  const outboxEntryBySetOrder = useMemo(() => {
    const entries = new Map<number, OfflineWorkoutOutboxEntry>()

    for (const entry of offlineSync.entries) {
      if (entry.kind === 'set-log' && entry.workoutId === snapshot?.workoutId && entry.setOrder !== null) {
        entries.set(entry.setOrder, entry)
      }
    }

    return entries
  }, [offlineSync.entries, snapshot?.workoutId])

  const getEffectiveSetSyncState = (setOrder: number) => {
    const outboxEntry = outboxEntryBySetOrder.get(setOrder)

    if (outboxEntry?.status === 'failed') {
      return 'error' as const
    }

    if (outboxEntry?.status === 'queued') {
      return 'queued' as const
    }

    if (outboxEntry?.status === 'syncing') {
      return 'dirty' as const
    }

    return snapshot?.syncStates[setOrder]?.status
  }

  const updateSetSyncState = (setOrder: number, status: 'dirty' | 'queued' | 'synced' | 'error') => {
    if (!snapshot) {
      return
    }

    persistSnapshot({
      ...snapshot,
      savedAt: new Date().toISOString(),
      syncStates: {
        ...snapshot.syncStates,
        [setOrder]: { status },
      },
    })
    refreshOutbox()
  }

  const handleLocalSetLogged = (update: {
    actualRpe: number | null
    repsActual: number
    setOrder: number
    weightLbs: number
  }) => {
    if (!snapshot) {
      return
    }

    const now = new Date().toISOString()
    const loggedSet = snapshot.sets.find((set) => set.set_order === update.setOrder)
    const recommendedRestSeconds = loggedSet ? getRecommendedRestSeconds(loggedSet) : null
    const shouldStartRestTimer = Boolean(loggedSet
      && recommendedRestSeconds
      && shouldAutoStartRestTimer(execution, update.setOrder)
      && hasRemainingPendingWork(execution, update.setOrder))

    persistSnapshot({
      ...snapshot,
      restTimer: shouldStartRestTimer
        ? {
          durationSeconds: recommendedRestSeconds ?? 0,
          endsAt: Date.now() + (recommendedRestSeconds ?? 0) * 1000,
          label: loggedSet?.exerciseName ?? snapshot.dayLabel,
          sourceSetOrder: update.setOrder,
          workoutId: snapshot.workoutId,
        }
        : snapshot.restTimer,
      savedAt: now,
      sets: snapshot.sets.map((set) => updateSnapshotSet(set, update)),
      syncStates: {
        ...snapshot.syncStates,
        [update.setOrder]: { status: isOnline ? 'dirty' : 'queued' },
      },
    })

    window.setTimeout(refreshOutbox, 0)
  }

  return (
    <main className="min-h-dvh px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] md:px-6 md:pb-10 md:pt-8">
      <div className="page-shell max-w-5xl">
        <section className="page-header">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Offline Gym Mode</span>
            <div className="flex flex-col gap-2">
              <h1 className="page-title">{pageTitle}</h1>
              <p className="page-copy">{pageCopy}</p>
            </div>
          </div>
        </section>

        {isLoading ? (
          <Card className="surface-panel">
          <CardContent className="flex flex-col gap-4 pt-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-48 w-full rounded-[24px]" />
          </CardContent>
          </Card>
        ) : !userId ? (
          <Card className="surface-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CloudOff className="size-5" />
              Sign in required
            </CardTitle>
            <CardDescription>Open PlateIQ online once before using the offline gym surface.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/continue?next=/gym" className={buttonVariants({ variant: 'default' })}>
              Open sign-in
            </Link>
          </CardContent>
          </Card>
        ) : !snapshot && pack ? (
          <Card className="surface-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="size-5" />
              Saved workout pack
            </CardTitle>
            <CardDescription>
              {pack.program.name} - saved {formatSnapshotTime(pack.savedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {pack.workouts.map((workout) => {
              const loggedSetCount = workout.sets.filter((set) => set.repsActual !== null).length
              const canResume = Boolean(workout.workoutId && !workout.completedAt)

              return (
                <div
                  key={`${workout.weekNumber}:${workout.dayIndex}:${workout.dayLabel}`}
                  className="flex flex-col gap-3 rounded-[20px] border border-border/70 bg-background/55 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{workout.dayLabel}</p>
                      <Badge variant="outline">Week {workout.weekNumber}</Badge>
                      {workout.completedAt ? <Badge>Completed</Badge> : workout.workoutId ? <Badge variant="outline">Saved</Badge> : <Badge variant="secondary">Needs online start</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {loggedSetCount}/{workout.sets.length} sets logged
                    </p>
                  </div>
                  {canResume ? (
                    <Button type="button" size="sm" onClick={() => resumePackedWorkout(workout)}>
                      <Play data-icon="inline-start" />
                      Resume
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
          </Card>
        ) : !snapshot ? (
          <Card className="surface-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="size-5" />
              No workout saved
            </CardTitle>
            <CardDescription>Start or resume a workout online once so PlateIQ can save an offline snapshot.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/workouts" className={buttonVariants({ variant: 'default' })}>
              Open workouts
            </Link>
          </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
          <Card className="surface-panel">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{snapshot.dayLabel}</CardTitle>
                    <Badge>Week {snapshot.activeWeekNumber}</Badge>
                    {snapshot.cycleNumber ? <Badge variant="outline">Cycle {snapshot.cycleNumber}</Badge> : null}
                    {snapshot.pendingCompletionWorkoutId === snapshot.workoutId ? <Badge variant="secondary">Completion queued</Badge> : null}
                  </div>
                  <CardDescription>
                    {execution.completedSets} of {execution.totalSets} sets logged - Saved {formatSnapshotTime(snapshot.savedAt)}
                  </CardDescription>
                </div>
                <Link href="/workouts" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  <Dumbbell data-icon="inline-start" />
                  Full workout
                </Link>
              </div>
            </CardHeader>
          </Card>

          <div
            className={cn(
              'flex items-center gap-3 rounded-[22px] border px-4 py-3 text-sm text-muted-foreground',
              isOnline ? 'border-border/70 bg-muted/60' : 'border-primary/25 bg-primary/8',
            )}
          >
            {isOnline ? <RefreshCw className={pendingCount ? 'animate-spin motion-reduce:animate-none' : ''} /> : <CloudOff />}
            <span>
              {offlineSync.failedEntries.length > 0
                ? `${offlineSync.failedEntries.length} ${offlineSync.failedEntries.length === 1 ? 'change needs' : 'changes need'} attention`
                : isOnline
                  ? pendingCount
                    ? `Syncing ${pendingCount} pending ${pendingCount === 1 ? 'change' : 'changes'}...`
                    : `Last sync ${formatSnapshotTime(snapshot.lastSuccessfulSyncAt ?? snapshot.savedAt)}`
                  : 'Offline mode - set logs will queue on this device'}
            </span>
            {isOnline && (pendingCount > 0 || offlineSync.failedEntries.length > 0) ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => void offlineSync.retrySync()}
                disabled={offlineSync.isRetrying}
              >
                <RefreshCw className={offlineSync.isRetrying ? 'animate-spin motion-reduce:animate-none' : undefined} />
                Retry
              </Button>
            ) : null}
          </div>

          {snapshot.lastFailureReason ? (
            <div className="rounded-[22px] border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-muted-foreground">
              Last sync failed: {snapshot.lastFailureReason}
            </div>
          ) : null}

          {remainingRestSeconds !== null ? (
            <Card className="surface-panel border-primary/25 bg-primary/6">
              <CardHeader>
                <CardTitle className="text-base">Rest timer</CardTitle>
                <CardDescription>{restTimer?.label ?? 'Current rest'}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold tracking-[-0.06em] text-foreground">
                  {formatDurationClock(remainingRestSeconds)}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {nextSet ? (
            <SetRow
              key={`${snapshot.workoutId}:${nextSet.set_order}:${nextSet.repsActual ?? 'pending'}`}
              autoStartRestTimer={shouldAutoStartRestTimer(execution, nextSet.set_order)}
              hasRemainingWorkAfterSet={hasRemainingPendingWork(execution, nextSet.set_order)}
              isNextUp
              layout="focus"
              set={nextSet}
              syncError={outboxEntryBySetOrder.get(nextSet.set_order)?.lastError}
              syncRetryCount={outboxEntryBySetOrder.get(nextSet.set_order)?.retryCount}
              syncState={getEffectiveSetSyncState(nextSet.set_order)}
              onRetrySync={outboxEntryBySetOrder.has(nextSet.set_order) ? offlineSync.retrySync : undefined}
              onLocalSetLogged={handleLocalSetLogged}
              onSyncStateChange={(state) => updateSetSyncState(nextSet.set_order, state.status)}
              userId={userId}
            />
          ) : (
            <Card className="surface-panel">
              <CardContent className="flex flex-col gap-3 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="size-4" />
                  All saved sets are logged. Finish the session when you are ready.
                </span>
              </CardContent>
            </Card>
          )}

          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="text-base">Workout sets</CardTitle>
              <CardDescription>{execution.completedSets}/{execution.totalSets} logged from the local snapshot.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              {snapshot.sets.map((set) => {
                const outboxEntry = outboxEntryBySetOrder.get(set.set_order)

                return (
                  <SetRow
                    key={`${snapshot.workoutId}:${set.set_order}:${set.repsActual ?? 'pending'}:list`}
                    autoStartRestTimer={false}
                    hasRemainingWorkAfterSet={false}
                    layout="default"
                    set={set}
                    syncError={outboxEntry?.lastError}
                    syncRetryCount={outboxEntry?.retryCount}
                    syncState={getEffectiveSetSyncState(set.set_order)}
                    onRetrySync={outboxEntry ? offlineSync.retrySync : undefined}
                    onLocalSetLogged={handleLocalSetLogged}
                    onSyncStateChange={(state) => updateSetSyncState(set.set_order, state.status)}
                    userId={userId}
                  />
                )
              })}
            </CardContent>
          </Card>

          {isWorkoutFullyLogged ? (
            <CompleteWorkoutButton
              cycleId={snapshot.cycleId}
              redirectTo={null}
              userIdOverride={snapshot.userId}
              workoutId={snapshot.workoutId}
              onCompleted={() => setSnapshot(null)}
              onQueued={markSnapshotCompletionQueued}
            />
          ) : null}
          </div>
        )}
      </div>
    </main>
  )
}

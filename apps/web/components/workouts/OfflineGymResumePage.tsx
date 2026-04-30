'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Activity, CloudOff, Dumbbell, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getActiveWorkoutSnapshot,
  getOfflineWorkoutOutboxEntries,
  saveActiveWorkoutSnapshot,
  type OfflineWorkoutOutboxEntry,
  type OfflineWorkoutSnapshot,
} from '@/lib/offline-workout-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SetRow } from './SetRow'
import {
  buildWorkoutExecutionSnapshot,
  formatDurationClock,
  getRecommendedRestSeconds,
  hasRemainingPendingWork,
  shouldAutoStartRestTimer,
  type WorkoutDisplaySet,
} from './types'

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
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [outboxEntries, setOutboxEntries] = useState<OfflineWorkoutOutboxEntry[]>([])
  const [snapshot, setSnapshot] = useState<OfflineWorkoutSnapshot | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now())

  useEffect(() => {
    let isActive = true

    const loadSnapshot = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const sessionUserId = data.session?.user.id ?? null

      if (!isActive) {
        return
      }

      setUserId(sessionUserId)

      if (!sessionUserId) {
        setIsLoading(false)
        return
      }

      const [storedSnapshot, storedOutboxEntries] = await Promise.all([
        getActiveWorkoutSnapshot(sessionUserId),
        getOfflineWorkoutOutboxEntries(sessionUserId),
      ])

      if (!isActive) {
        return
      }

      setSnapshot(storedSnapshot)
      setOutboxEntries(storedOutboxEntries)
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

  const execution = useMemo(
    () => buildWorkoutExecutionSnapshot(snapshot?.sets ?? []),
    [snapshot?.sets],
  )
  const pendingCount = outboxEntries.length + (snapshot?.pendingMutationCount ?? 0)
  const nextSet = execution.nextSet
  const restTimer = snapshot?.restTimer ?? null
  const isRestTimerForSnapshot = Boolean(
    restTimer?.workoutId === snapshot?.workoutId && restTimer?.endsAt !== null,
  )
  const remainingRestSeconds = isRestTimerForSnapshot && restTimer?.endsAt
    ? Math.max(0, Math.ceil((restTimer.endsAt - timerNowMs) / 1000))
    : null

  const persistSnapshot = (nextSnapshot: OfflineWorkoutSnapshot) => {
    setSnapshot(nextSnapshot)
    void saveActiveWorkoutSnapshot(nextSnapshot).catch(() => undefined)
  }

  const refreshOutbox = () => {
    if (!userId) {
      return
    }

    void getOfflineWorkoutOutboxEntries(userId)
      .then(setOutboxEntries)
      .catch(() => undefined)
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
    <main className="page-shell max-w-5xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Gym Mode</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Resume workout</h1>
            <p className="page-copy">
              {isOnline ? 'Connected' : 'Offline'} - {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
            </p>
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
              {isOnline
                ? pendingCount
                  ? `Syncing ${pendingCount} pending ${pendingCount === 1 ? 'change' : 'changes'}...`
                  : `Last sync ${formatSnapshotTime(snapshot.lastSuccessfulSyncAt ?? snapshot.savedAt)}`
                : 'Offline mode - set logs will queue on this device'}
            </span>
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
              syncState={snapshot.syncStates[nextSet.set_order]?.status}
              onLocalSetLogged={handleLocalSetLogged}
              onSyncStateChange={(state) => updateSetSyncState(nextSet.set_order, state.status)}
              userId={userId}
            />
          ) : (
            <Card className="surface-panel">
              <CardContent className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
                <Activity className="size-4" />
                All saved sets are logged. Open the full workout to complete the session.
              </CardContent>
            </Card>
          )}

          <Card className="surface-panel">
            <CardHeader>
              <CardTitle className="text-base">Workout sets</CardTitle>
              <CardDescription>{execution.completedSets}/{execution.totalSets} logged from the local snapshot.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              {snapshot.sets.map((set) => (
                <SetRow
                  key={`${snapshot.workoutId}:${set.set_order}:${set.repsActual ?? 'pending'}:list`}
                  autoStartRestTimer={false}
                  hasRemainingWorkAfterSet={false}
                  layout="default"
                  set={set}
                  syncState={snapshot.syncStates[set.set_order]?.status}
                  onLocalSetLogged={handleLocalSetLogged}
                  onSyncStateChange={(state) => updateSetSyncState(set.set_order, state.status)}
                  userId={userId}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}

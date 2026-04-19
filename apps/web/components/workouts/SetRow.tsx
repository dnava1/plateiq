'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, CloudAlert, CloudUpload, PencilLine } from 'lucide-react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { useHistoricalAmrapSets, useLogSet } from '@/hooks/useWorkouts'
import { formatCanonicalEffort, formatTargetEffort } from '@/lib/effort'
import { useWorkoutSessionStore, type SetSyncState } from '@/store/workoutSessionStore'
import { cn, formatWeight, roundWeightForDisplay } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SetEntry } from './SetEntry'
import {
  estimateOneRepMax,
  formatBlockRoleLabel,
  formatDurationClock,
  formatRepTarget,
  formatSetTypeLabel,
  getRecommendedRestSeconds,
  isBackoffDisplayType,
  isEstimatedOneRepMaxPr,
  isQuickLoggableSet,
  type WorkoutDisplaySet,
} from './types'

interface SetRowProps {
  anchorId?: string
  autoStartRestTimer?: boolean
  hasRemainingWorkAfterSet?: boolean
  isNextUp?: boolean
  layout?: 'default' | 'focus'
  set: WorkoutDisplaySet
  syncState?: SetSyncState['status']
  onSyncStateChange?: (state: SetSyncState) => void
  userId: string
}

function getSyncLabel(syncState: SetSyncState['status'] | undefined) {
  switch (syncState) {
    case 'queued':
      return 'Queued'
    case 'error':
      return 'Sync error'
    case 'dirty':
      return 'Saving'
    default:
      return null
  }
}

function doesLoggedSetMatchPrescription(
  set: Pick<WorkoutDisplaySet, 'is_amrap' | 'prescribedWeightLbs' | 'repsActual' | 'reps_prescribed' | 'reps_prescribed_max' | 'weight_lbs'>,
  roundingLbs?: number | null,
) {
  if (set.repsActual === null) {
    return false
  }

  const roundedPlannedWeight = roundWeightForDisplay(set.prescribedWeightLbs, roundingLbs)
  const roundedLoggedWeight = roundWeightForDisplay(set.weight_lbs, roundingLbs)
  const loadMatchesPrescription = Math.abs(roundedLoggedWeight - roundedPlannedWeight) <= 0.1

  if (!loadMatchesPrescription) {
    return false
  }

  if (set.is_amrap) {
    return set.repsActual >= set.reps_prescribed
  }

  if (typeof set.reps_prescribed_max === 'number') {
    return set.repsActual >= set.reps_prescribed && set.repsActual <= set.reps_prescribed_max
  }

  return set.repsActual === set.reps_prescribed
}

export function SetRow({
  anchorId,
  autoStartRestTimer = true,
  hasRemainingWorkAfterSet = true,
  isNextUp = false,
  layout = 'default',
  set,
  syncState,
  onSyncStateChange,
  userId,
}: SetRowProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const logSet = useLogSet()
  const historicalAmraps = useHistoricalAmrapSets(set.is_amrap ? (set.exerciseId ?? undefined) : undefined)
  const hasShownPrToast = useWorkoutSessionStore((state) => state.hasShownPrToast)
  const markPrToastShown = useWorkoutSessionStore((state) => state.markPrToastShown)
  const startRestTimer = useWorkoutSessionStore((state) => state.startRestTimer)
  const [showSetEntry, setShowSetEntry] = useState(false)

  const repTarget = formatRepTarget(set.reps_prescribed, set.reps_prescribed_max, set.is_amrap)
  const estimatedOneRepMax = set.repsActual !== null
    ? estimateOneRepMax(set.weight_lbs, set.repsActual)
    : null
  const isBackoffSet = isBackoffDisplayType(set.display_type)
  const syncLabel = getSyncLabel(syncState)
  const recommendedRestSeconds = getRecommendedRestSeconds(set)
  const supportsQuickLogging = isQuickLoggableSet(set)
  const setTypeLabel = formatSetTypeLabel(set.set_type, set.display_type)
  const plannedWeightLabel = formatWeight(set.prescribedWeightLbs, preferredUnit, weightRoundingLbs)
  const loggedWeightLabel = formatWeight(set.weight_lbs, preferredUnit, weightRoundingLbs)
  const roundedPlannedWeight = roundWeightForDisplay(set.prescribedWeightLbs, weightRoundingLbs)
  const roundedLoggedWeight = roundWeightForDisplay(set.weight_lbs, weightRoundingLbs)
  const usesAdjustedLoad = Math.abs(roundedLoggedWeight - roundedPlannedWeight) > 0.1
  const isCompleted = set.repsActual !== null
  const matchesPrescription = isCompleted && doesLoggedSetMatchPrescription(set, weightRoundingLbs)
  const plannedOutcomeLabel = `${plannedWeightLabel} × ${repTarget} reps`
  const loggedOutcomeLabel = isCompleted
    ? `${loggedWeightLabel} × ${set.repsActual} reps`
    : null
  const shouldShowLoggedOutcome = Boolean(loggedOutcomeLabel) && (set.is_amrap || !matchesPrescription)
  const prescribedEffortLabel = set.prescribedRpe !== null ? formatTargetEffort(set.prescribedRpe) : null
  const loggedEffortLabel = set.rpe !== null ? formatCanonicalEffort(set.rpe) : null

  const updateSyncState = (status: SetSyncState['status']) => {
    onSyncStateChange?.({ status })
  }

  const announcePersonalRecord = async (repsActual: number, weightLbs: number) => {
    if (!set.is_amrap || !set.exerciseId || !set.workoutId) {
      return
    }

    const prToastKey = `${set.workoutId}:${set.set_order}:${repsActual}`
    if (hasShownPrToast(prToastKey)) {
      return
    }

    try {
      const result = await historicalAmraps.refetch()
      const historicalEstimates = (result.data ?? historicalAmraps.data ?? [])
        .filter((entry) => !(entry.workout_id === set.workoutId && entry.set_order === set.set_order))
        .map((entry) => estimateOneRepMax(entry.weight_lbs, entry.reps_actual ?? 0))

      const nextEstimate = estimateOneRepMax(weightLbs, repsActual)
      if (!isEstimatedOneRepMaxPr(nextEstimate, historicalEstimates)) {
        return
      }

      markPrToastShown(prToastKey)
      toast.success(`New ${set.exerciseName} estimated 1RM PR: ${formatWeight(nextEstimate, preferredUnit, weightRoundingLbs)}`)
    } catch {
      return
    }
  }

  const maybeStartRestTimer = () => {
    if (isCompleted || !autoStartRestTimer || !recommendedRestSeconds || !hasRemainingWorkAfterSet) {
      return
    }

    startRestTimer({
      durationSeconds: recommendedRestSeconds,
      label: set.exerciseName,
      sourceSetOrder: set.set_order,
      workoutId: set.workoutId ?? null,
    })
  }

  const submitLog = (
    repsActual: number,
    weightLbs: number = set.weight_lbs,
    actualRpe: number | null = set.rpe ?? null,
  ) => {
    if (!set.exerciseId || !set.workoutId || !userId) {
      toast.error(`Couldn't resolve the exercise for set ${set.set_order}.`)
      return
    }

    updateSyncState(typeof navigator !== 'undefined' && navigator.onLine ? 'dirty' : 'queued')
    maybeStartRestTimer()

    logSet.mutate(
      {
        workoutId: set.workoutId,
        exerciseId: set.exerciseId,
        exerciseName: set.exerciseName,
        userId,
        setOrder: set.set_order,
        setType: set.set_type,
        weightLbs,
        repsPrescribed: set.reps_prescribed,
        repsPrescribedMax: set.reps_prescribed_max,
        repsActual,
        isAmrap: set.is_amrap,
        actualRpe,
        intensityType: set.intensity_type,
      },
      {
        onSuccess: async () => {
          updateSyncState('synced')
          setShowSetEntry(false)

          if (set.is_amrap) {
            await announcePersonalRecord(repsActual, weightLbs)
          }
        },
        onError: (error) => {
          updateSyncState('error')
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <div
      id={anchorId}
      className={cn(
        'flex flex-col gap-3 rounded-[22px] border p-4',
        layout === 'focus'
          ? 'border-primary/30 bg-primary/5 shadow-sm'
          : 'border-border/70 bg-background/55',
        isNextUp && layout !== 'focus' ? 'border-primary/35 bg-primary/4' : null,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">Set {set.set_order}</span>
            <Badge variant="outline">{formatBlockRoleLabel(set.block_role)}</Badge>
            <Badge
              variant={set.set_type === 'main' ? 'secondary' : set.is_amrap ? 'default' : 'outline'}
              className={cn(isBackoffSet ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200' : null)}
            >
              {setTypeLabel}
            </Badge>
            {syncLabel ? <Badge variant="outline">{syncLabel}</Badge> : null}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{set.exerciseName}</p>
            {isCompleted ? (
              <>
                <p className="text-sm text-muted-foreground">Planned {plannedOutcomeLabel}</p>
                {shouldShowLoggedOutcome ? (
                  <p className="text-sm font-medium text-foreground">Logged {loggedOutcomeLabel}</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{plannedOutcomeLabel}</p>
            )}
            {prescribedEffortLabel ? (
              <p className="text-xs text-muted-foreground">{prescribedEffortLabel}</p>
            ) : null}
            {isCompleted && loggedEffortLabel ? (
              <p className="text-xs text-muted-foreground">Logged {loggedEffortLabel}</p>
            ) : null}
            {!isCompleted && usesAdjustedLoad ? (
              <p className="text-xs text-muted-foreground">
                Suggested {formatWeight(set.prescribedWeightLbs, preferredUnit, weightRoundingLbs)}
              </p>
            ) : null}
            {recommendedRestSeconds ? (
              <p className="text-xs text-muted-foreground">Rest {formatDurationClock(recommendedRestSeconds)} after this set.</p>
            ) : null}
          </div>
        </div>

        {!set.exerciseId ? (
          <p className="text-sm text-destructive">Exercise mapping required</p>
        ) : isCompleted ? (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <div className={cn(
              'flex items-center gap-1.5 text-sm font-medium',
              matchesPrescription ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
            )}>
              <CheckCircle2 />
              {matchesPrescription ? 'Logged as planned' : 'Logged with adjustments'}
            </div>
            {matchesPrescription && loggedOutcomeLabel ? <p className="text-xs text-muted-foreground">{loggedOutcomeLabel}</p> : null}
            {estimatedOneRepMax ? (
              <p className="text-xs text-muted-foreground">
                Estimated 1RM {formatWeight(estimatedOneRepMax, preferredUnit, weightRoundingLbs)}
              </p>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowSetEntry((current) => !current)}>
              <PencilLine data-icon="inline-start" />
              Adjust
            </Button>
          </div>
        ) : supportsQuickLogging ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button type="button" size={layout === 'focus' ? 'default' : 'sm'} onClick={() => submitLog(set.reps_prescribed, set.prescribedWeightLbs, null)} disabled={logSet.isPending}>
              {syncState === 'queued' ? <CloudAlert data-icon="inline-start" /> : <CloudUpload data-icon="inline-start" />}
              {logSet.isPending ? 'Saving…' : 'Log planned'}
            </Button>
            <Button type="button" variant="outline" size={layout === 'focus' ? 'default' : 'sm'} onClick={() => setShowSetEntry((current) => !current)} disabled={logSet.isPending}>
                <PencilLine data-icon="inline-start" />
              {showSetEntry ? 'Close' : 'Adjust'}
            </Button>
          </div>
        ) : (
          <Button type="button" variant={layout === 'focus' ? 'default' : 'outline'} size={layout === 'focus' ? 'default' : 'sm'} onClick={() => setShowSetEntry((current) => !current)} disabled={logSet.isPending}>
            <PencilLine data-icon="inline-start" />
            {showSetEntry ? 'Close' : set.is_amrap ? 'Log reps' : 'Enter details'}
          </Button>
        )}
      </div>

      {showSetEntry ? (
        <SetEntry
          allowZeroWeight={set.intensity_type === 'bodyweight'}
          defaultActualRpe={set.rpe}
          defaultReps={set.repsActual ?? set.reps_prescribed}
          defaultWeightLbs={set.weight_lbs}
          isPending={logSet.isPending}
          onCancel={() => setShowSetEntry(false)}
          onSubmit={({ actualRpe, reps, weightLbs }) => submitLog(reps, weightLbs, actualRpe)}
          prescribedRpe={set.prescribedRpe}
          showEstimatedOneRepMax={set.is_amrap}
        />
      ) : null}
    </div>
  )
}
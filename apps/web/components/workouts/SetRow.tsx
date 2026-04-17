'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, CloudAlert, CloudUpload, PencilLine } from 'lucide-react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { useHistoricalAmrapSets, useLogSet } from '@/hooks/useWorkouts'
import { useWorkoutSessionStore, type SetSyncState } from '@/store/workoutSessionStore'
import { formatWeight } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AmrapEntry } from './AmrapEntry'
import { SetEntry } from './SetEntry'
import {
  estimateOneRepMax,
  formatRepTarget,
  formatSetTypeLabel,
  isEstimatedOneRepMaxPr,
  type WorkoutDisplaySet,
} from './types'

interface SetRowProps {
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

export function SetRow({ set, syncState, onSyncStateChange, userId }: SetRowProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const logSet = useLogSet()
  const historicalAmraps = useHistoricalAmrapSets(set.is_amrap ? (set.exerciseId ?? undefined) : undefined)
  const hasShownPrToast = useWorkoutSessionStore((state) => state.hasShownPrToast)
  const markPrToastShown = useWorkoutSessionStore((state) => state.markPrToastShown)
  const [showAmrapEntry, setShowAmrapEntry] = useState(false)
  const [showSetEntry, setShowSetEntry] = useState(false)

  const repTarget = formatRepTarget(set.reps_prescribed, set.reps_prescribed_max, set.is_amrap)
  const estimatedOneRepMax = set.repsActual !== null
    ? estimateOneRepMax(set.weight_lbs, set.repsActual)
    : null
  const syncLabel = getSyncLabel(syncState)
  const supportsEditableLogging = set.set_type === 'variation' || set.set_type === 'accessory'
  const usesAdjustedLoad = Math.abs(set.weight_lbs - set.prescribedWeightLbs) > 0.1

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

  const submitLog = (repsActual: number, weightLbs: number = set.weight_lbs) => {
    if (!set.exerciseId || !set.workoutId || !userId) {
      toast.error(`Couldn't resolve the exercise for set ${set.set_order}.`)
      return
    }

    updateSyncState(typeof navigator !== 'undefined' && navigator.onLine ? 'dirty' : 'queued')

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
        rpe: set.rpe,
        intensityType: set.intensity_type,
      },
      {
        onSuccess: async () => {
          updateSyncState('synced')
          setShowAmrapEntry(false)
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
    <div className="flex flex-col gap-3 rounded-[22px] border border-border/70 bg-background/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">Set {set.set_order}</span>
            <Badge variant={set.set_type === 'main' ? 'secondary' : set.is_amrap ? 'default' : 'outline'}>
              {formatSetTypeLabel(set.set_type)}
            </Badge>
            {syncLabel ? <Badge variant="outline">{syncLabel}</Badge> : null}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{set.exerciseName}</p>
            <p className="text-sm text-muted-foreground">
              {formatWeight(set.weight_lbs, preferredUnit, weightRoundingLbs)} × {repTarget} reps
            </p>
            {usesAdjustedLoad ? (
              <p className="text-xs text-muted-foreground">
                Suggested {formatWeight(set.prescribedWeightLbs, preferredUnit, weightRoundingLbs)}
              </p>
            ) : null}
          </div>
        </div>

        {!set.exerciseId ? (
          <p className="text-sm text-destructive">Exercise mapping required</p>
        ) : set.repsActual !== null ? (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 />
              Logged {set.repsActual} reps
            </div>
            {estimatedOneRepMax ? (
              <p className="text-xs text-muted-foreground">
                Estimated 1RM {formatWeight(estimatedOneRepMax, preferredUnit, weightRoundingLbs)}
              </p>
            ) : null}
            {set.is_amrap ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAmrapEntry((current) => !current)}>
                <PencilLine data-icon="inline-start" />
                Update
              </Button>
            ) : supportsEditableLogging ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowSetEntry((current) => !current)}>
                <PencilLine data-icon="inline-start" />
                Update
              </Button>
            ) : null}
          </div>
        ) : set.is_amrap ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAmrapEntry((current) => !current)} disabled={logSet.isPending}>
            <PencilLine data-icon="inline-start" />
            {showAmrapEntry ? 'Close' : 'Log'}
          </Button>
        ) : supportsEditableLogging ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowSetEntry((current) => !current)} disabled={logSet.isPending}>
            <PencilLine data-icon="inline-start" />
            {showSetEntry ? 'Close' : 'Log set'}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => submitLog(set.reps_prescribed, set.prescribedWeightLbs)} disabled={logSet.isPending}>
            {syncState === 'queued' ? <CloudAlert data-icon="inline-start" /> : <CloudUpload data-icon="inline-start" />}
            {logSet.isPending ? 'Saving…' : 'Log'}
          </Button>
        )}
      </div>

      {set.is_amrap && showAmrapEntry ? (
        <AmrapEntry
          defaultValue={set.repsActual}
          isPending={logSet.isPending}
          onCancel={() => setShowAmrapEntry(false)}
          onSubmit={submitLog}
          prescribedReps={set.reps_prescribed}
          weightLbs={set.weight_lbs}
        />
      ) : null}

      {!set.is_amrap && showSetEntry ? (
        <SetEntry
          allowZeroWeight={set.intensity_type === 'bodyweight'}
          defaultReps={set.repsActual ?? set.reps_prescribed}
          defaultWeightLbs={set.weight_lbs}
          isPending={logSet.isPending}
          onCancel={() => setShowSetEntry(false)}
          onSubmit={({ reps, weightLbs }) => submitLog(reps, weightLbs)}
          suggestedWeightLbs={set.prescribedWeightLbs}
        />
      ) : null}
    </div>
  )
}
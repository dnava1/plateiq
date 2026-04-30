'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, CircleCheckBig } from 'lucide-react'
import { toast } from 'sonner'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { buildExerciseKeyMap, resolveExerciseIdFromMap, useExercises } from '@/hooks/useExercises'
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { useUser } from '@/hooks/useUser'
import {
  buildTrainingMaxMap,
  resolveWorkoutProgram,
  useActiveCycle,
  useCycleWorkouts,
  useSeedWorkoutSets,
  useUpdateWorkoutBlockPrescription,
  useWorkoutExerciseContext,
  useWorkoutSets,
} from '@/hooks/useWorkouts'
import type { TrainingProgram } from '@/hooks/usePrograms'
import { generateWorkoutPlan } from '@/lib/constants/templates/engine'
import { getActiveWorkoutSnapshot, saveActiveWorkoutSnapshot } from '@/lib/offline-workout-store'
import { resolveProgramDays } from '@/lib/programs/week'
import { getPendingMutationCount } from '@/lib/query-persistence'
import { cn, formatDate, formatExerciseKey, formatWeight, roundToIncrement } from '@/lib/utils'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CompleteWorkoutButton } from './CompleteWorkoutButton'
import { OfflineSyncBanner } from './OfflineSyncBanner'
import { PlateBreakdownInline } from './PlateBreakdownInline'
import { SetRow } from './SetRow'
import {
  buildWorkoutExecutionCue,
  buildWorkoutExecutionSnapshot,
  formatBlockRoleLabel,
  formatDurationClock,
  formatWorkoutPercentageBasisLabel,
  formatExecutionGroupTypeLabel,
  formatRepTarget,
  formatSetTypeLabel,
  getEditablePercentageBlock,
  hasRemainingPendingWork,
  isBackoffDisplayType,
  isDropDisplayType,
  shouldAutoStartRestTimer,
  type WorkoutDisplayBlock,
  type WorkoutDisplaySet,
} from './types'

interface ActiveWorkoutPanelProps {
  program: TrainingProgram
}

const REST_TIMER_PRESET_SECONDS = [30, 60, 90, 120, 150, 180] as const

function formatPercentageValue(value: number) {
  const normalizedValue = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return normalizedValue.replace(/\.0$/, '')
}

function resolveEditedWorkoutWeight(baseWeightLbs: number, intensity: number, rounding: number) {
  return roundToIncrement(baseWeightLbs * intensity, rounding, 'down')
}

function getBlockCardClasses(role: WorkoutDisplayBlock['role']) {
  switch (role) {
    case 'primary':
      return 'border-primary/30 bg-primary/5'
    case 'variation':
      return 'border-sky-500/25 bg-sky-500/5'
    case 'accessory':
      return 'border-border/70 bg-background/55'
    default:
      return 'border-border/70 bg-background/55'
  }
}

function getExecutionGroupDescription(kind: 'superset' | 'circuit') {
  return kind === 'superset'
    ? 'Move between these blocks as a superset.'
    : 'Work through these blocks as a circuit.'
}

export function ActiveWorkoutPanel({ program }: ActiveWorkoutPanelProps) {
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const userId = user?.id ?? null
  const { data: exercises } = useExercises()
  const { data: trainingMaxes } = useCurrentTrainingMaxes()
  const preferredUnit = usePreferredUnit()
  const preferredWeightRounding = usePreferredWeightRounding()
  const { data: fallbackCycle } = useActiveCycle(program.id)
  const { template, selectedVariationKeys, rounding } = useMemo(
    () => resolveWorkoutProgram(program, preferredWeightRounding, fallbackCycle),
    [fallbackCycle, preferredWeightRounding, program],
  )
  const activeWorkoutId = useWorkoutSessionStore((state) => state.activeWorkoutId)
  const activeCycleId = useWorkoutSessionStore((state) => state.activeCycleId)
  const activeDayIndex = useWorkoutSessionStore((state) => state.activeDayIndex)
  const activeWeekNumber = useWorkoutSessionStore((state) => state.activeWeekNumber)
  const clearRestTimer = useWorkoutSessionStore((state) => state.clearRestTimer)
  const exitActiveWorkout = useWorkoutSessionStore((state) => state.exitActiveWorkout)
  const pendingCompletionWorkoutId = useWorkoutSessionStore((state) => state.pendingCompletionWorkoutId)
  const restTimer = useWorkoutSessionStore((state) => state.restTimer)
  const startRestTimer = useWorkoutSessionStore((state) => state.startRestTimer)
  const syncStates = useWorkoutSessionStore((state) => state.syncStates)
  const setSyncState = useWorkoutSessionStore((state) => state.setSyncState)
  const cycleId = activeCycleId ?? fallbackCycle?.id
  const { data: cycleWorkouts } = useCycleWorkouts(cycleId)
  const { data: workoutSets } = useWorkoutSets(activeWorkoutId ?? undefined)
  const seedWorkoutSets = useSeedWorkoutSets()
  const updateWorkoutBlockPrescription = useUpdateWorkoutBlockPrescription()
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now())
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editingPercentageValue, setEditingPercentageValue] = useState('')
  const wakeLockStatus = useScreenWakeLock(Boolean(activeWorkoutId))

  const trainingMaxMap = useMemo(() => buildTrainingMaxMap(trainingMaxes), [trainingMaxes])
  const exerciseKeyMap = useMemo(() => buildExerciseKeyMap(exercises), [exercises])
  const exerciseNameById = useMemo(
    () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.name])),
    [exercises],
  )

  const currentWorkout = cycleWorkouts?.find((workout) => workout.id === activeWorkoutId) ?? null
  const effectiveWeekNumber = activeWeekNumber ?? currentWorkout?.week_number ?? 1
  const daysForCurrentWeek = useMemo(
    () => (template ? resolveProgramDays(template, effectiveWeekNumber) : []),
    [effectiveWeekNumber, template],
  )
  const resolvedDayIndexFromWorkoutLabel = currentWorkout?.day_label
    ? daysForCurrentWeek.findIndex((day) => day.label === currentWorkout.day_label)
    : null
  const effectiveDayIndex = currentWorkout?.day_label
    ? (resolvedDayIndexFromWorkoutLabel ?? -1)
    : activeDayIndex !== null
      ? (activeDayIndex >= 0 && activeDayIndex < daysForCurrentWeek.length ? activeDayIndex : -1)
      : 0
  const selectedDay = effectiveDayIndex >= 0 ? daysForCurrentWeek[effectiveDayIndex] : undefined

  useEffect(() => {
    const isTimerForCurrentWorkout = restTimer.workoutId === activeWorkoutId && restTimer.endsAt !== null

    if (!isTimerForCurrentWorkout) {
      return
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setTimerNowMs(Date.now())
    })
    const intervalId = window.setInterval(() => {
      setTimerNowMs(Date.now())
    }, 1000)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.clearInterval(intervalId)
    }
  }, [activeWorkoutId, restTimer.endsAt, restTimer.workoutId])

  const generatedSets = useMemo(() => {
    if (!template || effectiveDayIndex < 0) return []

    return generateWorkoutPlan(
      template,
      effectiveDayIndex,
      effectiveWeekNumber,
      trainingMaxMap,
      selectedVariationKeys,
      rounding,
    )
  }, [effectiveDayIndex, effectiveWeekNumber, rounding, selectedVariationKeys, template, trainingMaxMap])

  const displaySets = useMemo<WorkoutDisplaySet[]>(() => {
    const storedSetsByOrder = new Map((workoutSets ?? []).map((set) => [set.set_order, set]))

    return generatedSets.map((set) => {
      const storedSet = storedSetsByOrder.get(set.set_order)
      const exerciseId = storedSet?.exercise_id ?? set.exercise_id ?? resolveExerciseIdFromMap(exerciseKeyMap, set.exercise_key) ?? null
      const exerciseName = storedSet?.exercises?.name
        ?? (exerciseId ? exerciseNameById.get(exerciseId) : undefined)
        ?? formatExerciseKey(set.exercise_key)

      return {
        ...set,
        weight_lbs: storedSet?.weight_lbs ?? set.weight_lbs,
        exerciseId,
        exerciseName,
        loggedAt: storedSet?.logged_at ?? null,
        prescribedIntensity: storedSet?.prescribed_intensity ?? set.prescribed_intensity,
        prescribedWeightLbs: storedSet?.prescribed_weight_lbs ?? set.weight_lbs,
        prescriptionBaseWeightLbs: storedSet?.prescription_base_weight_lbs ?? set.prescription_base_weight_lbs ?? null,
        prescribedRpe: set.rpe ?? null,
        repsActual: storedSet?.reps_actual ?? null,
        rpe: storedSet?.rpe ?? null,
        workoutId: activeWorkoutId,
        workoutSetId: storedSet?.id ?? null,
      }
    })
  }, [activeWorkoutId, exerciseKeyMap, exerciseNameById, generatedSets, workoutSets])

  useEffect(() => {
    if (!activeWorkoutId || !cycleId || !userId || seedWorkoutSets.isPending) {
      return
    }

    const setsToSeed = displaySets
      .filter((set) => set.workoutSetId === null && set.exerciseId !== null)
      .map((set) => ({
        exerciseId: set.exerciseId as number,
        intensityType: set.intensity_type,
        isAmrap: set.is_amrap,
        prescribedIntensity: set.prescribedIntensity,
        prescribedRpe: set.prescribedRpe,
        prescribedWeightLbs: set.prescribedWeightLbs,
        prescriptionBaseWeightLbs: set.prescriptionBaseWeightLbs,
        repsPrescribed: set.reps_prescribed,
        repsPrescribedMax: set.reps_prescribed_max ?? null,
        setOrder: set.set_order,
        setType: set.set_type,
        weightLbs: set.prescribedWeightLbs,
      }))

    if (!setsToSeed.length) {
      return
    }

    seedWorkoutSets.mutate({
      cycleId,
      workoutId: activeWorkoutId,
      userId,
      sets: setsToSeed,
    })
  }, [activeWorkoutId, cycleId, displaySets, seedWorkoutSets, userId])
  const exerciseContextIds = useMemo(
    () => Array.from(
      new Set(
        displaySets
          .map((set) => set.exerciseId)
          .filter((exerciseId): exerciseId is number => Number.isInteger(exerciseId)),
      ),
    ).sort((left, right) => left - right),
    [displaySets],
  )
  const execution = useMemo(() => buildWorkoutExecutionSnapshot(displaySets), [displaySets])
  const nextSet = execution.nextSet
  const currentExerciseId = nextSet?.exerciseId ?? null
  const exerciseContextTargets = useMemo(() => {
    if (currentExerciseId === null || !nextSet) {
      return {}
    }

    return {
      [currentExerciseId]: {
        isAmrap: nextSet.is_amrap,
        repsPrescribed: nextSet.reps_prescribed,
        repsPrescribedMax: nextSet.reps_prescribed_max ?? null,
      },
    }
  }, [currentExerciseId, nextSet])
  const exerciseContext = useWorkoutExerciseContext(
    activeWorkoutId ?? undefined,
    exerciseContextIds,
    user?.id ?? undefined,
    exerciseContextTargets,
  )
  const nextBlock = execution.nextBlock
  const nextGroup = useMemo(
    () => execution.groups.find((group) => group.blocks.some((block) => block.blockId === nextBlock?.blockId)) ?? null,
    [execution.groups, nextBlock?.blockId],
  )
  const executionCue = useMemo(() => buildWorkoutExecutionCue(execution), [execution])
  const nextSetTypeLabel = nextSet ? formatSetTypeLabel(nextSet.set_type, nextSet.display_type) : null
  const nextSetIsBackoff = nextSet ? isBackoffDisplayType(nextSet.display_type) : false
  const nextSetIsDrop = nextSet ? isDropDisplayType(nextSet.display_type) : false
  const nextBlockRoleLabel = nextBlock ? formatBlockRoleLabel(nextBlock.role) : null
  const currentExerciseContext = currentExerciseId !== null
    ? exerciseContext.data[currentExerciseId] ?? null
    : null
  const currentRecentSession = currentExerciseContext?.recentSession ?? null
  const isRestTimerForCurrentWorkout = restTimer.workoutId === activeWorkoutId && restTimer.endsAt !== null
  const remainingRestSeconds = isRestTimerForCurrentWorkout && restTimer.endsAt !== null
    ? Math.max(0, Math.ceil((restTimer.endsAt - timerNowMs) / 1000))
    : null
  const isRestComplete = remainingRestSeconds === 0 && isRestTimerForCurrentWorkout
  const completedCount = execution.completedSets
  const isCompletionQueued = pendingCompletionWorkoutId === activeWorkoutId

  useEffect(() => {
    if (!userId || !activeWorkoutId || !cycleId || !selectedDay || effectiveDayIndex < 0) {
      return
    }

    void (async () => {
      const existingSnapshot = await getActiveWorkoutSnapshot(userId)

      await saveActiveWorkoutSnapshot({
        activeDayIndex: effectiveDayIndex,
        activeWeekNumber: effectiveWeekNumber,
        completedAt: currentWorkout?.completed_at ?? null,
        cycleId,
        cycleNumber: fallbackCycle?.cycle_number ?? null,
        dayLabel: selectedDay.label,
        lastFailureReason: existingSnapshot?.lastFailureReason ?? null,
        lastSuccessfulSyncAt: existingSnapshot?.lastSuccessfulSyncAt ?? null,
        pendingCompletionWorkoutId,
        pendingMutationCount: getPendingMutationCount(queryClient),
        program: {
          config: program.config,
          id: program.id,
          name: program.name,
          template_key: program.template_key,
        },
        restTimer,
        savedAt: new Date().toISOString(),
        sets: displaySets,
        syncStates,
        userId,
        version: 1,
        workoutId: activeWorkoutId,
      })
    })().catch(() => undefined)
  }, [
    activeWorkoutId,
    currentWorkout?.completed_at,
    cycleId,
    displaySets,
    effectiveDayIndex,
    effectiveWeekNumber,
    fallbackCycle?.cycle_number,
    pendingCompletionWorkoutId,
    program.config,
    program.id,
    program.name,
    program.template_key,
    queryClient,
    restTimer,
    selectedDay,
    syncStates,
    userId,
  ])

  const openWorkoutPercentageEditor = (block: WorkoutDisplayBlock) => {
    const editableBlock = getEditablePercentageBlock(block)
    if (!editableBlock) {
      return
    }

    setEditingBlockId(block.blockId)
    setEditingPercentageValue(formatPercentageValue(editableBlock.intensityPercent))
  }

  const closeWorkoutPercentageEditor = () => {
    setEditingBlockId(null)
    setEditingPercentageValue('')
  }

  if (!activeWorkoutId || !template || !selectedDay) {
    return (
      <Card className="surface-panel">
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <AlertCircle />
          The active workout context is missing. Return to the launcher and start the session again.
        </CardContent>
      </Card>
    )
  }

  const startManualRestTimer = (durationSeconds: number) => {
    startRestTimer({
      durationSeconds,
      label: nextSet?.exerciseName ?? selectedDay.label ?? 'Workout rest',
      sourceSetOrder: restTimer.sourceSetOrder,
      workoutId: activeWorkoutId,
    })
  }

  const scrollToNextSet = () => {
    if (!nextSet) {
      return
    }

    document.getElementById(`workout-set-${nextSet.set_order}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const applyWorkoutPercentageOverride = async (block: WorkoutDisplayBlock) => {
    const editableBlock = getEditablePercentageBlock(block)
    const parsedPercentage = Number(editingPercentageValue)

    if (!editableBlock || !cycleId || !userId) {
      return
    }

    if (!Number.isFinite(parsedPercentage) || parsedPercentage <= 0) {
      toast.error('Enter a valid percentage greater than 0.')
      return
    }

    const nextIntensity = parsedPercentage / 100
    const nextWeightLbs = resolveEditedWorkoutWeight(editableBlock.prescriptionBaseWeightLbs, nextIntensity, rounding)

    try {
      await updateWorkoutBlockPrescription.mutateAsync({
        cycleId,
        workoutId: activeWorkoutId,
        userId,
        updates: editableBlock.setOrders.map((setOrder) => ({
          prescribedIntensity: nextIntensity,
          prescribedWeightLbs: nextWeightLbs,
          prescriptionBaseWeightLbs: editableBlock.prescriptionBaseWeightLbs,
          setOrder,
        })),
      })

      toast.success(
        `${block.exerciseName} updated to ${formatPercentageValue(parsedPercentage)}% ${formatWorkoutPercentageBasisLabel(editableBlock.intensityType)} for the remaining workout sets.`,
      )
      closeWorkoutPercentageEditor()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The workout percentage could not be updated.')
    }
  }

  const recentSessionDate = currentRecentSession?.completedAt ?? currentRecentSession?.scheduledDate ?? null
  const recentSessionLabel = currentRecentSession
    ? [
        currentRecentSession.weekNumber ? `Week ${currentRecentSession.weekNumber}` : null,
        currentRecentSession.dayLabel,
        recentSessionDate ? formatDate(recentSessionDate) : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' · ')
    : null
  const recentReferenceTarget = currentRecentSession
    ? formatRepTarget(
        currentRecentSession.referenceSet.repsPrescribed,
        currentRecentSession.referenceSet.repsPrescribedMax ?? undefined,
        currentRecentSession.referenceSet.isAmrap,
      )
    : null

  const renderBlock = (block: WorkoutDisplayBlock, nested = false) => {
    const distinctWeightsLbs = [...new Set(block.sets.map((set) => set.weight_lbs).filter((weight) => weight > 0))]
    const editablePercentageBlock = getEditablePercentageBlock(block)
    const isEditingWorkoutPercentage = editingBlockId === block.blockId

    return (
      <Card key={block.blockId} className={cn('surface-panel', getBlockCardClasses(block.role), nested ? 'bg-background/70' : null)}>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{block.exerciseName}</CardTitle>
                <Badge variant={block.role === 'primary' ? 'secondary' : 'outline'}>{formatBlockRoleLabel(block.role)}</Badge>
                <Badge variant="outline">
                  {block.completedCount}/{block.totalCount} sets
                </Badge>
                {editablePercentageBlock ? (
                  <Badge variant="outline">
                    {formatPercentageValue(editablePercentageBlock.intensityPercent)}% {formatWorkoutPercentageBasisLabel(editablePercentageBlock.intensityType)}
                  </Badge>
                ) : null}
              </div>
              {block.notes ? <CardDescription>{block.notes}</CardDescription> : null}
            </div>
            {editablePercentageBlock ? (
              <Button
                type="button"
                size="sm"
                variant={isEditingWorkoutPercentage ? 'secondary' : 'outline'}
                onClick={() => (isEditingWorkoutPercentage ? closeWorkoutPercentageEditor() : openWorkoutPercentageEditor(block))}
              >
                {isEditingWorkoutPercentage ? 'Close % edit' : 'Edit remaining %'}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0">
          {editablePercentageBlock && isEditingWorkoutPercentage ? (
            <div className="rounded-[20px] border border-border/70 bg-background/70 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">Update remaining sets for this workout</p>
                  <p className="text-sm text-muted-foreground">
                    Applies to {editablePercentageBlock.remainingSetCount} unlogged {editablePercentageBlock.remainingSetCount === 1 ? 'set' : 'sets'} only. Logged work stays as recorded.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:max-w-[12rem]">
                  <Label htmlFor={`workout-block-percentage-${block.blockId}`}>
                    % {formatWorkoutPercentageBasisLabel(editablePercentageBlock.intensityType)}
                  </Label>
                  <Input
                    id={`workout-block-percentage-${block.blockId}`}
                    type="number"
                    min={0.5}
                    step={0.5}
                    inputMode="decimal"
                    value={editingPercentageValue}
                    onChange={(event) => setEditingPercentageValue(event.target.value)}
                    disabled={updateWorkoutBlockPrescription.isPending}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void applyWorkoutPercentageOverride(block)}
                    disabled={updateWorkoutBlockPrescription.isPending}
                  >
                    {updateWorkoutBlockPrescription.isPending ? 'Saving...' : 'Apply to workout'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={closeWorkoutPercentageEditor}
                    disabled={updateWorkoutBlockPrescription.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {block.sets.map((set) => (
            <SetRow
              autoStartRestTimer={shouldAutoStartRestTimer(execution, set.set_order)}
              key={set.set_order}
              anchorId={`workout-set-${set.set_order}`}
              hasRemainingWorkAfterSet={hasRemainingPendingWork(execution, set.set_order)}
              isNextUp={nextSet?.set_order === set.set_order}
              layout="default"
              set={set}
              syncState={syncStates[set.set_order]?.status}
              onSyncStateChange={(state) => setSyncState(set.set_order, state)}
              userId={userId ?? ''}
            />
          ))}
          <PlateBreakdownInline weightsLbs={distinctWeightsLbs} />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <OfflineSyncBanner />

      <Card className="surface-panel">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{selectedDay.label}</CardTitle>
                <Badge>Week {effectiveWeekNumber}</Badge>
                {fallbackCycle ? <Badge variant="outline">Cycle {fallbackCycle.cycle_number}</Badge> : null}
                <Badge variant="outline">
                  {execution.completedBlocks}/{execution.totalBlocks} blocks
                </Badge>
                {wakeLockStatus === 'active' ? <Badge variant="outline">Screen awake</Badge> : null}
              </div>
              <CardDescription>
                {completedCount} of {displaySets.length} planned sets logged.
              </CardDescription>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={exitActiveWorkout}>
              <ArrowLeft data-icon="inline-start" />
              Back to workouts
            </Button>
          </div>
        </CardHeader>
      </Card>

      {nextSet && nextBlock ? (
        <Card className="surface-panel border-primary/30 bg-primary/6">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Next up</Badge>
              {nextBlockRoleLabel && nextBlockRoleLabel !== nextSetTypeLabel ? <Badge variant="outline">{nextBlockRoleLabel}</Badge> : null}
              {nextSetTypeLabel ? (
                <Badge
                  variant={nextSet.set_type === 'main' ? 'secondary' : nextSet.is_amrap ? 'default' : 'outline'}
                  className={cn(
                    nextSetIsBackoff ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200' : null,
                    nextSetIsDrop ? 'border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200' : null,
                  )}
                >
                  {nextSetTypeLabel}
                </Badge>
              ) : null}
              {nextGroup && nextGroup.kind !== 'single' ? <Badge variant="secondary">{nextGroup.label}</Badge> : null}
              {executionCue?.roundLabel ? <Badge variant="outline">{executionCue.roundLabel}</Badge> : null}
              {isRestTimerForCurrentWorkout ? <Badge variant={isRestComplete ? 'secondary' : 'outline'}>{isRestComplete ? 'Rest complete' : 'Resting'}</Badge> : null}
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl">{executionCue?.currentSetLabel ?? nextSet.exerciseName}</CardTitle>
              <CardDescription>{executionCue?.workoutProgressLabel ?? `Workout ${execution.completedSets}/${execution.totalSets} complete.`}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Execution cue</span>
                <p className="text-sm font-medium text-foreground">{executionCue?.blockProgressLabel ?? `Set ${nextSet.set_order} is next.`}</p>
                {executionCue?.groupProgressLabel ? <p className="text-sm text-muted-foreground">{executionCue.groupProgressLabel}</p> : null}
                {executionCue?.followUpLabel ? <p className="text-sm text-muted-foreground">{executionCue.followUpLabel}</p> : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" size="sm" variant="outline" onClick={scrollToNextSet}>
                    Jump to next set
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Rest timer</span>
                    {isRestTimerForCurrentWorkout && remainingRestSeconds !== null ? (
                      <>
                        <p className="text-3xl font-semibold tracking-[-0.06em] text-foreground">{formatDurationClock(remainingRestSeconds)}</p>
                        <p className="text-sm text-muted-foreground">
                          {isRestComplete
                            ? 'Rest is complete. Start the next set when you are ready.'
                            : 'Stay with the timer, then hit the next set.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">Start a quick rest timer and keep the workout moving.</p>
                        <div className="flex flex-wrap gap-2">
                          {REST_TIMER_PRESET_SECONDS.map((durationSeconds) => (
                            <Button key={durationSeconds} type="button" size="sm" variant="outline" onClick={() => startManualRestTimer(durationSeconds)}>
                              {formatDurationClock(durationSeconds)}
                            </Button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {isRestTimerForCurrentWorkout && restTimer.durationSeconds ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => startManualRestTimer(restTimer.durationSeconds!)}>
                        Restart rest
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={clearRestTimer}>
                        Skip rest
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Exercise context</span>
                    <p className="text-sm font-medium text-foreground">{nextSet.exerciseName}</p>
                  </div>

                  {exerciseContext.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading recent context…</p>
                  ) : currentExerciseId === null ? (
                    <p className="text-sm text-muted-foreground">Exercise mapping is required before context can load.</p>
                  ) : currentRecentSession ? (
                    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Last completed session</p>
                      {recentSessionLabel ? <p className="mt-1 text-sm font-medium text-foreground">{recentSessionLabel}</p> : null}
                      <p className="text-sm text-muted-foreground">
                        {formatWeight(currentRecentSession.referenceSet.weightLbs, preferredUnit, rounding)} × {currentRecentSession.referenceSet.repsActual} reps
                      </p>
                      {recentReferenceTarget ? <p className="text-xs text-muted-foreground">Target {recentReferenceTarget} reps.</p> : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent completed session yet for this exercise.</p>
                  )}

                  {exerciseContext.isError ? (
                    <p className="text-xs text-muted-foreground">Context is temporarily unavailable. Logging still works as usual.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="xl:col-span-2">
              <SetRow
                autoStartRestTimer={shouldAutoStartRestTimer(execution, nextSet.set_order)}
                hasRemainingWorkAfterSet={hasRemainingPendingWork(execution, nextSet.set_order)}
                layout="focus"
                set={nextSet}
                syncState={syncStates[nextSet.set_order]?.status}
                onSyncStateChange={(state) => setSyncState(nextSet.set_order, state)}
                userId={userId ?? ''}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {execution.groups.map((group) =>
        group.kind === 'single'
          ? renderBlock(group.blocks[0]!)
          : (
              <Card key={group.id} className="surface-panel border-dashed border-border/80 bg-card/70">
                <CardHeader className="gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{group.label}</CardTitle>
                    <Badge>{formatExecutionGroupTypeLabel(group.kind)}</Badge>
                    <Badge variant="outline">
                      {group.completedCount}/{group.totalCount} sets
                    </Badge>
                  </div>
                  <CardDescription>{getExecutionGroupDescription(group.kind)}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-0 lg:grid-cols-2">
                  {group.blocks.map((block) => renderBlock(block, true))}
                </CardContent>
              </Card>
            ),
      )}

      {displaySets.length > 0 && completedCount === displaySets.length ? (
        <div className="flex items-center gap-2 rounded-[22px] border border-border/70 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          <CircleCheckBig className="text-emerald-600 dark:text-emerald-400" />
          All prescribed sets are logged. Ready to finish the workout.
        </div>
      ) : null}

      {isCompletionQueued ? (
        <div className="flex items-center gap-2 rounded-[22px] border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-muted-foreground">
          <CircleCheckBig className="text-primary" />
          Workout completion is queued and will finalize when the connection returns.
        </div>
      ) : null}

      {cycleId ? (
        <CompleteWorkoutButton cycleId={cycleId} workoutId={activeWorkoutId} />
      ) : null}
    </div>
  )
}

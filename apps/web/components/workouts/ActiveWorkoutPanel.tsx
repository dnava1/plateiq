'use client'

import { useEffect, useMemo } from 'react'
import { AlertCircle, CircleCheckBig } from 'lucide-react'
import { buildExerciseKeyMap, resolveExerciseIdFromMap, useExercises } from '@/hooks/useExercises'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { useUser } from '@/hooks/useUser'
import { buildTrainingMaxMap, resolveWorkoutProgram, useActiveCycle, useCycleWorkouts, useWorkoutSets } from '@/hooks/useWorkouts'
import type { TrainingProgram } from '@/hooks/usePrograms'
import { generateWorkoutPlan } from '@/lib/constants/templates/engine'
import { formatExerciseKey } from '@/lib/utils'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CompleteWorkoutButton } from './CompleteWorkoutButton'
import { OfflineSyncBanner } from './OfflineSyncBanner'
import { SetRow } from './SetRow'
import type { WorkoutDisplaySet } from './types'

interface ActiveWorkoutPanelProps {
  program: TrainingProgram
}

export function ActiveWorkoutPanel({ program }: ActiveWorkoutPanelProps) {
  const { data: user } = useUser()
  const { data: exercises } = useExercises()
  const { data: trainingMaxes } = useCurrentTrainingMaxes()
  const { template, selectedVariationKeys, rounding } = useMemo(() => resolveWorkoutProgram(program), [program])
  const activeWorkoutId = useWorkoutSessionStore((state) => state.activeWorkoutId)
  const activeCycleId = useWorkoutSessionStore((state) => state.activeCycleId)
  const activeDayIndex = useWorkoutSessionStore((state) => state.activeDayIndex)
  const activeWeekNumber = useWorkoutSessionStore((state) => state.activeWeekNumber)
  const syncStates = useWorkoutSessionStore((state) => state.syncStates)
  const setSyncState = useWorkoutSessionStore((state) => state.setSyncState)
  const clearSession = useWorkoutSessionStore((state) => state.clearSession)
  const { data: fallbackCycle } = useActiveCycle(program.id)
  const cycleId = activeCycleId ?? fallbackCycle?.id
  const { data: cycleWorkouts } = useCycleWorkouts(cycleId)
  const { data: workoutSets } = useWorkoutSets(activeWorkoutId ?? undefined)

  const trainingMaxMap = useMemo(() => buildTrainingMaxMap(trainingMaxes), [trainingMaxes])
  const exerciseKeyMap = useMemo(() => buildExerciseKeyMap(exercises), [exercises])
  const exerciseNameById = useMemo(
    () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.name])),
    [exercises],
  )

  const currentWorkout = cycleWorkouts?.find((workout) => workout.id === activeWorkoutId) ?? null
  const effectiveWeekNumber = activeWeekNumber ?? currentWorkout?.week_number ?? 1
  const effectiveDayIndex =
    activeDayIndex ??
    (template && currentWorkout?.day_label
      ? template.days.findIndex((day) => day.label === currentWorkout.day_label)
      : 0)

  useEffect(() => {
    if (currentWorkout?.completed_at) {
      clearSession()
    }
  }, [clearSession, currentWorkout?.completed_at])

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
    const loggedSetsByOrder = new Map((workoutSets ?? []).map((set) => [set.set_order, set]))

    return generatedSets.map((set) => {
      const loggedSet = loggedSetsByOrder.get(set.set_order)
      const exerciseId = loggedSet?.exercise_id ?? set.exercise_id ?? resolveExerciseIdFromMap(exerciseKeyMap, set.exercise_key) ?? null
      const exerciseName = loggedSet?.exercises?.name
        ?? (exerciseId ? exerciseNameById.get(exerciseId) : undefined)
        ?? formatExerciseKey(set.exercise_key)

      return {
        ...set,
        exerciseId,
        exerciseName,
        loggedAt: loggedSet?.logged_at ?? null,
        repsActual: loggedSet?.reps_actual ?? null,
        workoutId: activeWorkoutId,
      }
    })
  }, [activeWorkoutId, exerciseKeyMap, exerciseNameById, generatedSets, workoutSets])

  const groupedSets = useMemo(() => {
    const groups = new Map<string, WorkoutDisplaySet[]>()

    for (const set of displaySets) {
      const current = groups.get(set.exerciseName) ?? []
      current.push(set)
      groups.set(set.exerciseName, current)
    }

    return Array.from(groups.entries())
  }, [displaySets])

  const completedCount = displaySets.filter((set) => set.repsActual !== null).length

  if (!activeWorkoutId || !template || effectiveDayIndex < 0) {
    return (
      <Card className="surface-panel">
        <CardContent className="flex items-center gap-3 pt-4 text-sm text-muted-foreground">
          <AlertCircle />
          The active workout context is missing. Return to the launcher and start the session again.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <OfflineSyncBanner />

      <Card className="surface-panel">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{template.days[effectiveDayIndex]?.label ?? 'Active Workout'}</CardTitle>
            <Badge>Week {effectiveWeekNumber}</Badge>
            {fallbackCycle ? <Badge variant="outline">Cycle {fallbackCycle.cycle_number}</Badge> : null}
          </div>
          <CardDescription>
            {completedCount} of {displaySets.length} planned sets logged.
          </CardDescription>
        </CardHeader>
      </Card>

      {groupedSets.map(([exerciseName, sets]) => {
        const exerciseCompletedCount = sets.filter((set) => set.repsActual !== null).length

        return (
          <Card key={exerciseName} className="surface-panel">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{exerciseName}</CardTitle>
                <Badge variant="outline">
                  {exerciseCompletedCount}/{sets.length} sets
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {sets.map((set) => (
                <SetRow
                  key={set.set_order}
                  set={set}
                  syncState={syncStates[set.set_order]?.status}
                  onSyncStateChange={(state) => setSyncState(set.set_order, state)}
                  userId={user?.id ?? ''}
                />
              ))}
            </CardContent>
          </Card>
        )
      })}

      {displaySets.length > 0 && completedCount === displaySets.length ? (
        <div className="flex items-center gap-2 rounded-[22px] border border-border/70 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          <CircleCheckBig className="text-emerald-600 dark:text-emerald-400" />
          All prescribed sets are logged. Add notes if needed, then finish the workout.
        </div>
      ) : null}

      {cycleId ? (
        <CompleteWorkoutButton cycleId={cycleId} onComplete={clearSession} workoutId={activeWorkoutId} />
      ) : null}
    </div>
  )
}
'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { useExerciseKeyMap, resolveExerciseIdFromMap, useExercises } from '@/hooks/useExercises'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { useUser } from '@/hooks/useUser'
import { useCycleWorkouts, useActiveCycle, useEnsureWorkout, resolveWorkoutProgram, buildTrainingMaxMap } from '@/hooks/useWorkouts'
import type { TrainingProgram } from '@/hooks/usePrograms'
import { generateWorkoutPlan } from '@/lib/constants/templates/engine'
import { resolveProgramDays } from '@/lib/programs/week'
import { findSuggestedWorkoutSelection } from '@/lib/workout-progress'
import { formatExerciseKey, formatWeekCycle } from '@/lib/utils'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkoutPlanDisplay } from './WorkoutPlanDisplay'
import type { WorkoutDisplaySet } from './types'

interface WorkoutLauncherProps {
  program: TrainingProgram
}

export function WorkoutLauncher({ program }: WorkoutLauncherProps) {
  const { data: user } = useUser()
  const { data: exercises } = useExercises()
  const { data: trainingMaxes } = useCurrentTrainingMaxes()
  const preferredWeightRounding = usePreferredWeightRounding()
  const { template, selectedVariationKeys, rounding } = useMemo(
    () => resolveWorkoutProgram(program, preferredWeightRounding),
    [preferredWeightRounding, program],
  )
  const { data: activeCycle, isLoading: isCycleLoading } = useActiveCycle(program.id)
  const { data: cycleWorkouts } = useCycleWorkouts(activeCycle?.id)
  const ensureWorkout = useEnsureWorkout()
  const exerciseKeyMap = useExerciseKeyMap()
  const sessionCycleId = useWorkoutSessionStore((state) => state.activeCycleId)
  const sessionDayIndex = useWorkoutSessionStore((state) => state.activeDayIndex)
  const sessionWeekNumber = useWorkoutSessionStore((state) => state.activeWeekNumber)
  const setActiveWorkout = useWorkoutSessionStore((state) => state.setActiveWorkout)
  const setActiveContext = useWorkoutSessionStore((state) => state.setActiveContext)
  const [manualSelection, setManualSelection] = useState<{
    dayIndex: number
    scope: string
    weekNumber: number
  } | null>(null)

  const suggestedSelection = useMemo(
    () => findSuggestedWorkoutSelection(template ?? undefined, cycleWorkouts),
    [cycleWorkouts, template],
  )

  const selectionScope = `${program.id}:${activeCycle?.id ?? 'none'}`
  const sessionSelection = template
    && activeCycle?.id === sessionCycleId
    && sessionDayIndex !== null
    && sessionWeekNumber !== null
    ? {
        dayIndex: sessionDayIndex,
        weekNumber: Math.min(Math.max(1, sessionWeekNumber), template.cycle_length_weeks),
      }
    : null
  const currentWeekNumber = manualSelection?.scope === selectionScope
    ? manualSelection.weekNumber
    : (sessionSelection?.weekNumber ?? suggestedSelection.weekNumber)
  const requestedDayIndex = manualSelection?.scope === selectionScope
    ? manualSelection.dayIndex
    : (sessionSelection?.dayIndex ?? suggestedSelection.dayIndex)
  const daysForCurrentWeek = useMemo(
    () => (template ? resolveProgramDays(template, currentWeekNumber) : []),
    [currentWeekNumber, template],
  )
  const currentDayIndex = Math.min(Math.max(0, requestedDayIndex), Math.max(0, daysForCurrentWeek.length - 1))
  const selectedDay = daysForCurrentWeek[currentDayIndex]
  const trainingMaxMap = useMemo(() => buildTrainingMaxMap(trainingMaxes), [trainingMaxes])
  const exerciseNameById = useMemo(
    () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.name])),
    [exercises],
  )

  const previewSets = useMemo<WorkoutDisplaySet[]>(() => {
    if (!template || !selectedDay) return []

    return generateWorkoutPlan(
      template,
      currentDayIndex,
      currentWeekNumber,
      trainingMaxMap,
      selectedVariationKeys,
      rounding,
    ).map((set) => {
      const exerciseId = set.exercise_id ?? resolveExerciseIdFromMap(exerciseKeyMap, set.exercise_key) ?? null
      return {
        ...set,
        exerciseId,
        exerciseName: exerciseId
          ? exerciseNameById.get(exerciseId) ?? formatExerciseKey(set.exercise_key)
          : formatExerciseKey(set.exercise_key),
        loggedAt: null,
        prescribedWeightLbs: set.weight_lbs,
        prescribedRpe: set.rpe ?? null,
        repsActual: null,
        rpe: null,
        workoutId: null,
      }
    })
  }, [currentDayIndex, currentWeekNumber, exerciseKeyMap, exerciseNameById, rounding, selectedDay, selectedVariationKeys, template, trainingMaxMap])

  const daySetCounts = useMemo(
    () => (template
      ? daysForCurrentWeek.map((_, index) =>
          generateWorkoutPlan(
            template,
            index,
            currentWeekNumber,
            trainingMaxMap,
            selectedVariationKeys,
            rounding,
          ).length,
        )
      : []),
    [currentWeekNumber, daysForCurrentWeek, rounding, selectedVariationKeys, template, trainingMaxMap],
  )

  const selectedWorkout = cycleWorkouts?.find(
    (workout) => workout.week_number === currentWeekNumber && workout.day_label === selectedDay?.label,
  )

  const cycleLabel = activeCycle ? `Cycle ${activeCycle.cycle_number}` : 'Cycle'

  if (!template) {
    return (
      <Card className="surface-panel">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{"This program doesn't have a workout template to launch yet."}</p>
        </CardContent>
      </Card>
    )
  }

  if (isCycleLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:items-start">
        <div className="metric-tile flex flex-col gap-2">
          <span className="eyebrow">Loading</span>
          <p className="text-2xl font-semibold tracking-[-0.06em] text-foreground">Preparing workout</p>
          <p className="text-sm text-muted-foreground">Fetching your active cycle and recent session data.</p>
        </div>
      </div>
    )
  }

  if (!activeCycle) {
    return (
      <Card className="surface-panel">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">No active cycle was found for this program.</p>
        </CardContent>
      </Card>
    )
  }

  const handleStartWorkout = () => {
    if (!selectedDay || !user) {
      toast.error('You need an active session to start logging workouts.')
      return
    }

    if (selectedWorkout && !selectedWorkout.completed_at) {
      setActiveContext({ cycleId: activeCycle.id, dayIndex: currentDayIndex, weekNumber: currentWeekNumber })
      setActiveWorkout(selectedWorkout.id)
      return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('Go online once to create this workout. Existing workouts can still be resumed offline.')
      return
    }

    const primaryBlock = selectedDay.exercise_blocks.find((block) => block.role === 'primary') ?? selectedDay.exercise_blocks[0]
    const primaryExerciseId = primaryBlock?.exercise_id ?? resolveExerciseIdFromMap(exerciseKeyMap, primaryBlock?.exercise_key)

    if (!primaryExerciseId) {
      toast.error(`Couldn't resolve the primary exercise for ${selectedDay.label}.`)
      return
    }

    ensureWorkout.mutate(
      {
        cycleId: activeCycle.id,
        userId: user.id,
        primaryExerciseId,
        weekNumber: currentWeekNumber,
        dayLabel: selectedDay.label,
      },
      {
        onSuccess: (workout) => {
          setActiveContext({ cycleId: activeCycle.id, dayIndex: currentDayIndex, weekNumber: currentWeekNumber })
          setActiveWorkout(workout.id)
          toast.success(`Started ${selectedDay.label}`)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:items-start">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="metric-tile flex flex-col gap-2">
            <span className="eyebrow">Active Program</span>
            <p className="text-2xl font-semibold tracking-[-0.06em] text-foreground">{program.name}</p>
            <p className="text-sm text-muted-foreground">{cycleLabel} · {formatWeekCycle(template.cycle_length_weeks)}</p>
          </div>
          <div className="metric-tile flex flex-col gap-2">
            <span className="eyebrow">Week</span>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  setManualSelection({
                    dayIndex: Math.min(
                      currentDayIndex,
                      Math.max(0, resolveProgramDays(template, Math.max(1, currentWeekNumber - 1)).length - 1),
                    ),
                    scope: selectionScope,
                    weekNumber: Math.max(1, currentWeekNumber - 1),
                  })
                }
                disabled={currentWeekNumber <= 1}
              >
                <ChevronLeft />
              </Button>
              <p className="text-2xl font-semibold tracking-[-0.06em] text-foreground">Week {currentWeekNumber}</p>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  setManualSelection({
                    dayIndex: Math.min(
                      currentDayIndex,
                      Math.max(0, resolveProgramDays(template, Math.min(template.cycle_length_weeks, currentWeekNumber + 1)).length - 1),
                    ),
                    scope: selectionScope,
                    weekNumber: Math.min(template.cycle_length_weeks, currentWeekNumber + 1),
                  })
                }
                disabled={currentWeekNumber >= template.cycle_length_weeks}
              >
                <ChevronRight />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{"Adjust the week if you're catching up or repeating a session."}</p>
          </div>
        </div>

        <Card className="surface-panel">
          <CardHeader>
            <CardTitle className="text-base">Choose your day</CardTitle>
            <CardDescription>Select the session you’re training and launch the logger.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {daysForCurrentWeek.map((day, index) => {
              const workout = cycleWorkouts?.find(
                (item) => item.week_number === currentWeekNumber && item.day_label === day.label,
              )
              const isSelected = index === currentDayIndex
              const isCompleted = Boolean(workout?.completed_at)
              const loggedSetCount = workout?.workout_sets?.filter((set) => set.reps_actual !== null).length ?? 0
              const totalSetCount = workout?.workout_sets?.length ?? 0

              return (
                <button
                  key={`${day.label}-${index}`}
                  type="button"
                  onClick={() =>
                    setManualSelection({
                      dayIndex: index,
                      scope: selectionScope,
                      weekNumber: currentWeekNumber,
                    })
                  }
                  className={`interactive flex flex-col gap-2 rounded-[22px] border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-primary/40 bg-primary/6'
                      : 'border-border/70 bg-background/55 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{day.label}</span>
                    {isCompleted ? <Badge>Completed</Badge> : workout ? <Badge variant="outline">Resume</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {workout
                      ? `${loggedSetCount}/${totalSetCount || daySetCounts[index] || 0} sets logged`
                      : 'Not started yet'}
                  </p>
                </button>
              )
            })}
          </CardContent>
          <CardFooter className="justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {selectedWorkout?.completed_at
                ? 'This session is already completed for the selected week.'
                : selectedWorkout
                  ? 'Resume the in-progress workout from where you left off.'
                  : 'Create the workout row online once, then you can keep logging offline.'}
            </div>
            <Button type="button" size="sm" onClick={handleStartWorkout} disabled={Boolean(selectedWorkout?.completed_at) || ensureWorkout.isPending}>
              {selectedWorkout && !selectedWorkout.completed_at ? <RotateCcw data-icon="inline-start" /> : <Play data-icon="inline-start" />}
              {ensureWorkout.isPending ? 'Starting…' : selectedWorkout && !selectedWorkout.completed_at ? 'Resume' : 'Start'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="surface-panel">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{selectedDay?.label ?? 'Workout Preview'}</CardTitle>
              <Badge variant="outline">Week {currentWeekNumber}</Badge>
            </div>
            <CardDescription>
              Preview the generated plan before you start. Support blocks are already folded in for the active program config.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <WorkoutPlanDisplay sets={previewSets} />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
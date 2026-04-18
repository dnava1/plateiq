'use client'

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getExerciseLookupKeys, useExercises, type Exercise } from '@/hooks/useExercises'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { getProgressionIncrements } from '@/lib/constants/templates/engine'
import { isCustomProgramConfig, type CustomProgramConfig, type ProgressionRule } from '@/types/template'
import type { Database } from '@/types/database'
import { analyticsQueryKeys } from './useAnalytics'
import { dashboardQueryKeys } from './useDashboard'
import type { TrainingProgram } from './usePrograms'
import { useSupabase } from './useSupabase'
import { resolveWorkoutProgram, useActiveCycle, useCycleWorkouts, type CycleWorkout } from './useWorkouts'

type CurrentTrainingMaxSnapshot = {
  exercise_id: number
  weight_lbs: number
  exercises?: { name: string } | null
}

export interface CycleProgressionPreviewRow {
  exerciseId: number
  exerciseKey: string
  exerciseName: string
  currentTmLbs: number
  incrementLbs: number
  newTmLbs: number
  reason: string
}

export interface CycleProgressionPayloadRow {
  exercise_id: number
  increment_lbs: number
}

interface ResolvedProgressionLift {
  exerciseId: number
  exerciseKey: string
  exerciseName: string
  currentTmLbs: number
}

interface BuildCycleCompletionPreviewArgs {
  cycleWorkouts: CycleWorkout[] | undefined
  exercises: Exercise[] | undefined
  program: TrainingProgram | null | undefined
  trainingMaxes: CurrentTrainingMaxSnapshot[] | undefined
}

interface CompleteCycleResult {
  completed_cycle_id: number
  new_cycle_id: number
  new_cycle_number: number
}

interface CompleteCycleInput {
  cycleId: number
  progression: CycleProgressionPayloadRow[]
}

function buildTrainingMaxLookup(trainingMaxes: CurrentTrainingMaxSnapshot[] | undefined) {
  const lookup = new Map<string, CurrentTrainingMaxSnapshot>()

  for (const trainingMax of trainingMaxes ?? []) {
    const exerciseName = trainingMax.exercises?.name
    if (!exerciseName) continue

    for (const key of getExerciseLookupKeys(exerciseName)) {
      if (!lookup.has(key)) {
        lookup.set(key, trainingMax)
      }
    }
  }

  return lookup
}

function buildTrainingMaxById(trainingMaxes: CurrentTrainingMaxSnapshot[] | undefined) {
  return new Map((trainingMaxes ?? []).map((trainingMax) => [trainingMax.exercise_id, trainingMax]))
}

function buildExerciseNameById(exercises: Exercise[] | undefined) {
  return new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.name]))
}

function isLowerBodyExerciseKey(exerciseKey: string) {
  return getExerciseLookupKeys(exerciseKey).some((key) => key.includes('squat') || key.includes('deadlift'))
}

function resolveCustomBaseIncrement(progression: ProgressionRule, exerciseKey: string) {
  const defaults = progression.increment_lbs ?? { upper: 5, lower: 10 }
  return isLowerBodyExerciseKey(exerciseKey) ? defaults.lower : defaults.upper
}

function countCompletedPrimarySessions(cycleWorkouts: CycleWorkout[] | undefined, exerciseId: number) {
  const completedSessions = (cycleWorkouts ?? []).filter(
    (workout) => workout.primary_exercise_id === exerciseId && workout.completed_at,
  )

  return completedSessions.length
}

function getBestAmrapMargin(cycleWorkouts: CycleWorkout[] | undefined, exerciseId: number) {
  let bestMargin: number | null = null

  for (const workout of cycleWorkouts ?? []) {
    for (const set of workout.workout_sets ?? []) {
      if (!set.is_amrap || set.exercise_id !== exerciseId || set.reps_actual === null) {
        continue
      }

      const margin = set.reps_actual - set.reps_prescribed
      bestMargin = bestMargin === null ? margin : Math.max(bestMargin, margin)
    }
  }

  return bestMargin
}

function resolvePreviewIncrement(
  progression: ProgressionRule,
  baseIncrementLbs: number,
  cycleWorkouts: CycleWorkout[] | undefined,
  lift: ResolvedProgressionLift,
) {
  switch (progression.style) {
    case 'linear_per_session': {
      const completedSessions = countCompletedPrimarySessions(cycleWorkouts, lift.exerciseId)
      const appliedSessions = completedSessions > 0 ? completedSessions : 1
      const sessionLabel = appliedSessions === 1 ? 'session' : 'sessions'

      return {
        incrementLbs: baseIncrementLbs * appliedSessions,
        reason:
          completedSessions > 0
            ? `${completedSessions} completed primary ${sessionLabel} this cycle, so the base increment is applied each time.`
            : 'No completed primary sessions were derived from the current cycle, so one base increment is applied.',
      }
    }

    case 'autoregulated': {
      const bestMargin = getBestAmrapMargin(cycleWorkouts, lift.exerciseId)

      if (bestMargin === null) {
        return {
          incrementLbs: baseIncrementLbs,
          reason: 'No current-cycle AMRAP data was found, so the base increment is applied.',
        }
      }

      if (bestMargin <= -2) {
        return {
          incrementLbs: 0,
          reason: `Best AMRAP performance missed the target by ${Math.abs(bestMargin)} reps, so the training max holds for the next cycle while you decide whether to deload manually.`,
        }
      }

      if (bestMargin < 0) {
        return {
          incrementLbs: 0,
          reason: 'Best AMRAP performance finished below target, so the training max holds for the next cycle.',
        }
      }

      return {
        incrementLbs: baseIncrementLbs,
        reason:
          bestMargin === 0
            ? 'AMRAP target met, so the base increment is applied.'
            : `Best AMRAP performance beat the target by ${bestMargin} reps, so the base increment is applied.`,
      }
    }

    case 'linear_per_cycle':
      return {
        incrementLbs: baseIncrementLbs,
        reason: 'Cycle completion applies one base increment for the next block.',
      }
    case 'linear_per_week':
      return {
        incrementLbs: baseIncrementLbs,
        reason: 'Weekly progression rolls forward as one base increment at cycle completion.',
      }
    case 'wave':
      return {
        incrementLbs: baseIncrementLbs,
        reason: 'Wave loading rolls into the next cycle with one base increment.',
      }
    case 'percentage_cycle':
      return {
        incrementLbs: baseIncrementLbs,
        reason: 'Percentage-driven progression uses one base increment for the next cycle.',
      }
    case 'custom':
      return {
        incrementLbs: baseIncrementLbs,
        reason: 'Custom progression uses the configured base increment for the next cycle.',
      }
    default:
      return {
        incrementLbs: baseIncrementLbs,
        reason: 'The base increment is applied for the next cycle.',
      }
  }
}

function resolveBuiltInLifts(
  exerciseNameById: Map<number, string>,
  requiredExercises: string[],
  templateKey: string,
  trainingMaxLookup: Map<string, CurrentTrainingMaxSnapshot>,
) {
  const seen = new Set<number>()
  const lifts: ResolvedProgressionLift[] = []

  for (const exerciseKey of requiredExercises) {
    const trainingMax = trainingMaxLookup.get(exerciseKey)
    if (!trainingMax || seen.has(trainingMax.exercise_id)) {
      continue
    }

    seen.add(trainingMax.exercise_id)
    lifts.push({
      exerciseId: trainingMax.exercise_id,
      exerciseKey,
      exerciseName: trainingMax.exercises?.name ?? exerciseNameById.get(trainingMax.exercise_id) ?? templateKey,
      currentTmLbs: Number(trainingMax.weight_lbs),
    })
  }

  return lifts
}

function resolveCustomLifts(
  config: CustomProgramConfig,
  exerciseNameById: Map<number, string>,
  trainingMaxById: Map<number, CurrentTrainingMaxSnapshot>,
  trainingMaxLookup: Map<string, CurrentTrainingMaxSnapshot>,
) {
  const seen = new Set<string>()
  const lifts: ResolvedProgressionLift[] = []

  for (const day of config.days) {
    for (const block of day.exercise_blocks) {
      if (block.role !== 'primary') {
        continue
      }

      const resolvedName = block.exercise_id ? exerciseNameById.get(block.exercise_id) : null
      const lookupKeys = block.exercise_key
        ? getExerciseLookupKeys(block.exercise_key)
        : resolvedName
          ? getExerciseLookupKeys(resolvedName)
          : []
      const trainingMax = block.exercise_id
        ? trainingMaxById.get(block.exercise_id) ?? lookupKeys.map((key) => trainingMaxLookup.get(key)).find(Boolean)
        : lookupKeys.map((key) => trainingMaxLookup.get(key)).find(Boolean)

      if (!trainingMax) {
        continue
      }

      const exerciseId = block.exercise_id ?? trainingMax.exercise_id
      const exerciseName = trainingMax.exercises?.name ?? resolvedName ?? exerciseNameById.get(exerciseId) ?? block.exercise_key ?? 'Primary lift'
      const exerciseKey = block.exercise_key ?? lookupKeys[0] ?? getExerciseLookupKeys(exerciseName)[0] ?? String(exerciseId)
      const dedupeKey = `id:${exerciseId}`

      if (seen.has(dedupeKey)) {
        continue
      }

      seen.add(dedupeKey)
      lifts.push({
        exerciseId,
        exerciseKey,
        exerciseName,
        currentTmLbs: Number(trainingMax.weight_lbs),
      })
    }
  }

  return lifts
}

function isCompleteCycleResult(value: unknown): value is CompleteCycleResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const result = value as Record<string, unknown>
  return (
    typeof result.completed_cycle_id === 'number'
    && typeof result.new_cycle_id === 'number'
    && typeof result.new_cycle_number === 'number'
  )
}

export function buildCycleCompletionPreview({
  cycleWorkouts,
  exercises,
  program,
  trainingMaxes,
}: BuildCycleCompletionPreviewArgs): CycleProgressionPreviewRow[] {
  if (!program) {
    return []
  }

  const resolvedProgram = resolveWorkoutProgram(program)
  const template = resolvedProgram.template
  if (!template) {
    return []
  }

  const rawConfig = program.config ?? null
  const customConfig = rawConfig && isCustomProgramConfig(rawConfig) ? rawConfig : null
  const exerciseNameById = buildExerciseNameById(exercises)
  const trainingMaxLookup = buildTrainingMaxLookup(trainingMaxes)
  const trainingMaxById = buildTrainingMaxById(trainingMaxes)
  const lifts = customConfig
    ? resolveCustomLifts(customConfig, exerciseNameById, trainingMaxById, trainingMaxLookup)
    : resolveBuiltInLifts(exerciseNameById, template.required_exercises, template.key, trainingMaxLookup)

  return lifts.map((lift) => {
    const baseIncrementLbs = resolvedProgram.isCustom
      ? resolveCustomBaseIncrement(template.progression, lift.exerciseKey)
      : getProgressionIncrements(template, lift.exerciseKey).upper
    const preview = resolvePreviewIncrement(template.progression, baseIncrementLbs, cycleWorkouts, lift)
    const nextTmLbs = Math.max(0, lift.currentTmLbs + preview.incrementLbs)
    const incrementLbs = nextTmLbs - lift.currentTmLbs

    return {
      exerciseId: lift.exerciseId,
      exerciseKey: lift.exerciseKey,
      exerciseName: lift.exerciseName,
      currentTmLbs: lift.currentTmLbs,
      incrementLbs,
      newTmLbs: nextTmLbs,
      reason: preview.reason,
    }
  })
}

export function buildCycleProgressionPayload(rows: CycleProgressionPreviewRow[]): CycleProgressionPayloadRow[] {
  return rows.map((row) => ({
    exercise_id: row.exerciseId,
    increment_lbs: row.incrementLbs,
  }))
}

export function useCycleCompletionPreview(program: TrainingProgram | null | undefined) {
  const { data: exercises, isLoading: isExercisesLoading } = useExercises()
  const { data: trainingMaxes, isLoading: isTrainingMaxesLoading } = useCurrentTrainingMaxes()
  const { data: activeCycle, isLoading: isActiveCycleLoading } = useActiveCycle(program?.id)
  const { data: cycleWorkouts, isLoading: isCycleWorkoutsLoading } = useCycleWorkouts(activeCycle?.id)

  const previewRows = useMemo(
    () => buildCycleCompletionPreview({
      cycleWorkouts,
      exercises,
      program,
      trainingMaxes: trainingMaxes as CurrentTrainingMaxSnapshot[] | undefined,
    }),
    [cycleWorkouts, exercises, program, trainingMaxes],
  )

  return {
    activeCycle,
    previewRows,
    isLoading: isExercisesLoading || isTrainingMaxesLoading || isActiveCycleLoading || isCycleWorkoutsLoading,
  }
}

export function useCompleteCycle() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['cycles', 'complete'],
    networkMode: 'online',
    mutationFn: async ({ cycleId, progression }: CompleteCycleInput) => {
      const { data, error } = await supabase.rpc('complete_cycle', {
        p_cycle_id: cycleId,
        p_progression: progression as unknown as Database['public']['Functions']['complete_cycle']['Args']['p_progression'],
      })

      if (error) {
        throw error
      }

      if (!isCompleteCycleResult(data)) {
        throw new Error('Cycle completion returned an unexpected payload.')
      }

      return data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cycles'] }),
        queryClient.invalidateQueries({ queryKey: ['workouts'] }),
        queryClient.invalidateQueries({ queryKey: ['workout-sets'] }),
        queryClient.invalidateQueries({ queryKey: ['programs'] }),
        queryClient.invalidateQueries({ queryKey: ['training-maxes'] }),
        queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() }),
      ])
    },
  })
}
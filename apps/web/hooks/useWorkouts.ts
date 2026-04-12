'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getTemplate } from '@/lib/constants/templates'
import { getExerciseLookupKeys } from '@/hooks/useExercises'
import { analyticsQueryKeys } from '@/hooks/useAnalytics'
import { dashboardQueryKeys } from '@/hooks/useDashboard'
import { useSupabase } from './useSupabase'
import type { TrainingProgram } from './usePrograms'
import type { Database, Json, Tables } from '@/types/database'
import { isCustomProgramConfig, type ProgramTemplate } from '@/types/template'

type AppSupabaseClient = SupabaseClient<Database>

export type ActiveCycle = Tables<'cycles'>
export type Workout = Tables<'workouts'>
export type WorkoutSet = Tables<'workout_sets'>

export type WorkoutSetWithExercise = WorkoutSet & {
  exercises: { name: string } | null
}

export type CycleWorkout = Workout & {
  workout_sets: WorkoutSet[] | null
}

export type HistoricalAmrapSet = Pick<WorkoutSet, 'reps_actual' | 'reps_prescribed' | 'set_order' | 'weight_lbs' | 'workout_id'>

const DEFAULT_ROUNDING_LBS = 5

export const workoutQueryKeys = {
  activeCycle: (programId: number | undefined) => ['cycles', 'active', programId] as const,
  cycle: (cycleId: number | undefined) => ['workouts', 'cycle', cycleId] as const,
  sets: (workoutId: number | undefined) => ['workout-sets', workoutId] as const,
  amrapHistory: (exerciseId: number | undefined) => ['workout-sets', 'amrap-history', exerciseId] as const,
}

export const workoutMutationKeys = {
  ensureWorkout: () => ['workouts', 'ensure'] as const,
  logSet: () => ['workout-set-upsert'] as const,
  completeWorkout: () => ['workout-complete'] as const,
}

interface ProgramConfig {
  variation_key?: string | null
  rounding?: number
  tm_percentage?: number
}

export interface EnsureWorkoutInput {
  cycleId: number
  userId: string
  primaryExerciseId: number
  weekNumber: number
  dayLabel: string
}

export interface LogSetInput {
  workoutId: number
  exerciseId: number
  exerciseName?: string
  userId: string
  setOrder: number
  setType: string
  weightLbs: number
  repsPrescribed: number
  repsPrescribedMax?: number
  repsActual: number | null
  isAmrap: boolean
  rpe?: number
  intensityType: string
}

export interface CompleteWorkoutInput {
  workoutId: number
  cycleId: number
  notes?: string
}

export interface ResolvedWorkoutProgram {
  isCustom: boolean
  rounding: number
  selectedVariationKeys: string[]
  template: ProgramTemplate | null
}

function parseProgramConfig(config: Json | null): ProgramConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {}
  return config as ProgramConfig
}

function dedupeStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

export function resolveWorkoutProgram(program: TrainingProgram | null | undefined): ResolvedWorkoutProgram {
  if (!program) {
    return {
      isCustom: false,
      rounding: DEFAULT_ROUNDING_LBS,
      selectedVariationKeys: [],
      template: null,
    }
  }

  const rawConfig = program.config ?? null

  if (rawConfig && isCustomProgramConfig(rawConfig)) {
    return {
      isCustom: true,
      rounding: rawConfig.rounding ?? DEFAULT_ROUNDING_LBS,
      selectedVariationKeys: [],
      template: {
        key: program.template_key,
        name: program.name,
        level: rawConfig.level ?? 'intermediate',
        description: program.name,
        days_per_week: rawConfig.days_per_week,
        cycle_length_weeks: rawConfig.cycle_length_weeks,
        uses_training_max: rawConfig.uses_training_max,
        default_tm_percentage: rawConfig.tm_percentage,
        required_exercises: dedupeStrings(
          rawConfig.days.flatMap((day) => day.exercise_blocks.map((block) => block.exercise_key)),
        ),
        days: rawConfig.days,
        progression: rawConfig.progression,
      },
    }
  }

  const config = parseProgramConfig(rawConfig)
  const template = getTemplate(program.template_key) ?? null

  return {
    isCustom: false,
    rounding: config.rounding ?? DEFAULT_ROUNDING_LBS,
    selectedVariationKeys: config.variation_key ? [config.variation_key] : [],
    template,
  }
}

export function buildTrainingMaxMap(
  trainingMaxes:
    | Array<{
        weight_lbs: number
        exercises?: { name: string } | null
      }>
    | undefined,
) {
  const lookup = new Map<string, number>()

  for (const trainingMax of trainingMaxes ?? []) {
    const exerciseName = trainingMax.exercises?.name
    if (!exerciseName) continue

    for (const key of getExerciseLookupKeys(exerciseName)) {
      if (!lookup.has(key)) {
        lookup.set(key, Number(trainingMax.weight_lbs))
      }
    }
  }

  return lookup
}

export async function fetchActiveCycle(supabase: AppSupabaseClient, programId: number) {
  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('program_id', programId)
    .is('completed_at', null)
    .order('cycle_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as ActiveCycle | null
}

export async function fetchCycleWorkouts(supabase: AppSupabaseClient, cycleId: number) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, workout_sets(*)')
    .eq('cycle_id', cycleId)
    .order('week_number')
    .order('scheduled_date')

  if (error) throw error
  return (data ?? []) as CycleWorkout[]
}

export async function fetchWorkoutSets(supabase: AppSupabaseClient, workoutId: number) {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*, exercises(name)')
    .eq('workout_id', workoutId)
    .order('set_order')

  if (error) throw error
  return (data ?? []) as WorkoutSetWithExercise[]
}

export async function fetchHistoricalAmrapSets(supabase: AppSupabaseClient, exerciseId: number) {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('workout_id, set_order, weight_lbs, reps_actual, reps_prescribed')
    .eq('exercise_id', exerciseId)
    .eq('is_amrap', true)
    .not('reps_actual', 'is', null)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as HistoricalAmrapSet[]
}

export async function ensureWorkoutMutation(supabase: AppSupabaseClient, input: EnsureWorkoutInput) {
  const { data: existing, error: existingError } = await supabase
    .from('workouts')
    .select('*')
    .eq('cycle_id', input.cycleId)
    .eq('week_number', input.weekNumber)
    .eq('day_label', input.dayLabel)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing as Workout

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      cycle_id: input.cycleId,
      user_id: input.userId,
      primary_exercise_id: input.primaryExerciseId,
      week_number: input.weekNumber,
      day_label: input.dayLabel,
      scheduled_date: new Date().toISOString().split('T')[0],
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return data as Workout
}

export async function logSetMutation(supabase: AppSupabaseClient, input: LogSetInput) {
  if (!Number.isInteger(input.repsPrescribed) || input.repsPrescribed <= 0) {
    throw new Error('Prescribed reps must be a whole number.')
  }

  if (input.repsPrescribedMax !== undefined && input.repsPrescribedMax !== null) {
    if (!Number.isInteger(input.repsPrescribedMax) || input.repsPrescribedMax < input.repsPrescribed) {
      throw new Error('Prescribed rep ranges must use whole numbers.')
    }
  }

  if (input.repsActual !== null && (!Number.isInteger(input.repsActual) || input.repsActual <= 0)) {
    throw new Error('Logged reps must be a whole number.')
  }

  const { data, error } = await supabase
    .from('workout_sets')
    .upsert(
      {
        workout_id: input.workoutId,
        exercise_id: input.exerciseId,
        user_id: input.userId,
        set_order: input.setOrder,
        set_type: input.setType,
        weight_lbs: input.weightLbs,
        reps_prescribed: input.repsPrescribed,
        reps_prescribed_max: input.repsPrescribedMax ?? null,
        reps_actual: input.repsActual,
        is_amrap: input.isAmrap,
        rpe: input.rpe ?? null,
        intensity_type: input.intensityType,
        logged_at: input.repsActual !== null ? new Date().toISOString() : null,
      },
      { onConflict: 'workout_id,set_order' },
    )
    .select('*')
    .single()

  if (error) throw error
  return data as WorkoutSet
}

export async function completeWorkoutMutation(supabase: AppSupabaseClient, input: CompleteWorkoutInput) {
  const { data, error } = await supabase
    .from('workouts')
    .update({
      completed_at: new Date().toISOString(),
      notes: input.notes ?? null,
    })
    .eq('id', input.workoutId)
    .select('*')
    .single()

  if (error) throw error
  return data as Workout
}

function upsertOptimisticWorkoutSet(current: WorkoutSetWithExercise[] | undefined, optimisticSet: WorkoutSetWithExercise) {
  return [...(current ?? []).filter((set) => set.set_order !== optimisticSet.set_order), optimisticSet].sort(
    (left, right) => left.set_order - right.set_order,
  )
}

export function useActiveCycle(programId: number | undefined) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: workoutQueryKeys.activeCycle(programId),
    queryFn: async () => fetchActiveCycle(supabase, programId!),
    enabled: !!programId,
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
  })
}

export function useCycleWorkouts(cycleId: number | undefined) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: workoutQueryKeys.cycle(cycleId),
    queryFn: async () => fetchCycleWorkouts(supabase, cycleId!),
    enabled: !!cycleId,
    staleTime: 2 * 60 * 1000,
    gcTime: Infinity,
  })
}

export function useWorkoutSets(workoutId: number | undefined) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: workoutQueryKeys.sets(workoutId),
    queryFn: async () => fetchWorkoutSets(supabase, workoutId!),
    enabled: !!workoutId,
    staleTime: 30 * 1000,
    gcTime: Infinity,
  })
}

export function useHistoricalAmrapSets(exerciseId: number | undefined) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: workoutQueryKeys.amrapHistory(exerciseId),
    queryFn: async () => fetchHistoricalAmrapSets(supabase, exerciseId!),
    enabled: !!exerciseId,
    staleTime: 60 * 1000,
    gcTime: Infinity,
  })
}

export function useEnsureWorkout() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: workoutMutationKeys.ensureWorkout(),
    mutationFn: async (input: EnsureWorkoutInput) => ensureWorkoutMutation(supabase, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(variables.cycleId) })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useLogSet() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: workoutMutationKeys.logSet(),
    mutationFn: async (input: LogSetInput) => logSetMutation(supabase, input),
    onMutate: async (input) => {
      const queryKey = workoutQueryKeys.sets(input.workoutId)
      const now = new Date().toISOString()

      await queryClient.cancelQueries({ queryKey })

      const previousSets = queryClient.getQueryData<WorkoutSetWithExercise[]>(queryKey)
      const existingSet = previousSets?.find((set) => set.set_order === input.setOrder)

      queryClient.setQueryData<WorkoutSetWithExercise[]>(queryKey, (current) =>
        upsertOptimisticWorkoutSet(current, {
          id: existingSet?.id ?? -input.setOrder,
          workout_id: input.workoutId,
          exercise_id: input.exerciseId,
          user_id: input.userId,
          set_order: input.setOrder,
          set_type: input.setType,
          weight_lbs: input.weightLbs,
          reps_prescribed: input.repsPrescribed,
          reps_prescribed_max: input.repsPrescribedMax ?? null,
          reps_actual: input.repsActual,
          is_amrap: input.isAmrap,
          rpe: input.rpe ?? null,
          intensity_type: input.intensityType,
          logged_at: input.repsActual !== null ? now : null,
          updated_at: now,
          exercises: input.exerciseName
            ? { name: input.exerciseName }
            : existingSet?.exercises ?? null,
        }),
      )

      return { previousSets }
    },
    onError: (_error, input, context) => {
      if (context?.previousSets) {
        queryClient.setQueryData(workoutQueryKeys.sets(input.workoutId), context.previousSets)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(variables.workoutId) })
      if (variables.isAmrap) {
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.amrapHistory(variables.exerciseId) })
      }
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useCompleteWorkout() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: workoutMutationKeys.completeWorkout(),
    mutationFn: async (input: CompleteWorkoutInput) => completeWorkoutMutation(supabase, input),
    onMutate: async (input) => {
      const queryKey = workoutQueryKeys.cycle(input.cycleId)
      const now = new Date().toISOString()

      await queryClient.cancelQueries({ queryKey })

      const previousWorkouts = queryClient.getQueryData<CycleWorkout[]>(queryKey)

      queryClient.setQueryData<CycleWorkout[]>(queryKey, (current) =>
        (current ?? []).map((workout) =>
          workout.id === input.workoutId
            ? {
                ...workout,
                completed_at: now,
                notes: input.notes ?? null,
              }
            : workout,
        ),
      )

      return { previousWorkouts }
    },
    onError: (_error, input, context) => {
      if (context?.previousWorkouts) {
        queryClient.setQueryData(workoutQueryKeys.cycle(input.cycleId), context.previousWorkouts)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(variables.cycleId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(variables.workoutId) })
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}
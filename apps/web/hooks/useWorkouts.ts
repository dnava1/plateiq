'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getTemplate } from '@/lib/constants/templates'
import { isValidRpe } from '@/lib/effort'
import {
  buildExerciseContextById,
  type ExerciseContextById,
  type ExerciseContextTargetById,
  type ExerciseHistoryRow,
} from '@/lib/workout-exercise-context'
import { getExerciseLookupKeys } from '@/hooks/useExercises'
import { analyticsQueryKeys } from '@/hooks/useAnalytics'
import { dashboardQueryKeys } from '@/hooks/useDashboard'
import { normalizeEditableProgramConfig } from '@/lib/programs/editable'
import { isWeightRoundingLbs, resolveWeightRoundingLbs } from '@/lib/utils'
import { collectProgramExerciseKeys } from '@/lib/programs/week'
import {
  createOfflineWorkoutOutboxEntry,
  clearActiveWorkoutSnapshot,
  getOfflineWorkoutOutboxEntryId,
  markOfflineWorkoutPackWorkoutCompleted,
  markOfflineWorkoutOutboxEntryFailed,
  markOfflineWorkoutOutboxEntrySynced,
  upsertOfflineWorkoutOutboxEntry,
} from '@/lib/offline-workout-store'
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
  exerciseHistoryRoot: () => ['workout-sets', 'recent-history'] as const,
  exerciseHistory: (userId: string | undefined, workoutId: number | undefined, exerciseIds: readonly number[]) =>
    [...workoutQueryKeys.exerciseHistoryRoot(), userId ?? null, workoutId ?? null, ...exerciseIds] as const,
}

export const workoutMutationKeys = {
  ensureWorkout: () => ['workouts', 'ensure'] as const,
  seedWorkoutSets: () => ['workout-sets', 'seed'] as const,
  logSet: () => ['workout-set-upsert'] as const,
  updateWorkoutBlockPrescription: () => ['workout-set-prescription', 'update'] as const,
  completeWorkout: () => ['workout-complete'] as const,
}

export function queueWorkoutOutboxEntry(
  userId: string | undefined,
  input: Parameters<typeof createOfflineWorkoutOutboxEntry>[0],
) {
  if (!userId) {
    return
  }

  const entry = createOfflineWorkoutOutboxEntry(input)
  void upsertOfflineWorkoutOutboxEntry(userId, entry).catch(() => undefined)
}

export function markWorkoutOutboxSynced(userId: string | undefined, entryId: string) {
  if (!userId) {
    return
  }

  void markOfflineWorkoutOutboxEntrySynced(userId, entryId).catch(() => undefined)
}

export function markWorkoutOutboxFailed(userId: string | undefined, entryId: string, error: unknown) {
  if (!userId) {
    return
  }

  void markOfflineWorkoutOutboxEntryFailed(userId, entryId, error).catch(() => undefined)
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
  actualRpe?: number | null
  intensityType: string
  prescribedWeightLbs?: number | null
  prescribedIntensity?: number | null
  prescriptionBaseWeightLbs?: number | null
}

export interface SeedWorkoutSetsInput {
  cycleId: number
  workoutId: number
  userId: string
  sets: Array<{
    exerciseId: number
    intensityType: string
    isAmrap: boolean
    prescribedRpe?: number | null
    prescribedIntensity?: number | null
    prescribedWeightLbs: number
    prescriptionBaseWeightLbs?: number | null
    repsPrescribed: number
    repsPrescribedMax?: number | null
    setOrder: number
    setType: string
    weightLbs: number
  }>
}

export interface UpdateWorkoutBlockPrescriptionInput {
  cycleId: number
  workoutId: number
  userId: string
  updates: Array<{
    prescribedIntensity: number
    prescribedWeightLbs: number
    prescriptionBaseWeightLbs?: number | null
    setOrder: number
  }>
}

export interface CompleteWorkoutInput {
  workoutId: number
  cycleId: number
  userId?: string
}

export interface ResolvedWorkoutProgram {
  isCustom: boolean
  rounding: number
  selectedVariationKeys: string[]
  template: ProgramTemplate | null
}

type WorkoutProgramSnapshot = Pick<Tables<'cycles'>, 'config' | 'template_key'>

function parseProgramConfig(config: Json | null): ProgramConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {}
  return config as ProgramConfig
}

function dedupeStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function isBrowserOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

function getUniqueSortedExerciseIds(exerciseIds: Array<number | null | undefined> | readonly number[]) {
  return Array.from(
    new Set(
      exerciseIds.filter((exerciseId): exerciseId is number => Number.isInteger(exerciseId)),
    ),
  ).sort((left, right) => left - right)
}

export function resolveWorkoutProgram(
  program: TrainingProgram | null | undefined,
  preferredRounding?: number | null,
  cycleSnapshot?: WorkoutProgramSnapshot | null,
): ResolvedWorkoutProgram {
  if (!program) {
    return {
      isCustom: false,
      rounding: DEFAULT_ROUNDING_LBS,
      selectedVariationKeys: [],
      template: null,
    }
  }

  const templateKey = cycleSnapshot?.template_key ?? program.template_key
  const rawConfig = cycleSnapshot?.config ?? program.config ?? null
  const resolvedPreferenceRounding = isWeightRoundingLbs(preferredRounding)
    ? preferredRounding
    : undefined

  if (rawConfig && isCustomProgramConfig(rawConfig)) {
    const normalizedConfig = normalizeEditableProgramConfig(rawConfig, templateKey)
    const rounding = resolvedPreferenceRounding ?? DEFAULT_ROUNDING_LBS

    return {
      isCustom: true,
      rounding,
      selectedVariationKeys: [],
      template: {
        key: templateKey,
        name: program.name,
        level: normalizedConfig.level ?? 'intermediate',
        description: program.name,
        days_per_week: normalizedConfig.days_per_week,
        cycle_length_weeks: normalizedConfig.cycle_length_weeks,
        uses_training_max: normalizedConfig.uses_training_max,
        default_tm_percentage: normalizedConfig.tm_percentage,
        required_exercises: dedupeStrings(collectProgramExerciseKeys(normalizedConfig)),
        days: normalizedConfig.days,
        week_schemes: normalizedConfig.week_schemes,
        progression: normalizedConfig.progression,
      },
    }
  }

  const config = parseProgramConfig(rawConfig)
  const template = getTemplate(templateKey) ?? null
  const rounding = resolvedPreferenceRounding ?? resolveWeightRoundingLbs(config.rounding)

  return {
    isCustom: false,
    rounding,
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

export async function fetchRecentExerciseHistory(
  supabase: AppSupabaseClient,
  userId: string,
  workoutId: number,
  exerciseIds: readonly number[],
) {
  if (!exerciseIds.length) {
    return [] as ExerciseHistoryRow[]
  }

  const historyWindowSize = Math.max(24, exerciseIds.length * 12)
  const { data, error } = await supabase
    .from('workout_sets')
    .select('exercise_id, workout_id, set_order, weight_lbs, reps_actual, reps_prescribed, reps_prescribed_max, is_amrap, logged_at, workouts!inner(completed_at, day_label, scheduled_date, week_number)')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .neq('workout_id', workoutId)
    .not('reps_actual', 'is', null)
    .not('logged_at', 'is', null)
    .not('workouts.completed_at', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(historyWindowSize)

  if (error) throw error
  return (data ?? []) as ExerciseHistoryRow[]
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

export async function seedWorkoutSetsMutation(supabase: AppSupabaseClient, input: SeedWorkoutSetsInput) {
  if (!input.sets.length) {
    return [] as WorkoutSetWithExercise[]
  }

  const insertedSets: WorkoutSetWithExercise[] = []

  for (const set of input.sets) {
    const { data, error } = await supabase
      .from('workout_sets')
      .insert({
        workout_id: input.workoutId,
        exercise_id: set.exerciseId,
        user_id: input.userId,
        set_order: set.setOrder,
        set_type: set.setType,
        weight_lbs: set.weightLbs,
        prescribed_weight_lbs: set.prescribedWeightLbs,
        prescribed_intensity: set.prescribedIntensity ?? null,
        prescription_base_weight_lbs: set.prescriptionBaseWeightLbs ?? null,
        reps_prescribed: set.repsPrescribed,
        reps_prescribed_max: set.repsPrescribedMax ?? null,
        reps_actual: null,
        is_amrap: set.isAmrap,
        rpe: set.prescribedRpe ?? null,
        intensity_type: set.intensityType,
        logged_at: null,
      })
      .select('*, exercises(name)')
      .single()

    if (error) {
      if (error.code === '23505') {
        continue
      }

      throw error
    }

    insertedSets.push(data as WorkoutSetWithExercise)
  }

  return insertedSets
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

  if (input.actualRpe !== undefined && input.actualRpe !== null && !isValidRpe(input.actualRpe)) {
    throw new Error('Logged effort must be a valid RPE between 1 and 10.')
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
        prescribed_weight_lbs: input.prescribedWeightLbs ?? null,
        prescribed_intensity: input.prescribedIntensity ?? null,
        prescription_base_weight_lbs: input.prescriptionBaseWeightLbs ?? null,
        reps_prescribed: input.repsPrescribed,
        reps_prescribed_max: input.repsPrescribedMax ?? null,
        reps_actual: input.repsActual,
        is_amrap: input.isAmrap,
        rpe: input.actualRpe ?? null,
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

export async function updateWorkoutBlockPrescriptionMutation(
  supabase: AppSupabaseClient,
  input: UpdateWorkoutBlockPrescriptionInput,
) {
  if (!input.updates.length) {
    return [] as WorkoutSetWithExercise[]
  }

  const updatedSets = await Promise.all(
    input.updates.map(async (update) => {
      const { data, error } = await supabase
        .from('workout_sets')
        .update({
          prescribed_weight_lbs: update.prescribedWeightLbs,
          prescribed_intensity: update.prescribedIntensity,
          prescription_base_weight_lbs: update.prescriptionBaseWeightLbs ?? null,
          weight_lbs: update.prescribedWeightLbs,
        })
        .eq('workout_id', input.workoutId)
        .eq('user_id', input.userId)
        .eq('set_order', update.setOrder)
        .is('reps_actual', null)
        .select('*, exercises(name)')
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('One or more sets were already logged before this workout update finished.')
      }

      return data as WorkoutSetWithExercise
    }),
  )

  return updatedSets
}

export async function completeWorkoutMutation(supabase: AppSupabaseClient, input: CompleteWorkoutInput) {
  const { data, error } = await supabase
    .from('workouts')
    .update({
      completed_at: new Date().toISOString(),
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

export function useRecentExerciseHistory(
  workoutId: number | undefined,
  exerciseIds: readonly number[],
  userId: string | undefined,
) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: workoutQueryKeys.exerciseHistory(userId, workoutId, exerciseIds),
    queryFn: async () => fetchRecentExerciseHistory(supabase, userId!, workoutId!, exerciseIds),
    enabled: Boolean(userId && workoutId && exerciseIds.length > 0),
    staleTime: 60 * 1000,
    gcTime: Infinity,
  })
}

export function useWorkoutExerciseContext(
  workoutId: number | undefined,
  exerciseIds: Array<number | null | undefined>,
  userId: string | undefined,
  targetsByExercise: ExerciseContextTargetById = {},
) {
  const normalizedExerciseIds = useMemo(
    () => getUniqueSortedExerciseIds(exerciseIds),
    [exerciseIds],
  )
  const historyQuery = useRecentExerciseHistory(workoutId, normalizedExerciseIds, userId)
  const data = useMemo<ExerciseContextById>(
    () => buildExerciseContextById(normalizedExerciseIds, historyQuery.data ?? [], targetsByExercise),
    [historyQuery.data, normalizedExerciseIds, targetsByExercise],
  )

  return {
    data,
    error: historyQuery.error ?? null,
    isError: historyQuery.isError,
    isFetching: historyQuery.isFetching,
    isLoading: historyQuery.isLoading,
  }
}

export function useEnsureWorkout() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: workoutMutationKeys.ensureWorkout(),
    mutationFn: async (input: EnsureWorkoutInput) => ensureWorkoutMutation(supabase, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(variables.cycleId) })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useSeedWorkoutSets() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: workoutMutationKeys.seedWorkoutSets(),
    mutationFn: async (input: SeedWorkoutSetsInput) => seedWorkoutSetsMutation(supabase, input),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(variables.workoutId) })
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
      queueWorkoutOutboxEntry(input.userId, {
        kind: 'set-log',
        setOrder: input.setOrder,
        variables: input,
        workoutId: input.workoutId,
      })

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
          prescribed_weight_lbs: input.prescribedWeightLbs ?? existingSet?.prescribed_weight_lbs ?? null,
          prescribed_intensity: input.prescribedIntensity ?? existingSet?.prescribed_intensity ?? null,
          prescription_base_weight_lbs: input.prescriptionBaseWeightLbs ?? existingSet?.prescription_base_weight_lbs ?? null,
          reps_prescribed: input.repsPrescribed,
          reps_prescribed_max: input.repsPrescribedMax ?? null,
          reps_actual: input.repsActual,
          is_amrap: input.isAmrap,
          rpe: input.actualRpe ?? null,
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
    onSuccess: (_data, input) => {
      markWorkoutOutboxSynced(
        input.userId,
        getOfflineWorkoutOutboxEntryId('set-log', input.workoutId, input.setOrder),
      )
    },
    onError: (error, input, context) => {
      if (isBrowserOffline()) {
        return
      }

      markWorkoutOutboxFailed(
        input.userId,
        getOfflineWorkoutOutboxEntryId('set-log', input.workoutId, input.setOrder),
        error,
      )
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

export function useUpdateWorkoutBlockPrescription() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: workoutMutationKeys.updateWorkoutBlockPrescription(),
    mutationFn: async (input: UpdateWorkoutBlockPrescriptionInput) => updateWorkoutBlockPrescriptionMutation(supabase, input),
    onMutate: async (input) => {
      const queryKey = workoutQueryKeys.sets(input.workoutId)
      queueWorkoutOutboxEntry(input.userId, {
        kind: 'prescription-update',
        variables: input,
        workoutId: input.workoutId,
      })

      await queryClient.cancelQueries({ queryKey })

      const previousSets = queryClient.getQueryData<WorkoutSetWithExercise[]>(queryKey)

      queryClient.setQueryData<WorkoutSetWithExercise[]>(queryKey, (current) =>
        (current ?? []).map((set) => {
          const update = input.updates.find((entry) => entry.setOrder === set.set_order)
          if (!update || set.reps_actual !== null) {
            return set
          }

          return {
            ...set,
            prescribed_weight_lbs: update.prescribedWeightLbs,
            prescribed_intensity: update.prescribedIntensity,
            prescription_base_weight_lbs: update.prescriptionBaseWeightLbs ?? null,
            weight_lbs: update.prescribedWeightLbs,
          }
        }),
      )

      return { previousSets }
    },
    onSuccess: (_data, input) => {
      markWorkoutOutboxSynced(
        input.userId,
        getOfflineWorkoutOutboxEntryId('prescription-update', input.workoutId),
      )
    },
    onError: (error, input, context) => {
      if (isBrowserOffline()) {
        return
      }

      markWorkoutOutboxFailed(
        input.userId,
        getOfflineWorkoutOutboxEntryId('prescription-update', input.workoutId),
        error,
      )
      if (context?.previousSets) {
        queryClient.setQueryData(workoutQueryKeys.sets(input.workoutId), context.previousSets)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(variables.workoutId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(variables.cycleId) })
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
      queueWorkoutOutboxEntry(input.userId, {
        kind: 'workout-complete',
        variables: input,
        workoutId: input.workoutId,
      })

      await queryClient.cancelQueries({ queryKey })

      const previousWorkouts = queryClient.getQueryData<CycleWorkout[]>(queryKey)

      queryClient.setQueryData<CycleWorkout[]>(queryKey, (current) =>
        (current ?? []).map((workout) =>
          workout.id === input.workoutId
            ? {
                ...workout,
                completed_at: now,
              }
            : workout,
        ),
      )

      return { previousWorkouts }
    },
    onSuccess: (_data, input) => {
      markWorkoutOutboxSynced(
        input.userId,
        getOfflineWorkoutOutboxEntryId('workout-complete', input.workoutId),
      )
      if (input.userId) {
        void Promise.all([
          clearActiveWorkoutSnapshot(input.userId),
          markOfflineWorkoutPackWorkoutCompleted(input.userId, input.workoutId),
        ]).catch(() => undefined)
      }
    },
    onError: (error, input, context) => {
      if (isBrowserOffline()) {
        return
      }

      markWorkoutOutboxFailed(
        input.userId,
        getOfflineWorkoutOutboxEntryId('workout-complete', input.workoutId),
        error,
      )
      if (context?.previousWorkouts) {
        queryClient.setQueryData(workoutQueryKeys.cycle(input.cycleId), context.previousWorkouts)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(variables.cycleId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(variables.workoutId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.exerciseHistoryRoot() })
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

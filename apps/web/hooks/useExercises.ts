'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import { analyticsQueryKeys } from './useAnalytics'
import { dashboardQueryKeys } from './useDashboard'
import { formatExerciseKey } from '@/lib/utils'
import type { CreateExerciseInput } from '@/lib/validations/exercise'
import type { Tables } from '@/types/database'

export type Exercise = Tables<'exercises'>

type StrengthLiftSlug = NonNullable<Exercise['strength_lift_slug']>

const EXERCISE_KEY_ALIASES: Record<string, string[]> = {
  ab_work: ['ab wheel rollout'],
  bench: ['bench press'],
  close_grip_bench: ['close-grip bench press'],
  curl: ['dumbbell curl'],
  db_row: ['dumbbell row'],
  delt_raise: ['lateral raise'],
  incline_bench: ['incline bench press'],
  ohp: ['overhead press'],
  rdl: ['romanian deadlift'],
  row: ['barbell row'],
}

const STRENGTH_LIFT_SLUG_BY_LOOKUP_KEY: Record<string, StrengthLiftSlug> = {
  back_squat: 'back_squat',
  barbell_row: 'pendlay_row',
  bench: 'bench_press',
  bench_press: 'bench_press',
  box_squat: 'back_squat',
  chin_up: 'chin_up',
  deadlift: 'deadlift',
  dip: 'dip',
  good_morning: 'deadlift',
  front_squat: 'front_squat',
  incline_bench: 'incline_bench_press',
  incline_bench_press: 'incline_bench_press',
  ohp: 'overhead_press',
  overhead_press: 'overhead_press',
  pendlay_row: 'pendlay_row',
  power_clean: 'power_clean',
  pull_up: 'pull_up',
  push_press: 'push_press',
  row: 'pendlay_row',
  snatch_press: 'snatch_press',
  squat: 'back_squat',
  sumo_deadlift: 'sumo_deadlift',
}

const EXACT_EXERCISE_KEY_PREFIX = 'exact:'
const LOOKUP_EXERCISE_KEY_PREFIX = 'lookup:'

function normalizeExerciseLookupKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function getExerciseLookupKeys(value: string) {
  const normalized = normalizeExerciseLookupKey(value)
  const lookups = new Set<string>([normalized])

  if (normalized.endsWith('_press')) {
    lookups.add(normalized.replace(/_press$/, ''))
  }

  for (const [key, aliases] of Object.entries(EXERCISE_KEY_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeExerciseLookupKey)
    if (key === normalized || normalizedAliases.includes(normalized)) {
      lookups.add(key)
    }
  }

  return Array.from(lookups)
}

export function resolveStrengthLiftSlug(value: string) {
  for (const key of getExerciseLookupKeys(value)) {
    const liftSlug = STRENGTH_LIFT_SLUG_BY_LOOKUP_KEY[key]

    if (liftSlug) {
      return liftSlug
    }
  }

  return null
}

export function buildExerciseKeyMap(exercises: Exercise[] | undefined) {
  const lookup = new Map<string, number | null>()

  for (const exercise of exercises ?? []) {
    const exactKey = normalizeExerciseLookupKey(exercise.name)
    const exactLookupKey = `${EXACT_EXERCISE_KEY_PREFIX}${exactKey}`

    if (!lookup.has(exactLookupKey)) {
      lookup.set(exactLookupKey, exercise.id)
      continue
    }

    if (lookup.get(exactLookupKey) !== exercise.id) {
      lookup.set(exactLookupKey, null)
    }
  }

  const prioritizedExercises = [
    ...(exercises ?? []).filter((exercise) => exercise.created_by_user_id === null),
    ...(exercises ?? []).filter((exercise) => exercise.created_by_user_id !== null),
  ]

  for (const exercise of prioritizedExercises) {
    const exactKey = normalizeExerciseLookupKey(exercise.name)

    for (const key of getExerciseLookupKeys(exercise.name)) {
      if (key === exactKey) {
        continue
      }

      const lookupKey = `${LOOKUP_EXERCISE_KEY_PREFIX}${key}`

      if (!lookup.has(lookupKey)) {
        lookup.set(lookupKey, exercise.id)
      }
    }
  }

  return lookup
}

export function resolveExerciseIdFromMap(exerciseKeyMap: Map<string, number | null>, exerciseKey?: string | null) {
  if (!exerciseKey) return undefined

  const normalizedExerciseKey = normalizeExerciseLookupKey(exerciseKey)
  const exactExerciseId = exerciseKeyMap.get(`${EXACT_EXERCISE_KEY_PREFIX}${normalizedExerciseKey}`)

  if (exactExerciseId === null) {
    return undefined
  }

  if (typeof exactExerciseId === 'number') {
    return exactExerciseId
  }

  for (const key of getExerciseLookupKeys(exerciseKey)) {
    const exerciseId = exerciseKeyMap.get(`${LOOKUP_EXERCISE_KEY_PREFIX}${key}`)
    if (typeof exerciseId === 'number') return exerciseId
  }

  return undefined
}

function exerciseMatchesLookupKeys(exercise: Exercise, lookupKeys: Set<string>) {
  for (const key of getExerciseLookupKeys(exercise.name)) {
    if (lookupKeys.has(key)) {
      return true
    }
  }

  return false
}

export function matchesExerciseSearch(exercise: Exercise, query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (normalizedQuery.length === 0) {
    return true
  }

  if (exercise.name.toLowerCase().includes(normalizedQuery)) {
    return true
  }

  return exerciseMatchesLookupKeys(exercise, new Set(getExerciseLookupKeys(query)))
}

interface ResolveExerciseOptions {
  exerciseId?: number | null
  exerciseKey?: string | null
}

export function resolveExerciseFromList(exercises: Exercise[] | undefined, options: ResolveExerciseOptions) {
  const { exerciseId, exerciseKey } = options

  if (typeof exerciseId === 'number') {
    const exerciseById = exercises?.find((exercise) => exercise.id === exerciseId)

    if (exerciseById) {
      return exerciseById
    }

    return undefined
  }

  if (!exerciseKey) {
    return undefined
  }

  const lookupKeys = new Set(getExerciseLookupKeys(exerciseKey))
  const normalizedExerciseKey = exerciseKey.trim().toLowerCase()
  const exactNameMatches = exercises?.filter((exercise) => exercise.name.trim().toLowerCase() === normalizedExerciseKey) ?? []

  if (exactNameMatches.length > 1) {
    return undefined
  }

  return exactNameMatches[0]
    ?? exercises?.find((exercise) => exercise.created_by_user_id === null && exerciseMatchesLookupKeys(exercise, lookupKeys))
    ?? exercises?.find((exercise) => exercise.created_by_user_id !== null && exerciseMatchesLookupKeys(exercise, lookupKeys))
}

export function resolveExerciseDisplayName(exercises: Exercise[] | undefined, options: ResolveExerciseOptions) {
  const resolvedExercise = resolveExerciseFromList(exercises, options)

  if (resolvedExercise) {
    return resolvedExercise.name
  }

  if (options.exerciseKey) {
    const trimmedExerciseKey = options.exerciseKey.trim()

    if (trimmedExerciseKey.length === 0) {
      return undefined
    }

    if (/[\s-]/.test(trimmedExerciseKey) || /[A-Z]/.test(trimmedExerciseKey)) {
      return trimmedExerciseKey
    }

    return formatExerciseKey(trimmedExerciseKey)
  }

  return undefined
}

function upsertExercise(current: Exercise[] | undefined, exercise: Exercise) {
  const next = [...(current ?? []).filter((item) => item.id !== exercise.id), exercise]
  return next.sort((left, right) => left.name.localeCompare(right.name))
}

function removeExercise(current: Exercise[] | undefined, exerciseId: number) {
  return [...(current ?? []).filter((item) => item.id !== exerciseId)]
    .sort((left, right) => left.name.localeCompare(right.name))
}

function buildExerciseCompatibilityFields(exercise: CreateExerciseInput) {
  return {
    is_main_lift: exercise.category === 'main' && exercise.analytics_track === 'standard',
    strength_lift_slug: exercise.analytics_track === 'standard' ? resolveStrengthLiftSlug(exercise.name) : null,
  }
}

function syncExerciseQueryCaches(queryClient: ReturnType<typeof useQueryClient>, exercise: Exercise) {
  for (const [queryKey, current] of queryClient.getQueriesData<Exercise[]>({ queryKey: ['exercises'] })) {
    if (!Array.isArray(current)) {
      continue
    }

    const categoryFilter = typeof queryKey[1] === 'string' ? queryKey[1] : undefined

    if (categoryFilter && categoryFilter !== exercise.category) {
      queryClient.setQueryData<Exercise[]>(queryKey, removeExercise(current, exercise.id))
      continue
    }

    queryClient.setQueryData<Exercise[]>(queryKey, upsertExercise(current, exercise))
  }

  queryClient.setQueryData<Exercise[]>(['exercises'], (current) => upsertExercise(current, exercise))
  queryClient.setQueryData<Exercise[]>(['exercises', exercise.category], (current) => upsertExercise(current, exercise))
}

export function useExercises(category?: string) {
  const supabase = useSupabase()
  return useQuery({
    queryKey: ['exercises', category],
    queryFn: async () => {
      let query = supabase.from('exercises').select('*').order('name')
      if (category) query = query.eq('category', category)
      const { data, error } = await query
      if (error) throw error
      return data as Exercise[]
    },
    staleTime: 30 * 60 * 1000,
  })
}

export function useExerciseKeyMap() {
  const { data } = useExercises()

  return useMemo(() => buildExerciseKeyMap(data), [data])
}

export function useCreateExercise() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (exercise: CreateExerciseInput) => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You must be signed in to create an exercise.')
      }

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          ...exercise,
          created_by_user_id: user.id,
          ...buildExerciseCompatibilityFields(exercise),
        })
        .select()
        .single()
      if (error) throw error

      return data as Exercise
    },
    onSuccess: (exercise) => {
      syncExerciseQueryCaches(queryClient, exercise)
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      queryClient.invalidateQueries({ queryKey: ['training-maxes'] })
    },
  })
}

export function useUpdateExercise() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ exerciseId, exercise }: { exerciseId: number; exercise: CreateExerciseInput }) => {
      const compatibilityFields = buildExerciseCompatibilityFields(exercise)
      const { data, error } = await supabase.rpc('update_exercise_definition', {
        p_exercise_id: exerciseId,
        p_name: exercise.name,
        p_category: exercise.category,
        p_movement_pattern: exercise.movement_pattern,
        p_analytics_track: exercise.analytics_track,
        p_is_main_lift: compatibilityFields.is_main_lift,
        p_strength_lift_slug: compatibilityFields.strength_lift_slug,
      })

      if (error) throw error

      return data as unknown as Exercise
    },
    onSuccess: (exercise) => {
      syncExerciseQueryCaches(queryClient, exercise)
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      queryClient.invalidateQueries({ queryKey: ['training-maxes'] })
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: ['cycles'] })
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: ['workout-sets'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
    },
  })
}

'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import type { CreateExerciseInput } from '@/lib/validations/exercise'
import type { Tables } from '@/types/database'

export type Exercise = Tables<'exercises'>

const EXERCISE_KEY_ALIASES: Record<string, string[]> = {
  bench: ['bench press'],
  close_grip_bench: ['close-grip bench press'],
  incline_bench: ['incline bench press'],
  ohp: ['overhead press'],
  rdl: ['romanian deadlift'],
}

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

export function buildExerciseKeyMap(exercises: Exercise[] | undefined) {
  const lookup = new Map<string, number>()

  for (const exercise of exercises ?? []) {
    for (const key of getExerciseLookupKeys(exercise.name)) {
      if (!lookup.has(key)) {
        lookup.set(key, exercise.id)
      }
    }
  }

  return lookup
}

export function resolveExerciseIdFromMap(exerciseKeyMap: Map<string, number>, exerciseKey?: string | null) {
  if (!exerciseKey) return undefined

  for (const key of getExerciseLookupKeys(exerciseKey)) {
    const exerciseId = exerciseKeyMap.get(key)
    if (exerciseId) return exerciseId
  }

  return undefined
}

function upsertExercise(current: Exercise[] | undefined, exercise: Exercise) {
  const next = [...(current ?? []).filter((item) => item.id !== exercise.id), exercise]
  return next.sort((left, right) => left.name.localeCompare(right.name))
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
          is_main_lift: exercise.category === 'main',
        })
        .select()
        .single()
      if (error) throw error

      return data as Exercise
    },
    onSuccess: (exercise) => {
      queryClient.setQueryData<Exercise[]>(['exercises'], (current) => upsertExercise(current, exercise))
      queryClient.setQueryData<Exercise[]>(['exercises', exercise.category], (current) => upsertExercise(current, exercise))
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}

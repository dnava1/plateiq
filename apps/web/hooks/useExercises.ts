'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import type { CreateExerciseInput } from '@/lib/validations/exercise'
import type { Tables } from '@/types/database'

type Exercise = Tables<'exercises'>

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

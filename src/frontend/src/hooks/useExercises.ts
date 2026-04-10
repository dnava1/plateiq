'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import type { CreateExerciseInput } from '@/lib/validations/exercise'
import type { Tables } from '@/types/database'

type Exercise = Tables<'exercises'>

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
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          ...exercise,
          created_by_user_id: user!.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}

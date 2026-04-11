'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import type { SetTrainingMaxInput } from '@/lib/validations/trainingMax'

export function useCurrentTrainingMaxes() {
  const supabase = useSupabase()
  return useQuery({
    queryKey: ['training-maxes', 'current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_maxes')
        .select('*, exercises(name, category, is_main_lift)')
        .order('effective_date', { ascending: false })
      if (error) throw error
      // Deduplicate: keep only the latest per exercise_id
      const latest = new Map<number, (typeof data)[0]>()
      for (const tm of data) {
        if (!latest.has(tm.exercise_id)) latest.set(tm.exercise_id, tm)
      }
      return Array.from(latest.values())
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSetTrainingMax() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SetTrainingMaxInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('training_maxes')
        .insert({
          user_id: user!.id,
          exercise_id: input.exerciseId,
          weight_lbs: input.weightLbs,
          tm_percentage: input.tmPercentage ?? 0.90,
          effective_date: input.effectiveDate ?? new Date().toISOString().split('T')[0],
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-maxes'] })
    },
  })
}

export function useTrainingMaxHistory(exerciseId: number) {
  const supabase = useSupabase()
  return useQuery({
    queryKey: ['training-maxes', 'history', exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_maxes')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('effective_date', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!exerciseId,
  })
}

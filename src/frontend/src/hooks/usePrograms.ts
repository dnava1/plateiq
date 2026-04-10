'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import type { CreateProgramInput } from '@/lib/validations/program'
import type { Tables } from '@/types/database'

export type TrainingProgram = Tables<'training_programs'>
export type Cycle = Tables<'cycles'>

export function usePrograms() {
  const supabase = useSupabase()
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TrainingProgram[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useActiveProgram() {
  const supabase = useSupabase()
  return useQuery({
    queryKey: ['programs', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data as TrainingProgram | null
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateProgram() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProgramInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      const config = {
        supplement_key: input.supplement_key ?? null,
        rounding: input.rounding,
        tm_percentage: input.tm_percentage,
      }
      // Deactivate any existing active program first
      await supabase
        .from('training_programs')
        .update({ is_active: false })
        .eq('is_active', true)
        .eq('user_id', user!.id)

      const { data: program, error: progError } = await supabase
        .from('training_programs')
        .insert({
          user_id: user!.id,
          name: input.name,
          template_key: input.template_key,
          config,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()
      if (progError) throw progError

      // Create cycle 1
      const { data: cycle, error: cycleError } = await supabase
        .from('cycles')
        .insert({
          user_id: user!.id,
          program_id: program.id,
          cycle_number: 1,
          start_date: program.start_date,
        })
        .select()
        .single()
      if (cycleError) throw cycleError

      return { program, cycle }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
    },
  })
}

export function useSetActiveProgram() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (programId: number) => {
      const { data: { user } } = await supabase.auth.getUser()
      // Deactivate all programs for this user
      await supabase
        .from('training_programs')
        .update({ is_active: false })
        .eq('is_active', true)
        .eq('user_id', user!.id)

      // Activate the selected program
      const { data, error } = await supabase
        .from('training_programs')
        .update({ is_active: true })
        .eq('id', programId)
        .eq('user_id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
    },
  })
}

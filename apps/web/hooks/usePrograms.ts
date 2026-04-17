'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardQueryKeys } from './useDashboard'
import { useSupabase } from './useSupabase'
import type { CreateProgramInput, CreateCustomProgramInput } from '@/lib/validations/program'
import { getTemplate } from '@/lib/constants/templates'
import type { ProgramSaveStrategy } from '@/lib/programs/editable'
import type { Tables, Json } from '@/types/database'
import type { CustomProgramConfig } from '@/types/template'

export type TrainingProgram = Tables<'training_programs'>
export type Cycle = Tables<'cycles'>

export interface ProgramEditability {
  hasWorkoutHistory: boolean
  saveStrategy: ProgramSaveStrategy
}

export interface CreateProgramDefinitionInput {
  name: string
  templateKey: string
  definition: CustomProgramConfig
  activateOnSave?: boolean
}

export interface UpdateProgramDefinitionInput {
  programId: number
  name: string
  templateKey: string
  definition: CustomProgramConfig
}

export interface CreateProgramRevisionInput {
  sourceProgramId: number
  name: string
  templateKey: string
  definition: CustomProgramConfig
  activateOnSave?: boolean
}

interface ProgramMutationResult {
  program: TrainingProgram
  cycle: Cycle
}

function parseProgramMutationResult(data: unknown): ProgramMutationResult {
  const result = data as ProgramMutationResult | null

  if (!result?.program || !result?.cycle) {
    throw new Error('Program save failed to return complete data.')
  }

  return result
}

function parseProgramRecord(data: unknown): TrainingProgram {
  const result = data as TrainingProgram | null

  if (!result) {
    throw new Error('Program update failed to return a saved program.')
  }

  return result
}

async function countProgramWorkouts(
  supabase: ReturnType<typeof useSupabase>,
  programId: number,
) {
  const { data: cycles, error: cyclesError } = await supabase
    .from('cycles')
    .select('id')
    .eq('program_id', programId)

  if (cyclesError) {
    throw cyclesError
  }

  const cycleIds = (cycles ?? []).map((cycle) => cycle.id)

  if (cycleIds.length === 0) {
    return 0
  }

  const { count, error: workoutsError } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .in('cycle_id', cycleIds)

  if (workoutsError) {
    throw workoutsError
  }

  return count ?? 0
}

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

export function useProgram(programId: number | undefined) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: ['programs', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .eq('id', programId!)
        .maybeSingle()

      if (error) throw error
      return data as TrainingProgram | null
    },
    enabled: typeof programId === 'number',
    staleTime: 60 * 1000,
  })
}

export function useProgramEditability(programId: number | undefined) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: ['programs', programId, 'editability'],
    queryFn: async () => {
      const workoutCount = await countProgramWorkouts(supabase, programId!)
      const hasWorkoutHistory = workoutCount > 0

      return {
        hasWorkoutHistory,
        saveStrategy: hasWorkoutHistory ? 'revision' : 'update',
      } satisfies ProgramEditability
    },
    enabled: typeof programId === 'number',
    staleTime: 60 * 1000,
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
      const tmpl = getTemplate(input.template_key)
      const config: Record<string, string | number | null> = {
        variation_key: input.variation_key ?? null,
      }
      if (tmpl?.uses_training_max) {
        config.tm_percentage = input.tm_percentage
      }

      const { data, error } = await supabase.rpc('create_program_with_cycle', {
        p_name: input.name,
        p_template_key: input.template_key,
        p_config: config as Json,
        p_activate_on_save: true,
      })

      if (error) {
        throw error
      }

      return parseProgramMutationResult(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useSetActiveProgram() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (programId: number) => {
      const { data, error } = await supabase.rpc('set_active_program', {
        p_program_id: programId,
      })

      if (error) {
        throw error
      }

      return parseProgramRecord(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useCreateCustomProgram() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCustomProgramInput) => {
      const { data, error } = await supabase.rpc('create_program_with_cycle', {
        p_name: input.name,
        p_template_key: 'custom',
        p_config: input.definition as unknown as Json,
        p_activate_on_save: true,
      })

      if (error) {
        throw error
      }

      return parseProgramMutationResult(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useCreateProgramDefinition() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProgramDefinitionInput) => {
      const { data, error } = await supabase.rpc('create_program_with_cycle', {
        p_name: input.name,
        p_template_key: input.templateKey,
        p_config: input.definition as unknown as Json,
        p_activate_on_save: input.activateOnSave ?? true,
      })

      if (error) {
        throw error
      }

      return parseProgramMutationResult(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useUpdateProgramDefinition() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProgramDefinitionInput) => {
      const { data, error } = await supabase.rpc('update_program_definition', {
        p_program_id: input.programId,
        p_name: input.name,
        p_template_key: input.templateKey,
        p_config: input.definition as unknown as Json,
      })

      if (error) {
        throw error
      }

      return parseProgramRecord(data)
    },
    onSuccess: (_program, variables) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: ['programs', variables.programId] })
      queryClient.invalidateQueries({ queryKey: ['programs', variables.programId, 'editability'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useCreateProgramRevision() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProgramRevisionInput) => {
      const { data, error } = await supabase.rpc('create_program_with_cycle', {
        p_name: input.name,
        p_template_key: input.templateKey,
        p_config: input.definition as unknown as Json,
        p_activate_on_save: input.activateOnSave ?? false,
      })

      if (error) {
        throw error
      }

      return parseProgramMutationResult(data)
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: ['programs', variables.sourceProgramId] })
      queryClient.invalidateQueries({ queryKey: ['programs', variables.sourceProgramId, 'editability'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

export function useDeleteProgram() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (programId: number) => {
      const { data, error } = await supabase.rpc('delete_inactive_program', {
        p_program_id: programId,
      })

      if (error) {
        throw error
      }

      if (typeof data !== 'number') {
        throw new Error('This program could not be deleted. It may already be active or unavailable.')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })
}

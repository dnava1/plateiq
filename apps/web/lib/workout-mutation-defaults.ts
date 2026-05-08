'use client'

import type { QueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { analyticsQueryKeys } from '@/hooks/useAnalytics'
import { dashboardQueryKeys } from '@/hooks/useDashboard'
import {
  completeWorkoutMutation,
  ensureWorkoutMutation,
  logSetMutation,
  seedWorkoutSetsMutation,
  updateWorkoutBlockPrescriptionMutation,
  workoutMutationKeys,
  workoutQueryKeys,
  type CompleteWorkoutInput,
  type EnsureWorkoutInput,
  type LogSetInput,
  type SeedWorkoutSetsInput,
  type UpdateWorkoutBlockPrescriptionInput,
} from '@/hooks/useWorkouts'
import {
  clearActiveWorkoutSnapshot,
  getOfflineWorkoutOutboxEntryId,
  markOfflineWorkoutPackWorkoutCompleted,
  markOfflineWorkoutOutboxEntryFailed,
  markOfflineWorkoutOutboxEntrySynced,
} from '@/lib/offline-workout-store'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import type { Database } from '@/types/database'

type AppSupabaseClient = SupabaseClient<Database>

export function registerWorkoutMutationDefaults(queryClient: QueryClient, supabase: AppSupabaseClient) {
  queryClient.setMutationDefaults(workoutMutationKeys.ensureWorkout(), {
    mutationFn: (variables) => ensureWorkoutMutation(supabase, variables as unknown as EnsureWorkoutInput),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as EnsureWorkoutInput
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(input.cycleId) })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })

  queryClient.setMutationDefaults(workoutMutationKeys.seedWorkoutSets(), {
    mutationFn: (variables) => seedWorkoutSetsMutation(supabase, variables as unknown as SeedWorkoutSetsInput),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as SeedWorkoutSetsInput
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(input.workoutId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(input.cycleId) })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })

  queryClient.setMutationDefaults(workoutMutationKeys.logSet(), {
    mutationFn: (variables) => logSetMutation(supabase, variables as unknown as LogSetInput),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as LogSetInput
      void markOfflineWorkoutOutboxEntrySynced(
        input.userId,
        getOfflineWorkoutOutboxEntryId('set-log', input.workoutId, input.setOrder),
      ).catch(() => undefined)
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(input.workoutId) })
      if (input.isAmrap) {
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.amrapHistory(input.exerciseId) })
      }
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
    onError: (error, variables) => {
      const input = variables as unknown as LogSetInput
      void markOfflineWorkoutOutboxEntryFailed(
        input.userId,
        getOfflineWorkoutOutboxEntryId('set-log', input.workoutId, input.setOrder),
        error,
      ).catch(() => undefined)
    },
  })

  queryClient.setMutationDefaults(workoutMutationKeys.updateWorkoutBlockPrescription(), {
    mutationFn: (variables) => updateWorkoutBlockPrescriptionMutation(
      supabase,
      variables as unknown as UpdateWorkoutBlockPrescriptionInput,
    ),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as UpdateWorkoutBlockPrescriptionInput
      void markOfflineWorkoutOutboxEntrySynced(
        input.userId,
        getOfflineWorkoutOutboxEntryId('prescription-update', input.workoutId),
      ).catch(() => undefined)
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(input.workoutId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(input.cycleId) })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
    onError: (error, variables) => {
      const input = variables as unknown as UpdateWorkoutBlockPrescriptionInput
      void markOfflineWorkoutOutboxEntryFailed(
        input.userId,
        getOfflineWorkoutOutboxEntryId('prescription-update', input.workoutId),
        error,
      ).catch(() => undefined)
    },
  })

  queryClient.setMutationDefaults(workoutMutationKeys.completeWorkout(), {
    mutationFn: (variables) => completeWorkoutMutation(supabase, variables as unknown as CompleteWorkoutInput),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as CompleteWorkoutInput
      if (input.userId) {
        void markOfflineWorkoutOutboxEntrySynced(
          input.userId,
          getOfflineWorkoutOutboxEntryId('workout-complete', input.workoutId),
        ).catch(() => undefined)
        void Promise.all([
          clearActiveWorkoutSnapshot(input.userId),
          markOfflineWorkoutPackWorkoutCompleted(input.userId, input.workoutId),
        ]).catch(() => undefined)
      }
      useWorkoutSessionStore.getState().completeWorkoutSession(input.workoutId)
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(input.cycleId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(input.workoutId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.exerciseHistoryRoot() })
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
    onError: (error, variables) => {
      const input = variables as unknown as CompleteWorkoutInput
      if (input.userId) {
        void markOfflineWorkoutOutboxEntryFailed(
          input.userId,
          getOfflineWorkoutOutboxEntryId('workout-complete', input.workoutId),
          error,
        ).catch(() => undefined)
      }
      useWorkoutSessionStore.getState().clearPendingCompletion()
    },
  })
}

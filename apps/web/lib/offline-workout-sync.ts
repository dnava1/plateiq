'use client'

import type { QueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { analyticsQueryKeys } from '@/hooks/useAnalytics'
import { dashboardQueryKeys } from '@/hooks/useDashboard'
import {
  completeWorkoutMutation,
  logSetMutation,
  updateWorkoutBlockPrescriptionMutation,
  workoutQueryKeys,
  type CompleteWorkoutInput,
  type LogSetInput,
  type UpdateWorkoutBlockPrescriptionInput,
} from '@/hooks/useWorkouts'
import {
  clearActiveWorkoutSnapshot,
  getOfflineWorkoutOutboxEntries,
  getOfflineWorkoutOutboxEntryId,
  markOfflineWorkoutPackWorkoutCompleted,
  markOfflineWorkoutOutboxEntryFailed,
  markOfflineWorkoutOutboxEntrySynced,
  markOfflineWorkoutOutboxEntrySyncing,
  type OfflineWorkoutOutboxEntry,
} from '@/lib/offline-workout-store'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import type { Database } from '@/types/database'

type AppSupabaseClient = SupabaseClient<Database>

export interface OfflineWorkoutOutboxDrainResult {
  attempted: number
  failed: number
  skipped: number
  synced: number
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOptionalNumber(value: unknown): value is number | null | undefined {
  return value === null || value === undefined || isNumber(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isLogSetInput(value: unknown): value is LogSetInput {
  return isObject(value)
    && isNumber(value.workoutId)
    && isNumber(value.exerciseId)
    && isString(value.userId)
    && isNumber(value.setOrder)
    && isString(value.setType)
    && isNumber(value.weightLbs)
    && isNumber(value.repsPrescribed)
    && (value.repsActual === null || isNumber(value.repsActual))
    && typeof value.isAmrap === 'boolean'
    && isString(value.intensityType)
    && isOptionalNumber(value.repsPrescribedMax)
    && isOptionalNumber(value.actualRpe)
    && isOptionalNumber(value.prescribedWeightLbs)
    && isOptionalNumber(value.prescribedIntensity)
    && isOptionalNumber(value.prescriptionBaseWeightLbs)
}

function isUpdateWorkoutBlockPrescriptionInput(value: unknown): value is UpdateWorkoutBlockPrescriptionInput {
  return isObject(value)
    && isNumber(value.cycleId)
    && isNumber(value.workoutId)
    && isString(value.userId)
    && Array.isArray(value.updates)
    && value.updates.every((update) =>
      isObject(update)
      && isNumber(update.prescribedIntensity)
      && isNumber(update.prescribedWeightLbs)
      && isNumber(update.setOrder)
      && isOptionalNumber(update.prescriptionBaseWeightLbs),
    )
}

function isCompleteWorkoutInput(value: unknown): value is CompleteWorkoutInput {
  return isObject(value)
    && isNumber(value.workoutId)
    && isNumber(value.cycleId)
    && (value.userId === undefined || isString(value.userId))
}

function getEntryId(entry: OfflineWorkoutOutboxEntry) {
  switch (entry.kind) {
    case 'set-log':
      return getOfflineWorkoutOutboxEntryId('set-log', entry.workoutId, entry.setOrder)
    case 'prescription-update':
      return getOfflineWorkoutOutboxEntryId('prescription-update', entry.workoutId)
    case 'workout-complete':
      return getOfflineWorkoutOutboxEntryId('workout-complete', entry.workoutId)
  }
}

function invalidateAfterEntry(queryClient: QueryClient | undefined, entry: OfflineWorkoutOutboxEntry) {
  if (!queryClient) {
    return
  }

  if (entry.kind === 'set-log' && isLogSetInput(entry.variables)) {
    queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(entry.variables.workoutId) })
    if (entry.variables.isAmrap) {
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.amrapHistory(entry.variables.exerciseId) })
    }
    queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    return
  }

  if (entry.kind === 'prescription-update' && isUpdateWorkoutBlockPrescriptionInput(entry.variables)) {
    queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(entry.variables.workoutId) })
    queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(entry.variables.cycleId) })
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    return
  }

  if (entry.kind === 'workout-complete' && isCompleteWorkoutInput(entry.variables)) {
    queryClient.invalidateQueries({ queryKey: ['workouts'] })
    queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(entry.variables.cycleId) })
    queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(entry.variables.workoutId) })
    queryClient.invalidateQueries({ queryKey: workoutQueryKeys.exerciseHistoryRoot() })
    queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
  }
}

async function replayOutboxEntry(
  supabase: AppSupabaseClient,
  userId: string,
  entry: OfflineWorkoutOutboxEntry,
  queryClient?: QueryClient,
) {
  if (entry.kind === 'set-log') {
    if (!isLogSetInput(entry.variables)) {
      throw new Error('Queued set log is no longer readable.')
    }

    await logSetMutation(supabase, entry.variables)
    await markOfflineWorkoutOutboxEntrySynced(userId, getEntryId(entry))
    invalidateAfterEntry(queryClient, entry)
    return
  }

  if (entry.kind === 'prescription-update') {
    if (!isUpdateWorkoutBlockPrescriptionInput(entry.variables)) {
      throw new Error('Queued workout adjustment is no longer readable.')
    }

    await updateWorkoutBlockPrescriptionMutation(supabase, entry.variables)
    await markOfflineWorkoutOutboxEntrySynced(userId, getEntryId(entry))
    invalidateAfterEntry(queryClient, entry)
    return
  }

  if (!isCompleteWorkoutInput(entry.variables)) {
    throw new Error('Queued workout completion is no longer readable.')
  }

  await completeWorkoutMutation(supabase, entry.variables)
  await markOfflineWorkoutOutboxEntrySynced(userId, getEntryId(entry))
  await Promise.all([
    clearActiveWorkoutSnapshot(userId),
    markOfflineWorkoutPackWorkoutCompleted(userId, entry.variables.workoutId),
  ])
  useWorkoutSessionStore.getState().completeWorkoutSession(entry.variables.workoutId)
  invalidateAfterEntry(queryClient, entry)
}

export async function drainOfflineWorkoutOutbox(input: {
  queryClient?: QueryClient
  supabase: AppSupabaseClient
  userId: string | null | undefined
}): Promise<OfflineWorkoutOutboxDrainResult> {
  if (!input.userId) {
    return {
      attempted: 0,
      failed: 0,
      skipped: 0,
      synced: 0,
    }
  }

  const entries = await getOfflineWorkoutOutboxEntries(input.userId)
  const result: OfflineWorkoutOutboxDrainResult = {
    attempted: 0,
    failed: 0,
    skipped: 0,
    synced: 0,
  }

  for (const entry of entries) {
    result.attempted += 1

    try {
      await markOfflineWorkoutOutboxEntrySyncing(input.userId, getEntryId(entry))
      await replayOutboxEntry(input.supabase, input.userId, entry, input.queryClient)
      result.synced += 1
    } catch (error) {
      await markOfflineWorkoutOutboxEntryFailed(input.userId, getEntryId(entry), error)
      result.failed += 1
    }
  }

  return result
}

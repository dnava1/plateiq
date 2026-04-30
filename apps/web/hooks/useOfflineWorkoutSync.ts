'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutationState, useQueryClient } from '@tanstack/react-query'
import {
  getOfflineWorkoutOutboxEntries,
  OFFLINE_WORKOUT_STORE_CHANGED_EVENT,
  type OfflineWorkoutOutboxEntry,
} from '@/lib/offline-workout-store'
import { drainOfflineWorkoutOutbox } from '@/lib/offline-workout-sync'
import { flushPendingMutations } from '@/lib/query-persistence'
import { workoutMutationKeys } from './useWorkouts'
import { useSupabase } from './useSupabase'

export interface OfflineWorkoutSyncState {
  entries: OfflineWorkoutOutboxEntry[]
  failedEntries: OfflineWorkoutOutboxEntry[]
  isOnline: boolean
  isRetrying: boolean
  pendingCount: number
  pendingMutationCount: number
  refresh: () => void
  retrySync: () => Promise<void>
}

export function useOfflineWorkoutSync(userId: string | null | undefined): OfflineWorkoutSyncState {
  const queryClient = useQueryClient()
  const supabase = useSupabase()
  const [entries, setEntries] = useState<OfflineWorkoutOutboxEntry[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const pendingSetMutations = useMutationState({
    filters: { mutationKey: workoutMutationKeys.logSet(), status: 'pending' },
  })
  const pendingCompletionMutations = useMutationState({
    filters: { mutationKey: workoutMutationKeys.completeWorkout(), status: 'pending' },
  })
  const pendingPrescriptionMutations = useMutationState({
    filters: { mutationKey: workoutMutationKeys.updateWorkoutBlockPrescription(), status: 'pending' },
  })

  const refresh = useCallback(() => {
    if (!userId) {
      setEntries([])
      return
    }

    void getOfflineWorkoutOutboxEntries(userId)
      .then(setEntries)
      .catch(() => undefined)
  }, [userId])

  const retrySync = useCallback(async () => {
    if (!userId) {
      return
    }

    setIsRetrying(true)

    try {
      await flushPendingMutations(queryClient)
      await drainOfflineWorkoutOutbox({
        queryClient,
        supabase,
        userId,
      })
      refresh()
    } finally {
      setIsRetrying(false)
    }
  }, [queryClient, refresh, supabase, userId])

  useEffect(() => {
    const initialStatusId = window.setTimeout(() => {
      setIsOnline(navigator.onLine)
    }, 0)

    const handleOnline = () => {
      setIsOnline(true)
      void retrySync().catch(() => undefined)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.clearTimeout(initialStatusId)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [retrySync])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const handleStoreChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { userId?: string } | undefined : undefined

      if (!detail?.userId || detail.userId === userId) {
        refresh()
      }
    }

    window.addEventListener(OFFLINE_WORKOUT_STORE_CHANGED_EVENT, handleStoreChanged)

    return () => {
      window.removeEventListener(OFFLINE_WORKOUT_STORE_CHANGED_EVENT, handleStoreChanged)
    }
  }, [refresh, userId])

  const failedEntries = useMemo(
    () => entries.filter((entry) => entry.status === 'failed'),
    [entries],
  )
  const pendingMutationCount = pendingSetMutations.length
    + pendingCompletionMutations.length
    + pendingPrescriptionMutations.length
  const pendingCount = Math.max(entries.length, pendingMutationCount)

  return {
    entries,
    failedEntries,
    isOnline,
    isRetrying,
    pendingCount,
    pendingMutationCount,
    refresh,
    retrySync,
  }
}

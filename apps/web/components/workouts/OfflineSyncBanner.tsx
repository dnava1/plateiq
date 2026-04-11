'use client'

import { useEffect, useState } from 'react'
import { useMutationState } from '@tanstack/react-query'
import { CloudOff, RefreshCw } from 'lucide-react'
import { workoutMutationKeys } from '@/hooks/useWorkouts'

export function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const pendingSetMutations = useMutationState({
    filters: { mutationKey: workoutMutationKeys.logSet(), status: 'pending' },
  })
  const pendingCompletionMutations = useMutationState({
    filters: { mutationKey: workoutMutationKeys.completeWorkout(), status: 'pending' },
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const pendingCount = pendingSetMutations.length + pendingCompletionMutations.length
  const isSyncing = isOnline && pendingCount > 0

  if (isOnline && !isSyncing) {
    return null
  }

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
      {isOnline ? <RefreshCw className="animate-spin motion-reduce:animate-none" /> : <CloudOff />}
      <span>
        {isOnline
          ? `Syncing ${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'}...`
          : 'Offline mode — sets will sync when connected'}
      </span>
    </div>
  )
}
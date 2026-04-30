'use client'

import { useEffect, useState } from 'react'
import { useMutationState, useQueryClient } from '@tanstack/react-query'
import { CloudOff, RefreshCw } from 'lucide-react'
import { workoutMutationKeys } from '@/hooks/useWorkouts'
import { flushPendingMutations } from '@/lib/query-persistence'
import { Button } from '@/components/ui/button'

export function OfflineSyncBanner() {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const pendingSetMutations = useMutationState({
    filters: { mutationKey: workoutMutationKeys.logSet(), status: 'pending' },
  })
  const pendingCompletionMutations = useMutationState({
    filters: { mutationKey: workoutMutationKeys.completeWorkout(), status: 'pending' },
  })

  useEffect(() => {
    const initialStatusId = window.setTimeout(() => {
      setIsOnline(navigator.onLine)
    }, 0)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.clearTimeout(initialStatusId)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const pendingCount = pendingSetMutations.length + pendingCompletionMutations.length
  const isSyncing = isOnline && pendingCount > 0

  const retrySync = async () => {
    setIsRetrying(true)

    try {
      await flushPendingMutations(queryClient)
    } finally {
      setIsRetrying(false)
    }
  }

  if (isOnline && !isSyncing) {
    return null
  }

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
      {isOnline ? <RefreshCw className="animate-spin motion-reduce:animate-none" /> : <CloudOff />}
      <span>
        {isOnline
          ? `Syncing ${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'}...`
          : 'Offline mode - sets will sync when connected'}
      </span>
      {isOnline ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => void retrySync()}
          disabled={isRetrying}
        >
          <RefreshCw className={isRetrying ? 'animate-spin motion-reduce:animate-none' : undefined} />
          Retry
        </Button>
      ) : null}
    </div>
  )
}

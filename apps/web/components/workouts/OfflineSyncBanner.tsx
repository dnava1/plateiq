'use client'

import { AlertCircle, CloudOff, RefreshCw } from 'lucide-react'
import type { OfflineWorkoutSyncState } from '@/hooks/useOfflineWorkoutSync'
import { Button } from '@/components/ui/button'

interface OfflineSyncBannerProps {
  sync: OfflineWorkoutSyncState
}

export function OfflineSyncBanner({ sync }: OfflineSyncBannerProps) {
  const failedCount = sync.failedEntries.length
  const isSyncing = sync.isOnline && sync.pendingCount > 0 && failedCount === 0

  if (sync.isOnline && !isSyncing && failedCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
      {failedCount > 0
        ? <AlertCircle className="text-destructive" />
        : sync.isOnline
          ? <RefreshCw className="animate-spin motion-reduce:animate-none" />
          : <CloudOff />}
      <span>
        {failedCount > 0
          ? `${failedCount} ${failedCount === 1 ? 'change needs' : 'changes need'} attention`
          : sync.isOnline
            ? `Syncing ${sync.pendingCount} ${sync.pendingCount === 1 ? 'change' : 'changes'}...`
            : 'Offline mode - sets will sync when connected'}
      </span>
      {sync.isOnline && (sync.pendingCount > 0 || failedCount > 0) ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => void sync.retrySync()}
          disabled={sync.isRetrying}
        >
          <RefreshCw className={sync.isRetrying ? 'animate-spin motion-reduce:animate-none' : undefined} />
          Retry
        </Button>
      ) : null}
    </div>
  )
}

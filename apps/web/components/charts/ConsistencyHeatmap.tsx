'use client'

import { cn } from '@/lib/utils'
import type { WeeklyActivitySummary } from '@/types/analytics'
import { formatShortDate } from './chart-utils'

interface ConsistencyHeatmapProps {
  compact?: boolean
  data: WeeklyActivitySummary[]
}

function getVolumeBucket(totalVolume: number, maxVolume: number) {
  if (totalVolume <= 0 || maxVolume <= 0) return 0

  const ratio = totalVolume / maxVolume
  if (ratio >= 0.8) return 4
  if (ratio >= 0.55) return 3
  if (ratio >= 0.3) return 2
  return 1
}

function getBucketClassName(bucket: number) {
  switch (bucket) {
    case 4:
      return 'bg-primary'
    case 3:
      return 'bg-primary/75'
    case 2:
      return 'bg-primary/50'
    case 1:
      return 'bg-primary/25'
    default:
      return 'bg-muted/60'
  }
}

export function ConsistencyHeatmap({ compact = false, data }: ConsistencyHeatmapProps) {
  const maxVolume = Math.max(...data.map((entry) => entry.totalVolume), 0)

  return (
    <div className={cn('flex gap-1.5', compact ? 'items-center' : 'items-start')}>
      {data.map((entry) => {
        const bucket = getVolumeBucket(entry.totalVolume, maxVolume)

        return (
          <div key={entry.weekStart} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={cn(
                'w-full rounded-[10px] border border-border/60 transition-colors',
                compact ? 'h-9' : 'h-12',
                getBucketClassName(bucket),
              )}
              title={`${formatShortDate(entry.weekStart)}: ${entry.isActive ? 'active week' : 'rest week'}${entry.totalVolume > 0 ? ` · ${Math.round(entry.totalVolume)} lbs` : ''}`}
            />
            {!compact ? (
              <span className="text-center text-[10px] text-muted-foreground">{formatShortDate(entry.weekStart)}</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

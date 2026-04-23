'use client'

import { useState } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { cn } from '@/lib/utils'
import type { WeeklyActivitySummary } from '@/types/analytics'
import { ChartTooltipContent } from './ChartTooltipContent'
import { formatDisplayLoad, formatShortDate } from './chart-utils'

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
  const preferredUnit = usePreferredUnit()
  const [activeWeekStart, setActiveWeekStart] = useState<string | null>(null)
  const maxVolume = Math.max(...data.map((entry) => entry.totalVolume), 0)

  return (
    <div className={cn('flex gap-1.5', compact ? 'items-center' : 'items-start')}>
      {data.map((entry) => {
        const bucket = getVolumeBucket(entry.totalVolume, maxVolume)
        const isTooltipVisible = activeWeekStart === entry.weekStart
        const tooltipId = `consistency-tooltip-${entry.weekStart}`

        return (
          <div key={entry.weekStart} className="relative flex flex-1 flex-col items-center gap-2">
            {isTooltipVisible ? (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 -translate-x-1/2">
                <ChartTooltipContent
                  id={tooltipId}
                  label={`Week of ${formatShortDate(entry.weekStart)}`}
                  rows={[
                    { label: 'Status', value: entry.isActive ? 'Active week' : 'Rest week' },
                    { label: 'Volume', value: formatDisplayLoad(entry.totalVolume, preferredUnit) },
                    { label: 'Sets', value: `${entry.totalSets}` },
                  ]}
                />
              </div>
            ) : null}
            <div
              aria-label={`Week of ${formatShortDate(entry.weekStart)}`}
              aria-describedby={isTooltipVisible ? tooltipId : undefined}
              className={cn(
                'w-full rounded-[10px] border border-border/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                compact ? 'h-9' : 'h-12',
                getBucketClassName(bucket),
              )}
              onMouseEnter={() => setActiveWeekStart(entry.weekStart)}
              onMouseLeave={() => setActiveWeekStart((current) => (current === entry.weekStart ? null : current))}
              onFocus={() => setActiveWeekStart(entry.weekStart)}
              onBlur={() => setActiveWeekStart((current) => (current === entry.weekStart ? null : current))}
              tabIndex={0}
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

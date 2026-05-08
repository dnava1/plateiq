'use client'

import { useRef, useState } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { cn } from '@/lib/utils'
import type { WeeklyActivitySummary } from '@/types/analytics'
import { ChartTooltipContent } from './ChartTooltipContent'
import { formatDisplayLoad, formatShortDate } from './chart-utils'
import { ScrollableChartFrame } from './ScrollableChartFrame'
import { resolveElementCenterTooltipAnchor, ViewportTooltipPortal } from './ViewportTooltipPortal'

interface ConsistencyHeatmapProps {
  compact?: boolean
  data: WeeklyActivitySummary[]
  metric?: 'sessions' | 'volume'
}

interface ActiveWeekTooltip {
  anchorElement: HTMLElement
  weekStart: string
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

export function ConsistencyHeatmap({
  compact = false,
  data,
  metric = 'volume',
}: ConsistencyHeatmapProps) {
  const preferredUnit = usePreferredUnit()
  const heatmapContainerRef = useRef<HTMLDivElement>(null)
  const [activeTooltip, setActiveTooltip] = useState<ActiveWeekTooltip | null>(null)
  const maxValue = Math.max(
    ...data.map((entry) => (metric === 'sessions' ? entry.totalSessions : entry.totalVolume)),
    0,
  )
  const minWidth = Math.max(320, data.length * 52)
  const activeEntry = activeTooltip ? data.find((entry) => entry.weekStart === activeTooltip.weekStart) : undefined

  function showTooltip(element: HTMLElement, weekStart: string) {
    setActiveTooltip({
      anchorElement: element,
      weekStart,
    })
  }

  function hideTooltip(weekStart: string) {
    setActiveTooltip((current) => (current?.weekStart === weekStart ? null : current))
  }

  const heatmap = (
    <div ref={heatmapContainerRef} className={cn('flex gap-1.5', compact ? 'items-center' : 'items-start')}>
      {data.map((entry) => {
        const bucket = getVolumeBucket(metric === 'sessions' ? entry.totalSessions : entry.totalVolume, maxValue)
        const isTooltipVisible = activeTooltip?.weekStart === entry.weekStart
        const tooltipId = `consistency-tooltip-${entry.weekStart}`

        return (
          <div key={entry.weekStart} className="relative flex flex-1 flex-col items-center gap-2">
            <div
              aria-label={`Week of ${formatShortDate(entry.weekStart)}`}
              aria-describedby={isTooltipVisible ? tooltipId : undefined}
              className={cn(
                'w-full rounded-[10px] border border-border/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                compact ? 'h-9' : 'h-12',
                getBucketClassName(bucket),
              )}
              onMouseEnter={(event) => showTooltip(event.currentTarget, entry.weekStart)}
              onMouseLeave={() => hideTooltip(entry.weekStart)}
              onFocus={(event) => showTooltip(event.currentTarget, entry.weekStart)}
              onBlur={() => hideTooltip(entry.weekStart)}
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

  return (
    <>
      {compact ? heatmap : (
        <ScrollableChartFrame
          minWidth={minWidth}
          scrollKey={`${metric}-${data.length}`}
        >
          {heatmap}
        </ScrollableChartFrame>
      )}
      <ViewportTooltipPortal
        active={activeTooltip !== null && activeEntry !== undefined}
        boundaryAxis="horizontal"
        resolveAnchor={() => resolveElementCenterTooltipAnchor(activeTooltip?.anchorElement ?? null)}
        resolveBoundaryElement={() => heatmapContainerRef.current}
        renderContent={({ maxWidth }) => activeEntry ? (
          <ChartTooltipContent
            id={`consistency-tooltip-${activeEntry.weekStart}`}
            label={`Week of ${formatShortDate(activeEntry.weekStart)}`}
            maxWidth={maxWidth}
            rows={metric === 'sessions'
              ? [
                  { label: 'Status', value: activeEntry.isActive ? 'Active week' : 'Rest week' },
                  { label: 'Sessions', value: `${activeEntry.totalSessions}` },
                ]
              : [
                  { label: 'Status', value: activeEntry.isActive ? 'Active week' : 'Rest week' },
                  { label: 'Volume', value: formatDisplayLoad(activeEntry.totalVolume, preferredUnit) },
                  { label: 'Sets', value: `${activeEntry.totalSets}` },
                ]}
          />
        ) : null}
      />
    </>
  )
}

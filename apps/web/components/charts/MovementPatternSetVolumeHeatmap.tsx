'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { buildMovementPatternWeekStarts } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import type { MovementPatternWeeklySetSummary } from '@/types/analytics'
import { ChartTooltipContent } from './ChartTooltipContent'
import { formatDisplayLoad, formatMovementPattern, formatShortDate } from './chart-utils'
import { resolveElementCenterTooltipAnchor, ViewportTooltipPortal } from './ViewportTooltipPortal'

interface MovementPatternSetVolumeHeatmapProps {
  data: MovementPatternWeeklySetSummary[]
  dateFrom: string | Date
  dateTo: string | Date
}

const MOVEMENT_PATTERN_ORDER = [
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'squat',
  'lunge',
  'hinge',
] as const

interface ActiveCellTooltip {
  anchorElement: HTMLElement
  cellKey: string
}

function getPatternSortIndex(movementPattern: string) {
  const index = MOVEMENT_PATTERN_ORDER.indexOf(movementPattern as typeof MOVEMENT_PATTERN_ORDER[number])
  return index === -1 ? MOVEMENT_PATTERN_ORDER.length : index
}

function formatSetCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function getSetBucket(totalSets: number, maxSets: number) {
  if (totalSets <= 0 || maxSets <= 0) return 0

  const ratio = totalSets / maxSets
  if (ratio >= 0.8) return 4
  if (ratio >= 0.55) return 3
  if (ratio >= 0.3) return 2
  return 1
}

function getBucketClassName(bucket: number) {
  switch (bucket) {
    case 4:
      return 'bg-primary text-primary-foreground'
    case 3:
      return 'bg-primary/75 text-primary-foreground'
    case 2:
      return 'bg-primary/45 text-foreground'
    case 1:
      return 'bg-primary/20 text-foreground'
    default:
      return 'bg-muted/55 text-muted-foreground'
  }
}

export function MovementPatternSetVolumeHeatmap({
  data,
  dateFrom,
  dateTo,
}: MovementPatternSetVolumeHeatmapProps) {
  const preferredUnit = usePreferredUnit()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeTooltip, setActiveTooltip] = useState<ActiveCellTooltip | null>(null)
  const weekStarts = useMemo(() => buildMovementPatternWeekStarts(dateFrom, dateTo), [dateFrom, dateTo])
  const movementPatterns = useMemo(
    () => Array.from(new Set(data.map((entry) => entry.movementPattern)))
      .sort((left, right) => {
        const patternSort = getPatternSortIndex(left) - getPatternSortIndex(right)
        return patternSort === 0 ? left.localeCompare(right) : patternSort
      }),
    [data],
  )
  const dataByCell = useMemo(
    () => new Map(data.map((entry) => [`${entry.weekStart}:${entry.movementPattern}`, entry])),
    [data],
  )
  const maxSets = Math.max(...data.map((entry) => entry.totalSets), 0)
  const minWidth = Math.max(620, 108 + weekStarts.length * 40)
  const gridTemplateColumns = `6.75rem repeat(${weekStarts.length}, minmax(2.25rem, 1fr))`
  const activeEntry = activeTooltip ? dataByCell.get(activeTooltip.cellKey) : undefined

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) {
      return
    }

    scrollContainer.scrollLeft = scrollContainer.scrollWidth
  }, [data, weekStarts.length])

  function showTooltip(element: HTMLElement, cellKey: string) {
    setActiveTooltip({
      anchorElement: element,
      cellKey,
    })
  }

  function hideTooltip(cellKey: string) {
    setActiveTooltip((current) => (current?.cellKey === cellKey ? null : current))
  }

  if (movementPatterns.length === 0 || weekStarts.length === 0) {
    return null
  }

  return (
    <div
      ref={scrollContainerRef}
      className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain pb-2 touch-pan-x"
      tabIndex={0}
    >
      <div className="grid gap-1.5" style={{ gridTemplateColumns, minWidth }}>
        <div className="shadow-app-edge sticky left-0 z-10 bg-card/95" />
        {weekStarts.map((weekStart) => (
          <div key={weekStart} className="text-center text-[10px] leading-4 text-muted-foreground">
            {formatShortDate(weekStart)}
          </div>
        ))}

        {movementPatterns.map((movementPattern) => (
          <div key={movementPattern} className="contents">
            <div className="shadow-app-edge sticky left-0 z-10 flex min-h-10 items-center bg-card/95 pr-3 text-xs font-medium text-foreground">
              {formatMovementPattern(movementPattern)}
            </div>
            {weekStarts.map((weekStart) => {
              const cellKey = `${weekStart}:${movementPattern}`
              const entry = dataByCell.get(cellKey)
              const totalSets = entry?.totalSets ?? 0
              const bucket = getSetBucket(totalSets, maxSets)
              const tooltipId = `movement-pattern-tooltip-${weekStart}-${movementPattern}`

              return (
                <div key={cellKey} className="relative">
                  <div
                    aria-label={`${formatMovementPattern(movementPattern)} for week of ${formatShortDate(weekStart)}`}
                    aria-describedby={entry && activeTooltip?.cellKey === cellKey ? tooltipId : undefined}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-[10px] border border-border/60 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      getBucketClassName(bucket),
                    )}
                    onMouseEnter={(event) => {
                      if (entry) showTooltip(event.currentTarget, cellKey)
                    }}
                    onMouseLeave={() => hideTooltip(cellKey)}
                    onFocus={(event) => {
                      if (entry) showTooltip(event.currentTarget, cellKey)
                    }}
                    onBlur={() => hideTooltip(cellKey)}
                    onClick={(event) => {
                      if (entry) showTooltip(event.currentTarget, cellKey)
                    }}
                    tabIndex={0}
                  >
                    {totalSets > 0 ? formatSetCount(totalSets) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <ViewportTooltipPortal
        active={activeTooltip !== null && activeEntry !== undefined}
        boundaryAxis="horizontal"
        resolveAnchor={() => resolveElementCenterTooltipAnchor(activeTooltip?.anchorElement ?? null)}
        resolveBoundaryElement={() => scrollContainerRef.current}
        renderContent={({ maxWidth }) => activeEntry ? (
          <ChartTooltipContent
            id={`movement-pattern-tooltip-${activeEntry.weekStart}-${activeEntry.movementPattern}`}
            label={`${formatMovementPattern(activeEntry.movementPattern)} - ${formatShortDate(activeEntry.weekStart)}`}
            maxWidth={maxWidth}
            rows={[
              { label: 'Sets', value: formatSetCount(activeEntry.totalSets) },
              { label: 'Volume', value: formatDisplayLoad(activeEntry.totalVolume, preferredUnit) },
            ]}
          />
        ) : null}
      />
    </div>
  )
}

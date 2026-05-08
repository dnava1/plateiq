'use client'

import { useRef } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsBodyweightWeeklyVolumePoint } from '@/types/analytics'
import { ChartTooltipContent } from './ChartTooltipContent'
import { CHART_COLORS, CHART_TOOLTIP_ALLOW_ESCAPE_VIEW_BOX, formatShortDate } from './chart-utils'
import { MeasuredChartContainer } from './MeasuredChartContainer'
import { HIDDEN_RECHARTS_TOOLTIP_WRAPPER_STYLE, RechartsViewportTooltipPortal } from './RechartsViewportTooltip'
import { ScrollableChartFrame } from './ScrollableChartFrame'

interface BodyweightWeeklyVolumeTooltipPayload {
  payload?: { totalSessions?: number; weekStart?: string }
  value?: number | string | Array<number | string>
}

function BodyweightWeeklyVolumeTooltip({
  active,
  label,
  maxWidth,
  payload,
}: {
  active?: boolean
  label?: string | number
  maxWidth?: number
  payload?: BodyweightWeeklyVolumeTooltipPayload[]
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const primaryEntry = payload[0]
  const numericValue = Array.isArray(primaryEntry?.value)
    ? Number(primaryEntry.value[0] ?? 0)
    : typeof primaryEntry?.value === 'number'
      ? primaryEntry.value
      : Number(primaryEntry?.value ?? 0)

  return (
    <ChartTooltipContent
      label={primaryEntry?.payload?.weekStart ? `Week of ${formatShortDate(primaryEntry.payload.weekStart)}` : String(label ?? 'Weekly reps')}
      maxWidth={maxWidth}
      rows={[
        { label: 'Weekly reps', value: `${numericValue} reps` },
        { label: 'Sessions', value: `${primaryEntry?.payload?.totalSessions ?? 0}` },
      ]}
    />
  )
}

interface BodyweightWeeklyVolumeChartProps {
  compact?: boolean
  data: AnalyticsBodyweightWeeklyVolumePoint[]
}

export function BodyweightWeeklyVolumeChart({ compact = false, data }: BodyweightWeeklyVolumeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const rows = data.map((entry) => ({
    label: formatShortDate(entry.weekStart),
    totalReps: entry.totalReps,
    totalSessions: entry.totalSessions,
    weekStart: entry.weekStart,
  }))
  const chartMinWidth = Math.max(320, 96 + rows.length * 44)
  const scrollKey = rows.map((entry) => entry.weekStart).join(':')
  const chart = (
    <div ref={chartContainerRef} className="relative">
      <MeasuredChartContainer allowOverflow className={compact ? 'h-44 w-full' : 'h-72 w-full'}>
        {({ width, height }) => {
          const useCompactLayout = compact
          const isNarrow = width < 420

          return (
            <BarChart width={width} height={height} data={rows} margin={useCompactLayout ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 8, right: isNarrow ? 8 : 12, bottom: isNarrow ? 12 : 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                hide={useCompactLayout}
                tickLine={false}
                axisLine={false}
                minTickGap={isNarrow ? 10 : 16}
              />
              <YAxis
                hide={useCompactLayout}
                allowDecimals={false}
                width={isNarrow ? 28 : 40}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                allowEscapeViewBox={CHART_TOOLTIP_ALLOW_ESCAPE_VIEW_BOX}
                content={(props) => {
                  const payload = props.payload as unknown as BodyweightWeeklyVolumeTooltipPayload[] | undefined

                  return (
                    <RechartsViewportTooltipPortal
                      active={props.active}
                      chartContainerRef={chartContainerRef}
                      coordinate={props.coordinate && Number.isFinite(props.coordinate.x) && Number.isFinite(props.coordinate.y)
                        ? { x: props.coordinate.x, y: props.coordinate.y }
                        : undefined}
                      label={props.label}
                      offset={18}
                      payload={payload ?? []}
                      renderContent={({ label, maxWidth, payload }) => (
                        <BodyweightWeeklyVolumeTooltip active label={label} maxWidth={maxWidth} payload={payload} />
                      )}
                    />
                  )
                }}
                offset={18}
                wrapperStyle={HIDDEN_RECHARTS_TOOLTIP_WRAPPER_STYLE}
              />
              <Bar dataKey="totalReps" name="Weekly reps" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
            </BarChart>
          )
        }}
      </MeasuredChartContainer>
    </div>
  )

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {compact ? chart : (
        <ScrollableChartFrame minWidth={chartMinWidth} scrollKey={scrollKey}>
          {chart}
        </ScrollableChartFrame>
      )}
    </div>
  )
}

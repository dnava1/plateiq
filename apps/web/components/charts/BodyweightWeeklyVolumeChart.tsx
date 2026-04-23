'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsBodyweightWeeklyVolumePoint } from '@/types/analytics'
import { CHART_COLORS, formatShortDate } from './chart-utils'
import { MeasuredChartContainer } from './MeasuredChartContainer'

interface BodyweightWeeklyVolumeChartProps {
  compact?: boolean
  data: AnalyticsBodyweightWeeklyVolumePoint[]
}

export function BodyweightWeeklyVolumeChart({ compact = false, data }: BodyweightWeeklyVolumeChartProps) {
  const rows = data.map((entry) => ({
    label: formatShortDate(entry.weekStart),
    totalReps: entry.totalReps,
    totalSessions: entry.totalSessions,
    weekStart: entry.weekStart,
  }))

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <MeasuredChartContainer className={compact ? 'h-44 w-full' : 'h-72 w-full'}>
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
                formatter={(value, _name, payload) => {
                  const numericValue = Array.isArray(value)
                    ? Number(value[0] ?? 0)
                    : typeof value === 'number'
                      ? value
                      : Number(value ?? 0)
                  const row = payload?.payload as { totalSessions?: number } | undefined
                  return [`${numericValue} reps`, `${row?.totalSessions ?? 0} sessions`]
                }}
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload as { weekStart?: string } | undefined
                  return point?.weekStart ? formatShortDate(point.weekStart) : ''
                }}
              />
              <Bar dataKey="totalReps" name="Weekly reps" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
            </BarChart>
          )
        }}
      </MeasuredChartContainer>
    </div>
  )
}
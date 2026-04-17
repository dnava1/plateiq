'use client'

import { useMemo } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { aggregateWeeklyVolume } from '@/lib/analytics'
import type { AnalyticsVolumePoint } from '@/types/analytics'
import { CHART_COLORS, formatCompactDisplayLoad, formatDisplayLoad, formatShortDate } from './chart-utils'

interface VolumeTrendChartProps {
  compact?: boolean
  data: AnalyticsVolumePoint[]
  exerciseId?: number | null
}

export function VolumeTrendChart({ compact = false, data, exerciseId }: VolumeTrendChartProps) {
  const preferredUnit = usePreferredUnit()
  const chartData = useMemo(() => {
    const filteredPoints = exerciseId
      ? data.filter((point) => point.exerciseId === exerciseId)
      : data

    if (compact) {
      return {
        rows: aggregateWeeklyVolume(filteredPoints)
          .slice(-6)
          .map((entry) => ({
            label: formatShortDate(entry.weekStart),
            totalVolume: entry.totalVolume,
            weekStart: entry.weekStart,
          })),
        series: [],
      }
    }

    const totalsByExercise = new Map<number, { exerciseId: number; exerciseName: string; totalVolume: number }>()
    for (const point of filteredPoints) {
      const current = totalsByExercise.get(point.exerciseId)
      if (current) {
        current.totalVolume += point.totalVolume
        continue
      }

      totalsByExercise.set(point.exerciseId, {
        exerciseId: point.exerciseId,
        exerciseName: point.exerciseName,
        totalVolume: point.totalVolume,
      })
    }

    const visibleSeries = Array.from(totalsByExercise.values())
      .sort((left, right) => right.totalVolume - left.totalVolume)
      .slice(0, exerciseId ? 1 : 4)
      .map((entry, index) => ({
        ...entry,
        color: CHART_COLORS[index % CHART_COLORS.length],
        key: `exercise_${entry.exerciseId}`,
      }))
    const seriesById = new Map(visibleSeries.map((entry) => [entry.exerciseId, entry]))
    const rowMap = new Map<string, Record<string, number | string>>()

    for (const point of [...filteredPoints].sort((left, right) => left.weekStart.localeCompare(right.weekStart))) {
      const seriesEntry = seriesById.get(point.exerciseId)
      if (!seriesEntry) {
        continue
      }

      const current = rowMap.get(point.weekStart) ?? { label: formatShortDate(point.weekStart), weekStart: point.weekStart }
      current[seriesEntry.key] = point.totalVolume
      rowMap.set(point.weekStart, current)
    }

    return {
      rows: Array.from(rowMap.values()).sort((left, right) => String(left.weekStart).localeCompare(String(right.weekStart))),
      series: visibleSeries,
    }
  }, [compact, data, exerciseId])

  return (
    <div className={compact ? 'h-28 w-full' : 'h-72 w-full'}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData.rows} margin={compact ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 8, right: 12, bottom: 8, left: 0 }}>
          {!compact ? <CartesianGrid strokeDasharray="3 3" className="opacity-30" /> : null}
          <XAxis dataKey="label" hide={compact} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis hide={compact} tickFormatter={(value) => formatCompactDisplayLoad(Number(value), preferredUnit)} width={48} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => {
              const numericValue = Array.isArray(value)
                ? Number(value[0] ?? 0)
                : typeof value === 'number'
                  ? value
                  : Number(value ?? 0)
              return [formatDisplayLoad(numericValue, preferredUnit), 'Volume']
            }}
            labelFormatter={(_label, payload) => {
              const point = payload?.[0]?.payload as { weekStart?: string } | undefined
              return point?.weekStart ? formatShortDate(point.weekStart) : ''
            }}
          />
          {!compact && chartData.series.length > 1 ? <Legend /> : null}
          {compact ? (
            <Bar dataKey="totalVolume" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
          ) : (
            chartData.series.map((entry) => (
              <Bar key={entry.key} dataKey={entry.key} name={entry.exerciseName} stackId="volume" fill={entry.color} radius={[6, 6, 0, 0]} />
            ))
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

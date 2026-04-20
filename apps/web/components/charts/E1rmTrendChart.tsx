'use client'

import { useMemo } from 'react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatWeight } from '@/lib/utils'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsE1rmPoint } from '@/types/analytics'
import { CHART_COLORS, formatCompactRoundedWeight, formatShortDate } from './chart-utils'
import { MeasuredChartContainer } from './MeasuredChartContainer'

interface E1rmTrendChartProps {
  compact?: boolean
  data: AnalyticsE1rmPoint[]
  exerciseId?: number | null
}

export function E1rmTrendChart({ compact = false, data, exerciseId }: E1rmTrendChartProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const { rows, series } = useMemo(() => {
    const filteredPoints = exerciseId
      ? data.filter((point) => point.exerciseId === exerciseId)
      : data
    const seriesLookup = new Map<number, { exerciseId: number; exerciseName: string; lastDate: string }>()

    for (const point of [...filteredPoints].sort((left, right) => right.date.localeCompare(left.date))) {
      if (!seriesLookup.has(point.exerciseId)) {
        seriesLookup.set(point.exerciseId, {
          exerciseId: point.exerciseId,
          exerciseName: point.exerciseName,
          lastDate: point.date,
        })
      }
    }

    const visibleSeries = Array.from(seriesLookup.values())
      .sort((left, right) => right.lastDate.localeCompare(left.lastDate))
      .slice(0, compact ? 3 : 4)
      .map((entry, index) => ({
        ...entry,
        color: CHART_COLORS[index % CHART_COLORS.length],
        key: `exercise_${entry.exerciseId}`,
      }))
    const seriesById = new Map(visibleSeries.map((entry) => [entry.exerciseId, entry]))
    const rowMap = new Map<string, Record<string, number | string>>()

    for (const point of [...filteredPoints].sort((left, right) => left.date.localeCompare(right.date))) {
      const seriesEntry = seriesById.get(point.exerciseId)
      if (!seriesEntry) {
        continue
      }

      const current = rowMap.get(point.date) ?? { date: point.date, label: formatShortDate(point.date) }
      current[seriesEntry.key] = point.e1rm
      rowMap.set(point.date, current)
    }

    const rows = Array.from(rowMap.values())
      .sort((left, right) => String(left.date).localeCompare(String(right.date)))
      .slice(compact ? -10 : 0)

    return { rows, series: visibleSeries }
  }, [compact, data, exerciseId])

  return (
    <MeasuredChartContainer className={compact ? 'h-28 w-full' : 'h-72 w-full'}>
      {({ width, height }) => (
        <LineChart width={width} height={height} data={rows} margin={compact ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 8, right: 12, bottom: 8, left: 0 }}>
          {!compact ? <CartesianGrid strokeDasharray="3 3" className="opacity-30" /> : null}
          <XAxis dataKey="label" hide={compact} minTickGap={20} tickLine={false} axisLine={false} />
          <YAxis hide={compact} tickFormatter={(value) => formatCompactRoundedWeight(Number(value), preferredUnit, weightRoundingLbs)} width={48} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => {
              const numericValue = Array.isArray(value)
                ? Number(value[0] ?? 0)
                : typeof value === 'number'
                  ? value
                  : Number(value ?? 0)
              return [formatWeight(numericValue, preferredUnit, weightRoundingLbs), 'Estimated 1RM']
            }}
            labelFormatter={(_label, payload) => {
              const point = payload?.[0]?.payload as { date?: string } | undefined
              return point?.date ? formatShortDate(point.date) : ''
            }}
          />
          {!compact && series.length > 1 ? <Legend /> : null}
          {series.map((entry) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.exerciseName}
              stroke={entry.color}
              strokeWidth={compact ? 2.5 : 2}
              dot={!compact}
              connectNulls
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      )}
    </MeasuredChartContainer>
  )
}

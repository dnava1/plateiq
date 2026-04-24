'use client'

import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsBodyweightRepPoint } from '@/types/analytics'
import { CHART_COLORS, formatShortDate } from './chart-utils'
import { MeasuredChartContainer } from './MeasuredChartContainer'
import { ScrollableChartFrame } from './ScrollableChartFrame'

interface BodyweightRepTrendChartProps {
  compact?: boolean
  data: AnalyticsBodyweightRepPoint[]
  exerciseId?: number | null
}

export function BodyweightRepTrendChart({ compact = false, data, exerciseId }: BodyweightRepTrendChartProps) {
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
      .slice(0, exerciseId ? 1 : 4)
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
      current[seriesEntry.key] = point.bestReps
      rowMap.set(point.date, current)
    }

    return {
      rows: Array.from(rowMap.values()).sort((left, right) => String(left.date).localeCompare(String(right.date))),
      series: visibleSeries,
    }
  }, [data, exerciseId])
  const chartMinWidth = Math.max(320, 96 + rows.length * 44)
  const scrollKey = `${exerciseId ?? 'all'}-${rows.length}-${series.length}`
  const chart = (
    <MeasuredChartContainer allowOverflow className={compact ? 'h-44 w-full' : 'h-72 w-full'}>
      {({ width, height }) => {
        const useCompactLayout = compact
        const isNarrow = width < 420

        return (
          <LineChart width={width} height={height} data={rows} margin={useCompactLayout ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 8, right: isNarrow ? 8 : 12, bottom: isNarrow ? 12 : 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="label"
              hide={useCompactLayout}
              minTickGap={isNarrow ? 12 : 20}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              hide={useCompactLayout}
              allowDecimals={false}
              width={isNarrow ? 28 : 40}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              formatter={(value) => {
                const numericValue = Array.isArray(value)
                  ? Number(value[0] ?? 0)
                  : typeof value === 'number'
                    ? value
                    : Number(value ?? 0)
                return [`${numericValue} reps`, 'Best set']
              }}
              labelFormatter={(_label, payload) => {
                const point = payload?.[0]?.payload as { date?: string } | undefined
                return point?.date ? formatShortDate(point.date) : ''
              }}
              offset={18}
              wrapperStyle={{ pointerEvents: 'none', zIndex: 30 }}
            />
            {series.map((entry) => (
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.exerciseName}
                stroke={entry.color}
                strokeWidth={useCompactLayout || isNarrow ? 2.5 : 2}
                dot={!useCompactLayout && !isNarrow}
                connectNulls
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        )
      }}
    </MeasuredChartContainer>
  )

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {compact ? chart : (
        <ScrollableChartFrame minWidth={chartMinWidth} scrollKey={scrollKey}>
          {chart}
        </ScrollableChartFrame>
      )}

      {!compact && series.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {series.map((entry) => (
            <div key={entry.key} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
              <span>{entry.exerciseName}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatWeight } from '@/lib/utils'
import { ChartTooltipContent } from './ChartTooltipContent'
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

const MAX_VISIBLE_SERIES = 5

interface E1rmVisibleSeries {
  color: string
  exerciseId: number
  exerciseName: string
  key: string
  lastDate: string
  pointCount: number
}

function E1rmTooltip({
  active,
  label,
  payload,
  preferredUnit,
  weightRoundingLbs,
}: {
  active?: boolean
  label?: string
  payload?: Array<{
    color?: string
    dataKey?: string
    name?: string
    payload?: { date?: string; exerciseName?: string }
    value?: number | string | Array<number | string>
  }>
  preferredUnit: 'kg' | 'lbs'
  weightRoundingLbs: number
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const rows = payload.reduce<Array<{ color?: string; label: string; value: string }>>((accumulator, entry) => {
      const numericValue = Array.isArray(entry.value)
        ? Number(entry.value[0] ?? 0)
        : typeof entry.value === 'number'
          ? entry.value
          : Number(entry.value ?? 0)

      if (!Number.isFinite(numericValue)) {
        return accumulator
      }

      accumulator.push({
        color: entry.color,
        label: entry.name ?? entry.payload?.exerciseName ?? 'Estimated 1RM',
        value: formatWeight(numericValue, preferredUnit, weightRoundingLbs),
      })

      return accumulator
    }, [])

  const resolvedDate = payload[0]?.payload?.date ?? label
  return <ChartTooltipContent label={resolvedDate ? formatShortDate(resolvedDate) : 'Estimated 1RM'} rows={rows} />
}

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
    const seriesLookup = new Map<number, { exerciseId: number; exerciseName: string; lastDate: string; pointCount: number }>()

    for (const point of filteredPoints) {
      const current = seriesLookup.get(point.exerciseId)

      if (current) {
        current.pointCount += 1
        if (point.date > current.lastDate) {
          current.lastDate = point.date
        }
        continue
      }

      seriesLookup.set(point.exerciseId, {
        exerciseId: point.exerciseId,
        exerciseName: point.exerciseName,
        lastDate: point.date,
        pointCount: 1,
      })
    }

    const visibleSeries: E1rmVisibleSeries[] = Array.from(seriesLookup.values())
      .sort((left, right) => {
        const lastDateComparison = right.lastDate.localeCompare(left.lastDate)

        if (lastDateComparison !== 0) {
          return lastDateComparison
        }

        const pointCountComparison = right.pointCount - left.pointCount
        if (pointCountComparison !== 0) {
          return pointCountComparison
        }

        return left.exerciseName.localeCompare(right.exerciseName)
      })
      .slice(0, exerciseId ? 1 : MAX_VISIBLE_SERIES)
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
    <div className="flex h-full flex-col">
      <MeasuredChartContainer allowOverflow className={compact ? 'h-24 w-full' : 'h-72 w-full'}>
        {({ width, height }) => (
          <LineChart width={width} height={height} data={rows} margin={compact ? { top: 8, right: 12, bottom: 8, left: 8 } : { top: 8, right: 12, bottom: 8, left: 0 }}>
            {!compact ? <CartesianGrid strokeDasharray="3 3" className="opacity-30" /> : null}
            <XAxis dataKey="label" hide={compact} minTickGap={20} tickLine={false} axisLine={false} />
            <YAxis hide={compact} tickFormatter={(value) => formatCompactRoundedWeight(Number(value), preferredUnit, weightRoundingLbs)} width={48} tickLine={false} axisLine={false} />
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              content={(props) => (
                <E1rmTooltip
                  active={props.active}
                  label={typeof props.label === 'string' ? props.label : undefined}
                  payload={props.payload as unknown as Array<{
                    color?: string
                    dataKey?: string
                    name?: string
                    payload?: { date?: string; exerciseName?: string }
                    value?: number | string | Array<number | string>
                  }> | undefined}
                  preferredUnit={preferredUnit}
                  weightRoundingLbs={weightRoundingLbs}
                />
              )}
              cursor={{ className: 'stroke-border/60' }}
              offset={18}
              wrapperStyle={{ pointerEvents: 'none', zIndex: 30 }}
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

      {compact && series.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          {series.map((entry) => (
            <div key={entry.key} className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="truncate">{entry.exerciseName}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

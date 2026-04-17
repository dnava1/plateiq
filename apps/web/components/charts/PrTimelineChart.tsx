'use client'

import { useMemo } from 'react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatWeight } from '@/lib/utils'
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsPrPoint } from '@/types/analytics'
import { CHART_COLORS, formatCompactNumber, formatShortDate } from './chart-utils'

interface PrTimelineChartProps {
  data: AnalyticsPrPoint[]
  exerciseId?: number | null
}

export function PrTimelineChart({ data, exerciseId }: PrTimelineChartProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const series = useMemo(() => {
    const filteredPoints = exerciseId
      ? data.filter((point) => point.exerciseId === exerciseId)
      : data
    const grouped = new Map<number, AnalyticsPrPoint[]>()

    for (const point of filteredPoints) {
      const current = grouped.get(point.exerciseId) ?? []
      current.push(point)
      grouped.set(point.exerciseId, current)
    }

    return Array.from(grouped.entries())
      .sort((left, right) => {
        const latestLeft = left[1].reduce((latest, point) => (point.date > latest ? point.date : latest), '')
        const latestRight = right[1].reduce((latest, point) => (point.date > latest ? point.date : latest), '')
        return latestRight.localeCompare(latestLeft)
      })
      .slice(0, exerciseId ? 1 : 4)
      .map(([id, points], index) => ({
        color: CHART_COLORS[index % CHART_COLORS.length],
        data: [...points]
          .sort((left, right) => left.date.localeCompare(right.date))
          .map((point) => ({
            date: point.date,
            e1rm: point.e1rm,
            exerciseName: point.exerciseName,
            reps: point.reps,
            timestamp: new Date(`${point.date}T00:00:00`).getTime(),
            weight: point.weight,
          })),
        exerciseId: id,
        exerciseName: points[0]?.exerciseName ?? `Exercise ${id}`,
      }))
  }, [data, exerciseId])

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            type="number"
            dataKey="timestamp"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => formatShortDate(Number(value))}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis type="number" dataKey="e1rm" tickFormatter={formatCompactNumber} width={48} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as {
                date: string
                e1rm: number
                exerciseName: string
                reps: number
                weight: number
              } | undefined

              if (!active || !point) {
                return null
              }

              return (
                <div className="rounded-[18px] border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{formatShortDate(point.date)}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{point.exerciseName}</p>
                  <p className="text-sm text-muted-foreground">Estimated 1RM {formatWeight(point.e1rm, preferredUnit, weightRoundingLbs)}</p>
                  <p className="text-xs text-muted-foreground">{formatWeight(point.weight, preferredUnit, weightRoundingLbs)} × {point.reps}</p>
                </div>
              )
            }}
          />
          {series.length > 1 ? <Legend /> : null}
          {series.map((entry) => (
            <Scatter key={entry.exerciseId} name={entry.exerciseName} data={entry.data} fill={entry.color} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

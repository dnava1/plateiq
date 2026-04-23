'use client'

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
} from 'recharts'
import type { AnalyticsMuscleBalancePoint } from '@/types/analytics'
import { CHART_COLORS, formatMovementPattern } from './chart-utils'
import { MeasuredChartContainer } from './MeasuredChartContainer'

interface MuscleBalanceChartProps {
  data: AnalyticsMuscleBalancePoint[]
  metricLabel?: string
  name?: string
}

export function MuscleBalanceChart({
  data,
  metricLabel = 'Set share',
  name = 'Set balance',
}: MuscleBalanceChartProps) {
  const rows = data.map((entry) => ({
    movementPattern: formatMovementPattern(entry.movementPattern),
    totalVolume: entry.totalVolume,
    volumePct: entry.volumePct,
  }))

  return (
    <MeasuredChartContainer className="h-72 w-full">
      {({ width, height }) => (
        <RadarChart width={width} height={height} data={rows} outerRadius="72%">
          <PolarGrid />
          <PolarAngleAxis dataKey="movementPattern" tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => {
              const numericValue = Array.isArray(value)
                ? Number(value[0] ?? 0)
                : typeof value === 'number'
                  ? value
                  : Number(value ?? 0)
              return [`${numericValue.toFixed(1)}%`, metricLabel]
            }}
          />
          <Legend />
          <Radar name={name} dataKey="volumePct" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.45} />
        </RadarChart>
      )}
    </MeasuredChartContainer>
  )
}

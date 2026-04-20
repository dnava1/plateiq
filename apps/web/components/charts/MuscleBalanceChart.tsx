'use client'

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from 'recharts'
import type { AnalyticsMuscleBalancePoint } from '@/types/analytics'
import { CHART_COLORS, formatMovementPattern } from './chart-utils'
import { MeasuredChartContainer } from './MeasuredChartContainer'

interface MuscleBalanceChartProps {
  data: AnalyticsMuscleBalancePoint[]
}

export function MuscleBalanceChart({ data }: MuscleBalanceChartProps) {
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
          <PolarRadiusAxis angle={30} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <Tooltip
            formatter={(value) => {
              const numericValue = Array.isArray(value)
                ? Number(value[0] ?? 0)
                : typeof value === 'number'
                  ? value
                  : Number(value ?? 0)
              return [`${numericValue.toFixed(1)}%`, 'Volume share']
            }}
          />
          <Legend />
          <Radar name="Volume balance" dataKey="volumePct" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.45} />
        </RadarChart>
      )}
    </MeasuredChartContainer>
  )
}

'use client'

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { AnalyticsMuscleBalancePoint } from '@/types/analytics'
import { CHART_COLORS, formatMovementPattern } from './chart-utils'

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
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} outerRadius="72%">
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
      </ResponsiveContainer>
    </div>
  )
}

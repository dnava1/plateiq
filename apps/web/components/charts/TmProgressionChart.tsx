'use client'

import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_COLORS, formatCompactNumber, formatShortDate } from './chart-utils'

interface TmProgressionPoint {
  effectiveDate: string
  weightLbs: number
}

interface TmProgressionChartProps {
  data: TmProgressionPoint[]
}

export function TmProgressionChart({ data }: TmProgressionChartProps) {
  const rows = useMemo(
    () => [...data]
      .sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate))
      .map((point) => ({
        ...point,
        label: formatShortDate(point.effectiveDate),
      })),
    [data],
  )

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" minTickGap={20} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={formatCompactNumber} width={48} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => {
              const numericValue = Array.isArray(value)
                ? Number(value[0] ?? 0)
                : typeof value === 'number'
                  ? value
                  : Number(value ?? 0)

              return [`${numericValue.toFixed(1)} lbs`, 'Training max']
            }}
            labelFormatter={(_label, payload) => {
              const point = payload?.[0]?.payload as { effectiveDate?: string } | undefined
              return point?.effectiveDate ? formatShortDate(point.effectiveDate) : ''
            }}
          />
          <Line
            type="stepAfter"
            dataKey="weightLbs"
            name="Training max"
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            dot
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
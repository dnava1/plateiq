'use client'

import { useRef } from 'react'
import { ChartTooltipContent } from './ChartTooltipContent'
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
} from 'recharts'
import type { AnalyticsMuscleBalancePoint } from '@/types/analytics'
import { CHART_COLORS, CHART_TOOLTIP_ALLOW_ESCAPE_VIEW_BOX, formatMovementPattern } from './chart-utils'
import { MeasuredChartContainer } from './MeasuredChartContainer'
import { HIDDEN_RECHARTS_TOOLTIP_WRAPPER_STYLE, RechartsViewportTooltipPortal } from './RechartsViewportTooltip'

interface MuscleBalanceTooltipPayload {
  color?: string
  payload?: { movementPattern?: string }
  value?: number | string | Array<number | string>
}

function MuscleBalanceTooltip({
  active,
  maxWidth,
  metricLabel,
  payload,
}: {
  active?: boolean
  maxWidth?: number
  metricLabel: string
  payload?: MuscleBalanceTooltipPayload[]
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const primaryEntry = payload[0]
  const numericValue = Array.isArray(primaryEntry?.value)
    ? Number(primaryEntry.value[0] ?? 0)
    : typeof primaryEntry?.value === 'number'
      ? primaryEntry.value
      : Number(primaryEntry?.value ?? 0)

  return (
    <ChartTooltipContent
      label={primaryEntry?.payload?.movementPattern ?? 'Movement balance'}
      maxWidth={maxWidth}
      rows={[
        {
          color: primaryEntry?.color,
          label: metricLabel,
          value: `${numericValue.toFixed(1)}%`,
        },
      ]}
    />
  )
}

interface MuscleBalanceChartProps {
  data: AnalyticsMuscleBalancePoint[]
  metricLabel?: string
  name?: string
}

function formatCompactMovementPattern(value: string) {
  switch (value) {
    case 'horizontal_pull':
      return 'H Pull'
    case 'horizontal_push':
      return 'H Push'
    case 'vertical_pull':
      return 'V Pull'
    case 'vertical_push':
      return 'V Push'
    default:
      return formatMovementPattern(value)
  }
}

function getRadarLayout(width: number) {
  if (width < 280) {
    return {
      dataKey: 'compactMovementPattern',
      margin: { top: 4, right: 2, bottom: 0, left: 2 },
      outerRadius: '62%',
      tickFontSize: 9,
    }
  }

  if (width < 340) {
    return {
      dataKey: 'movementPattern',
      margin: { top: 4, right: 4, bottom: 0, left: 4 },
      outerRadius: '68%',
      tickFontSize: 10,
    }
  }

  if (width < 480) {
    return {
      dataKey: 'movementPattern',
      margin: { top: 4, right: 4, bottom: 0, left: 4 },
      outerRadius: '72%',
      tickFontSize: 10,
    }
  }

  return {
    dataKey: 'movementPattern',
    margin: { top: 4, right: 20, bottom: 0, left: 20 },
    outerRadius: '82%',
    tickFontSize: 12,
  }
}

export function MuscleBalanceChart({
  data,
  metricLabel = 'Set share',
  name = 'Set balance',
}: MuscleBalanceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const rows = data.map((entry) => ({
    compactMovementPattern: formatCompactMovementPattern(entry.movementPattern),
    movementPattern: formatMovementPattern(entry.movementPattern),
    totalVolume: entry.totalVolume,
    volumePct: entry.volumePct,
  }))

  return (
    <div ref={chartContainerRef} className="relative">
      <MeasuredChartContainer allowOverflow className="h-64 w-full sm:h-72">
        {({ width, height }) => {
          const { dataKey, margin, outerRadius, tickFontSize } = getRadarLayout(width)

          return (
            <RadarChart
              width={width}
              height={height}
              data={rows}
              cy="46%"
              margin={margin}
              outerRadius={outerRadius}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey={dataKey} tick={{ fontSize: tickFontSize }} />
              <Tooltip
                allowEscapeViewBox={CHART_TOOLTIP_ALLOW_ESCAPE_VIEW_BOX}
                content={(props) => {
                  const payload = props.payload as unknown as MuscleBalanceTooltipPayload[] | undefined

                  return (
                    <RechartsViewportTooltipPortal
                      active={props.active}
                      chartContainerRef={chartContainerRef}
                      coordinate={props.coordinate && Number.isFinite(props.coordinate.x) && Number.isFinite(props.coordinate.y)
                        ? { x: props.coordinate.x, y: props.coordinate.y }
                        : undefined}
                      label={props.label}
                      offset={18}
                      payload={payload ?? []}
                      renderContent={({ maxWidth, payload }) => (
                        <MuscleBalanceTooltip active maxWidth={maxWidth} metricLabel={metricLabel} payload={payload} />
                      )}
                    />
                  )
                }}
                offset={18}
                wrapperStyle={HIDDEN_RECHARTS_TOOLTIP_WRAPPER_STYLE}
              />
              <Legend height={24} verticalAlign="bottom" />
              <Radar name={name} dataKey="volumePct" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.45} />
            </RadarChart>
          )
        }}
      </MeasuredChartContainer>
    </div>
  )
}

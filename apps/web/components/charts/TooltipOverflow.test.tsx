import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BodyweightRepTrendChart } from './BodyweightRepTrendChart'
import { BodyweightWeeklyVolumeChart } from './BodyweightWeeklyVolumeChart'
import { E1rmTrendChart } from './E1rmTrendChart'
import { MuscleBalanceChart } from './MuscleBalanceChart'
import { VolumeTrendChart } from './VolumeTrendChart'
import { CHART_TOOLTIP_ALLOW_ESCAPE_VIEW_BOX } from './chart-utils'

const mocks = vi.hoisted(() => ({
  preferredUnit: 'lbs' as 'kg' | 'lbs',
  weightRoundingLbs: 5,
  measuredContainerProps: [] as Array<{ allowOverflow?: boolean }>,
  tooltipProps: [] as Array<{ allowEscapeViewBox?: { x?: boolean; y?: boolean } }>,
}))

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => mocks.preferredUnit,
}))

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => mocks.weightRoundingLbs,
}))

vi.mock('./MeasuredChartContainer', () => ({
  MeasuredChartContainer: ({
    allowOverflow,
    children,
  }: {
    allowOverflow?: boolean
    children: (dimensions: { width: number; height: number }) => React.ReactNode
  }) => {
    mocks.measuredContainerProps.push({ allowOverflow })
    return <div>{children({ width: 640, height: 288 })}</div>
  },
}))

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Legend: () => null,
  Line: () => null,
  Bar: () => null,
  PolarAngleAxis: () => null,
  PolarGrid: () => null,
  Radar: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: (props: { allowEscapeViewBox?: { x?: boolean; y?: boolean } }) => {
    mocks.tooltipProps.push(props)
    return null
  },
}))

describe('chart tooltip viewport behavior', () => {
  beforeEach(() => {
    mocks.preferredUnit = 'lbs'
    mocks.weightRoundingLbs = 5
    mocks.measuredContainerProps.length = 0
    mocks.tooltipProps.length = 0
  })

  afterEach(() => {
    mocks.measuredContainerProps.length = 0
    mocks.tooltipProps.length = 0
  })

  it.each([
    {
      name: 'volume chart',
      renderChart: () => (
        <VolumeTrendChart
          data={[{ exerciseId: 1, exerciseName: 'Bench Press', totalSets: 5, totalVolume: 1200, weekStart: '2026-04-01' }]}
        />
      ),
    },
    {
      name: 'e1rm chart',
      renderChart: () => (
        <E1rmTrendChart
          data={[{ date: '2026-04-01', e1rm: 275, exerciseId: 1, exerciseName: 'Bench Press', reps: 5, weight: 225 }]}
        />
      ),
    },
    {
      name: 'bodyweight weekly volume chart',
      renderChart: () => (
        <BodyweightWeeklyVolumeChart
          data={[{ weekStart: '2026-04-01', totalReps: 42, totalSessions: 3 }]}
        />
      ),
    },
    {
      name: 'bodyweight rep trend chart',
      renderChart: () => (
        <BodyweightRepTrendChart
          data={[{ date: '2026-04-01', bestReps: 18, exerciseId: 1, exerciseName: 'Pull Up' }]}
        />
      ),
    },
    {
      name: 'muscle balance chart',
      renderChart: () => (
        <MuscleBalanceChart
          data={[{ movementPattern: 'horizontal_push', totalVolume: 1200, volumePct: 50 }]}
        />
      ),
    },
  ])('applies the shared tooltip overflow policy for the $name', ({ renderChart }) => {
    render(renderChart())

    expect(mocks.tooltipProps.at(-1)?.allowEscapeViewBox).toBe(CHART_TOOLTIP_ALLOW_ESCAPE_VIEW_BOX)
    expect(mocks.measuredContainerProps.at(-1)?.allowOverflow).toBe(true)
  })
})
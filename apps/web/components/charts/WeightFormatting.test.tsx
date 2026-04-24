import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConsistencyHeatmap } from './ConsistencyHeatmap'
import { E1rmTrendChart } from './E1rmTrendChart'
import { VolumeTrendChart } from './VolumeTrendChart'

const TEST_WEIGHT_LBS = 246

const mocks = vi.hoisted(() => ({
  preferredUnit: 'kg' as 'kg' | 'lbs',
  weightRoundingLbs: 5.51156,
}))

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => mocks.preferredUnit,
}))

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => mocks.weightRoundingLbs,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Legend: () => null,
  Line: () => null,
  Bar: () => null,
  Scatter: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="y-axis">{tickFormatter ? tickFormatter(TEST_WEIGHT_LBS) : ''}</div>
  ),
  Tooltip: ({ formatter, content }: { formatter?: (value: number) => unknown; content?: (payload: unknown) => React.ReactNode }) => {
    if (typeof formatter === 'function') {
      const result = formatter(TEST_WEIGHT_LBS)
      const label = Array.isArray(result) ? result[0] : result
      return <div data-testid="tooltip">{String(label)}</div>
    }

    if (typeof content === 'function') {
      return (
        <div data-testid="tooltip">
          {content({
            active: true,
            payload: [{
              color: '#f97316',
              name: 'Bench Press',
              payload: {
                date: '2026-04-01',
                weekStart: '2026-04-01',
                e1rm: TEST_WEIGHT_LBS,
                exerciseName: 'Bench Press',
                reps: 5,
                totalVolume: TEST_WEIGHT_LBS,
                weight: TEST_WEIGHT_LBS,
              },
              value: TEST_WEIGHT_LBS,
            }],
          })}
        </div>
      )
    }

    return null
  },
}))

describe('chart weight formatting', () => {
  it('formats e1rm chart axes and tooltips in the selected unit', () => {
    render(
      <E1rmTrendChart
        data={[{ date: '2026-04-01', e1rm: TEST_WEIGHT_LBS, exerciseId: 1, exerciseName: 'Bench Press', reps: 5, weight: TEST_WEIGHT_LBS }]}
      />,
    )

    expect(screen.getByTestId('y-axis')).toHaveTextContent('110')
    expect(screen.getByTestId('tooltip')).toHaveTextContent('110 kg')
    expect(screen.getByTestId('tooltip')).toHaveTextContent('Bench Press')
  })

  it('formats volume chart axes and tooltips in the selected unit', () => {
    render(
      <VolumeTrendChart
        data={[{ exerciseId: 1, exerciseName: 'Bench Press', totalSets: 5, totalVolume: TEST_WEIGHT_LBS, weekStart: '2026-04-01' }]}
      />,
    )

    expect(screen.getByTestId('y-axis')).toHaveTextContent('111.6')
    expect(screen.getByTestId('tooltip')).toHaveTextContent('111.6 kg')
  })

  it('formats heatmap titles in the selected unit', () => {
    render(
      <ConsistencyHeatmap
        data={[{ isActive: true, totalSessions: 1, totalSets: 5, totalVolume: TEST_WEIGHT_LBS, weekStart: '2026-04-01' }]}
      />,
    )

    const weekCell = screen.getByLabelText(/Week of /i)
    fireEvent.focus(weekCell)

    expect(screen.getByRole('tooltip')).toHaveTextContent('111.6 kg')
    expect(screen.getByRole('tooltip')).toHaveTextContent('5')
  })

  it('shows up to five exercise labels in the compact strength trend legend', () => {
    mocks.preferredUnit = 'lbs'

    render(
      <E1rmTrendChart
        compact
        data={[
          { date: '2026-04-01', e1rm: 300, exerciseId: 1, exerciseName: 'Squat', reps: 5, weight: 255 },
          { date: '2026-04-02', e1rm: 260, exerciseId: 2, exerciseName: 'Bench Press', reps: 5, weight: 225 },
          { date: '2026-04-03', e1rm: 340, exerciseId: 3, exerciseName: 'Deadlift', reps: 5, weight: 295 },
          { date: '2026-04-04', e1rm: 180, exerciseId: 4, exerciseName: 'Overhead Press', reps: 5, weight: 155 },
          { date: '2026-04-05', e1rm: 200, exerciseId: 5, exerciseName: 'Barbell Row', reps: 5, weight: 175 },
          { date: '2026-03-01', e1rm: 170, exerciseId: 6, exerciseName: 'Incline Bench', reps: 5, weight: 145 },
        ]}
      />,
    )

    expect(screen.getAllByText('Squat').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Deadlift').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Overhead Press').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Barbell Row').length).toBeGreaterThan(0)
    expect(screen.queryByText('Incline Bench')).not.toBeInTheDocument()
  })

  it('renders the non-compact strength trend legend outside the chart scroll area', () => {
    mocks.preferredUnit = 'lbs'

    render(
      <E1rmTrendChart
        data={[
          { date: '2026-04-01', e1rm: 300, exerciseId: 1, exerciseName: 'Squat', reps: 5, weight: 255 },
          { date: '2026-04-02', e1rm: 260, exerciseId: 2, exerciseName: 'Bench Press', reps: 5, weight: 225 },
        ]}
      />,
    )

    expect(screen.getAllByText('Squat').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0)
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsDashboard } from './AnalyticsDashboard'

const mocks = vi.hoisted(() => ({
  usePreferredUnit: vi.fn(),
  useExercises: vi.fn(),
  useAnalytics: vi.fn(),
}))

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: mocks.usePreferredUnit,
}))

vi.mock('@/hooks/useExercises', () => ({
  useExercises: mocks.useExercises,
}))

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: mocks.useAnalytics,
}))

vi.mock('./AiInsightsPanel', () => ({
  AiInsightsPanel: () => <div>ai-insights-panel</div>,
}))

vi.mock('@/components/charts/E1rmTrendChart', () => ({
  E1rmTrendChart: () => <div>e1rm-chart</div>,
}))

vi.mock('@/components/charts/VolumeTrendChart', () => ({
  VolumeTrendChart: () => <div>volume-chart</div>,
}))

vi.mock('@/components/charts/MuscleBalanceChart', () => ({
  MuscleBalanceChart: () => <div>muscle-balance-chart</div>,
}))

vi.mock('@/components/charts/PrTimelineChart', () => ({
  PrTimelineChart: () => <div>pr-timeline-chart</div>,
}))

vi.mock('@/components/charts/ConsistencyHeatmap', () => ({
  ConsistencyHeatmap: () => <div>consistency-heatmap</div>,
}))

vi.mock('@/components/charts/TmProgressionChart', () => ({
  TmProgressionChart: () => <div>tm-progression-chart</div>,
}))

vi.mock('./PlateCalculator', () => ({
  PlateCalculator: () => <div>plate-calculator</div>,
}))

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    mocks.usePreferredUnit.mockReturnValue('lbs')
    mocks.useExercises.mockReturnValue({
      data: [
        { id: 1, name: 'Bench Press' },
        { id: 2, name: 'Squat' },
      ],
    })
    mocks.useAnalytics.mockReturnValue({
      data: {
        e1rmTrend: [
          { date: '2026-03-20', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 6, e1rm: 246 },
        ],
        volumeTrend: [
          { weekStart: '2026-03-16', exerciseId: 1, exerciseName: 'Bench Press', totalVolume: 3200, totalSets: 5 },
        ],
        prHistory: [
          { date: '2026-03-20', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 6, e1rm: 246 },
        ],
        consistency: {
          totalSessions: 7,
          weeksActive: 5,
          firstSession: '2026-02-01',
          lastSession: '2026-03-20',
        },
        muscleBalance: [
          { movementPattern: 'push', totalVolume: 3200, volumePct: 55 },
        ],
        stallDetection: [
          { exerciseId: 2, exerciseName: 'Squat', lastPrDate: '2026-02-01', weeksSincePr: 6 },
        ],
        tmProgression: [],
      },
      isLoading: false,
    })
  })

  it('renders overview metrics and the expanded analytics tab set', () => {
    render(<AnalyticsDashboard />)

    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Strength' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Volume' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'AI Insights' })).toBeInTheDocument()
    expect(screen.getByText('plate-calculator')).toBeInTheDocument()
  })

  it('shows TM progression guidance on the strength tab and a readiness state on the AI tab', async () => {
    const user = userEvent.setup()

    render(<AnalyticsDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Strength' }))

    expect(screen.getByText('TM Progression')).toBeInTheDocument()
    expect(screen.getByText('Select an exercise to unlock the training max progression view.')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'AI Insights' }))

    expect(screen.getByText('ai-insights-panel')).toBeInTheDocument()
  })
})
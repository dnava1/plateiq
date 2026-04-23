import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyAnalyticsBodyweightLane, createEmptyAnalyticsCoverage } from '@/lib/analytics'
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

vi.mock('./StrengthProfilePanel', () => ({
  StrengthProfilePanel: () => <div>strength-profile-panel</div>,
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

vi.mock('@/components/charts/ConsistencyHeatmap', () => ({
  ConsistencyHeatmap: () => <div>consistency-heatmap</div>,
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
        bodyweightLane: createEmptyAnalyticsBodyweightLane(),
        coverage: createEmptyAnalyticsCoverage(),
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
    expect(screen.getAllByText('First Session').length).toBeGreaterThan(0)
    expect(screen.queryByText('Method Coverage')).not.toBeInTheDocument()
    expect(screen.queryByText('Training max')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Strength' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Volume' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'AI Insights' })).toBeInTheDocument()

    const plateauCard = screen.getByText('6 weeks').parentElement
    expect(plateauCard?.querySelector('svg')).toBeNull()
  })

  it('shows strength tab content and a readiness state on the AI tab', async () => {
    const user = userEvent.setup()

    render(<AnalyticsDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Strength' }))

    expect(screen.getByText('strength-profile-panel')).toBeInTheDocument()
    expect(screen.getByText('Estimated 1RM Trend')).toBeInTheDocument()
    expect(screen.queryByText('TM Progression')).not.toBeInTheDocument()
    expect(screen.queryByText('Training max')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'AI Insights' }))

    expect(screen.getByText('ai-insights-panel')).toBeInTheDocument()
  })

  it('formats analytics summaries in kilograms when kg is selected', async () => {
    const user = userEvent.setup()
    mocks.usePreferredUnit.mockReturnValue('kg')

    render(<AnalyticsDashboard />)

    await user.click(screen.getByRole('tab', { name: 'Strength' }))

    expect(screen.getByText('110 kg')).toBeInTheDocument()
    expect(screen.getByText('92.5 kg × 6')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Volume' }))

    expect(screen.getByText('1451.5 kg')).toBeInTheDocument()
  })

  it('shows the dedicated bodyweight review lane when bodyweight data exists', () => {
    const coverage = createEmptyAnalyticsCoverage()
    coverage.metrics.bodyweightLane = {
      family: 'bodyweight_specific',
      reasonCodes: [],
      signalCount: 3,
      status: 'ready',
    }

    mocks.useAnalytics.mockReturnValue({
      data: {
        bodyweightLane: {
          relevant: true,
          exerciseSummaries: [
            {
              exerciseId: 7,
              exerciseName: 'Pull-Up',
              lastSessionDate: '2026-03-22',
              latestStrictRepBest: 12,
              strictSessionCount: 2,
              totalLoggedReps: 42,
            },
          ],
          repTrend: [
            { bestReps: 12, date: '2026-03-22', exerciseId: 7, exerciseName: 'Pull-Up' },
          ],
          weeklyVolumeTrend: [
            { weekStart: '2026-03-17', totalReps: 42, totalSessions: 2 },
          ],
        },
        coverage,
        e1rmTrend: [],
        volumeTrend: [],
        prHistory: [],
        consistency: {
          totalSessions: 3,
          weeksActive: 2,
          firstSession: '2026-03-10',
          lastSession: '2026-03-23',
        },
        muscleBalance: [],
        stallDetection: [],
        tmProgression: [],
      },
      isLoading: false,
    })

    render(<AnalyticsDashboard />)

    expect(screen.queryByText('Method Coverage')).not.toBeInTheDocument()
    expect(screen.getByText('Bodyweight Exercise Review')).toBeInTheDocument()
    expect(screen.getAllByText('Pull-Up').length).toBeGreaterThan(0)
    expect(screen.getByText('Last Session Rep Best')).toBeInTheDocument()
    expect(screen.getByText('Rep Best Trend')).toBeInTheDocument()
    expect(screen.getByText('Track the top strict-rep set from each logged session.')).toBeInTheDocument()
    expect(screen.getByText('Weekly Rep Volume')).toBeInTheDocument()
    expect(screen.queryByText(/Highest recent completed set/i)).not.toBeInTheDocument()
  })
})
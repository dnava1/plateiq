import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createEmptyAnalyticsBodyweightLane, createEmptyAnalyticsCoverage } from '@/lib/analytics'
import { createEmptyStrengthProfile } from '@/lib/strength-profile'
import { DashboardOverview } from './DashboardOverview'

const mocks = vi.hoisted(() => ({
  usePreferredUnit: vi.fn(),
  useActiveProgram: vi.fn(),
  useDashboard: vi.fn(),
  useActiveCycle: vi.fn(),
  useCycleWorkouts: vi.fn(),
  useAnalytics: vi.fn(),
  resolveWorkoutProgram: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: mocks.usePreferredUnit,
}))

vi.mock('@/hooks/usePrograms', () => ({
  useActiveProgram: mocks.useActiveProgram,
}))

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: mocks.useDashboard,
}))

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: mocks.useAnalytics,
}))

vi.mock('@/hooks/useWorkouts', () => ({
  resolveWorkoutProgram: mocks.resolveWorkoutProgram,
  useActiveCycle: mocks.useActiveCycle,
  useCycleWorkouts: mocks.useCycleWorkouts,
}))

vi.mock('@/components/charts/ChartCard', () => ({
  ChartCard: ({ title, description, children, isEmpty, emptyMessage }: { title: string; description?: string; children: React.ReactNode; isEmpty?: boolean; emptyMessage?: string }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {isEmpty ? <p>{emptyMessage}</p> : children}
    </section>
  ),
}))

vi.mock('@/components/charts/E1rmTrendChart', () => ({
  E1rmTrendChart: () => <div>e1rm-chart</div>,
}))

vi.mock('@/components/charts/VolumeTrendChart', () => ({
  VolumeTrendChart: () => <div>volume-chart</div>,
}))

vi.mock('@/components/charts/ConsistencyHeatmap', () => ({
  ConsistencyHeatmap: () => <div>consistency-heatmap</div>,
}))

describe('DashboardOverview', () => {
  beforeEach(() => {
    mocks.usePreferredUnit.mockReturnValue('lbs')
    mocks.useDashboard.mockReturnValue({ data: null, isLoading: false })
    mocks.useActiveCycle.mockReturnValue({ data: null, isLoading: false })
    mocks.useCycleWorkouts.mockReturnValue({ data: [] })
    mocks.useAnalytics.mockReturnValue({
      data: {
        bodyweightLane: createEmptyAnalyticsBodyweightLane(),
        coverage: createEmptyAnalyticsCoverage(),
        e1rmTrend: [],
        volumeTrend: [],
        prHistory: [],
        consistency: {
          totalSessions: 0,
          weeksActive: 0,
          firstSession: null,
          lastSession: null,
        },
        muscleBalance: [],
        stallDetection: [],
        tmProgression: [],
        strengthProfile: createEmptyStrengthProfile(),
      },
      isLoading: false,
    })
    mocks.resolveWorkoutProgram.mockReturnValue({ template: null, isCustom: false })
  })

  it('renders the empty state when there is no active program', () => {
    mocks.useActiveProgram.mockReturnValue({ data: null, isLoading: false })

    render(<DashboardOverview />)

    expect(screen.getByText('No active program yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Start a Program/i })).toHaveAttribute('href', '/programs')
  })

  it('renders dashboard widgets from rpc data while keeping next workout and cycle progress client-derived', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: {
        id: 12,
        name: '5/3/1 Beefcake',
        config: { variation_key: 'bbb' },
      },
      isLoading: false,
    })
    mocks.resolveWorkoutProgram.mockReturnValue({
      isCustom: false,
      template: {
        cycle_length_weeks: 2,
        days_per_week: 2,
        days: [{ label: 'Day A' }, { label: 'Day B' }],
        variation_options: [{ key: 'bbb', name: 'Boring But Big' }],
      },
    })
    mocks.useDashboard.mockReturnValue({
      data: {
        activeProgram: { id: 12, name: '5/3/1 Beefcake', templateKey: 'wendler_531' },
        currentCycle: { id: 3, cycleNumber: 2 },
        currentTms: [
          { exerciseId: 2, exerciseName: 'Squat', weightLbs: 315, effectiveDate: '2026-04-01' },
          { exerciseId: 1, exerciseName: 'Bench Press', weightLbs: 225, effectiveDate: '2026-04-01' },
        ],
        recentWorkouts: [
          { id: 91, exerciseName: 'Bench Press', weekNumber: 1, completedAt: '2026-04-05T12:00:00Z', scheduledDate: '2026-04-05' },
          { id: 92, exerciseName: 'Squat', weekNumber: 1, completedAt: null, scheduledDate: '2026-04-07' },
        ],
      },
      isLoading: false,
    })
    mocks.useActiveCycle.mockReturnValue({ data: { id: 3, cycle_number: 2 }, isLoading: false })
    mocks.useCycleWorkouts.mockReturnValue({
      data: [
        { week_number: 1, day_label: 'Day A', completed_at: '2026-04-05T12:00:00Z' },
      ],
    })
    mocks.useAnalytics.mockReturnValue({
      data: {
        e1rmTrend: [
          { date: '2026-04-05', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 6, e1rm: 246 },
        ],
        volumeTrend: [
          { weekStart: '2026-03-30', exerciseId: 1, exerciseName: 'Bench Press', totalVolume: 3400, totalSets: 6 },
          { weekStart: '2026-04-06', exerciseId: 2, exerciseName: 'Squat', totalVolume: 4200, totalSets: 7 },
        ],
        prHistory: [
          { date: '2026-03-20', exerciseId: 1, exerciseName: 'Bench Press', weight: 200, reps: 6, e1rm: 238.5 },
          { date: '2026-04-05', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 6, e1rm: 246 },
        ],
        consistency: {
          totalSessions: 4,
          weeksActive: 2,
          firstSession: '2026-03-20',
          lastSession: '2026-04-05',
        },
        muscleBalance: [],
        stallDetection: [],
        tmProgression: [],
        strengthProfile: createEmptyStrengthProfile(),
      },
      isLoading: false,
    })

    render(<DashboardOverview />)

    expect(screen.getByText('5/3/1 Beefcake')).toBeInTheDocument()
    expect(screen.getByText('Week 1 · Day B')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open workouts/i })).toHaveAttribute('href', '/workouts')
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Squat').length).toBeGreaterThan(0)
    expect(screen.getByText(/over the prior best/i)).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('uses week-specific day layouts when suggesting the next workout and cycle progress', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: {
        id: 12,
        name: 'Alternating Upper',
        config: null,
      },
      isLoading: false,
    })
    mocks.resolveWorkoutProgram.mockReturnValue({
      isCustom: true,
      template: {
        cycle_length_weeks: 2,
        days_per_week: 1,
        days: [{ label: 'Week 1 OHP', exercise_blocks: [] }],
        week_schemes: {
          '2': {
            label: 'Week 2',
            days: [
              { label: 'Week 2 Bench', exercise_blocks: [] },
              { label: 'Week 2 Row', exercise_blocks: [] },
            ],
          },
        },
      },
    })
    mocks.useDashboard.mockReturnValue({
      data: {
        activeProgram: { id: 12, name: 'Alternating Upper', templateKey: 'custom' },
        currentCycle: { id: 7, cycleNumber: 3 },
        currentTms: [],
        recentWorkouts: [],
      },
      isLoading: false,
    })
    mocks.useActiveCycle.mockReturnValue({ data: { id: 7, cycle_number: 3 }, isLoading: false })
    mocks.useCycleWorkouts.mockReturnValue({
      data: [
        { week_number: 1, day_label: 'Week 1 OHP', completed_at: '2026-04-05T12:00:00Z' },
      ],
    })

    render(<DashboardOverview />)

    expect(screen.getAllByText('Week 2').length).toBeGreaterThan(0)
    expect(screen.getByText('33%')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 sessions complete.')).toBeInTheDocument()
    expect(screen.getByText('2 sessions still open in this block.')).toBeInTheDocument()
  })

  it('formats volume pace copy in kilograms when kg is selected', () => {
    mocks.usePreferredUnit.mockReturnValue('kg')
    mocks.useActiveProgram.mockReturnValue({
      data: {
        id: 12,
        name: '5/3/1 Beefcake',
        config: { variation_key: 'bbb' },
      },
      isLoading: false,
    })
    mocks.resolveWorkoutProgram.mockReturnValue({
      isCustom: false,
      template: {
        cycle_length_weeks: 2,
        days_per_week: 2,
        days: [{ label: 'Day A' }, { label: 'Day B' }],
        variation_options: [{ key: 'bbb', name: 'Boring But Big' }],
      },
    })
    mocks.useDashboard.mockReturnValue({
      data: {
        activeProgram: { id: 12, name: '5/3/1 Beefcake', templateKey: 'wendler_531' },
        currentCycle: { id: 3, cycleNumber: 2 },
        currentTms: [],
        recentWorkouts: [],
      },
      isLoading: false,
    })
    mocks.useAnalytics.mockReturnValue({
      data: {
        e1rmTrend: [],
        volumeTrend: [
          { weekStart: '2026-03-30', exerciseId: 1, exerciseName: 'Bench Press', totalVolume: 3400, totalSets: 6 },
          { weekStart: '2026-04-06', exerciseId: 2, exerciseName: 'Squat', totalVolume: 4200, totalSets: 7 },
        ],
        prHistory: [],
        consistency: {
          totalSessions: 4,
          weeksActive: 2,
          firstSession: '2026-03-20',
          lastSession: '2026-04-05',
        },
        muscleBalance: [],
        stallDetection: [],
        tmProgression: [],
        strengthProfile: createEmptyStrengthProfile(),
      },
      isLoading: false,
    })

    render(<DashboardOverview />)

    expect(screen.getByText('This week 1,905.1 kg vs 1,542.2 kg recent average.')).toBeInTheDocument()
  })

  it('formats recent PR deltas in kilograms when kg is selected', () => {
    mocks.usePreferredUnit.mockReturnValue('kg')
    mocks.useActiveProgram.mockReturnValue({
      data: {
        id: 12,
        name: '5/3/1 Beefcake',
        config: { variation_key: 'bbb' },
      },
      isLoading: false,
    })
    mocks.resolveWorkoutProgram.mockReturnValue({
      isCustom: false,
      template: {
        cycle_length_weeks: 2,
        days_per_week: 2,
        days: [{ label: 'Day A' }, { label: 'Day B' }],
        variation_options: [{ key: 'bbb', name: 'Boring But Big' }],
      },
    })
    mocks.useDashboard.mockReturnValue({
      data: {
        activeProgram: { id: 12, name: '5/3/1 Beefcake', templateKey: 'wendler_531' },
        currentCycle: { id: 3, cycleNumber: 2 },
        currentTms: [],
        recentWorkouts: [],
      },
      isLoading: false,
    })
    mocks.useAnalytics.mockReturnValue({
      data: {
        e1rmTrend: [],
        volumeTrend: [],
        prHistory: [
          { date: '2026-03-20', exerciseId: 1, exerciseName: 'Bench Press', weight: 200, reps: 6, e1rm: 238.5 },
          { date: '2026-04-05', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 6, e1rm: 246 },
        ],
        consistency: {
          totalSessions: 4,
          weeksActive: 2,
          firstSession: '2026-03-20',
          lastSession: '2026-04-05',
        },
        muscleBalance: [],
        stallDetection: [],
        tmProgression: [],
        strengthProfile: createEmptyStrengthProfile(),
      },
      isLoading: false,
    })

    render(<DashboardOverview />)

    expect(screen.getByText(/\+2.5 kg over the prior best/i)).toBeInTheDocument()
  })

  it('shows a compact bodyweight review teaser when bodyweight analytics are available', () => {
    const coverage = createEmptyAnalyticsCoverage()
    coverage.metrics.bodyweightLane = {
      family: 'bodyweight_specific',
      reasonCodes: [],
      signalCount: 3,
      status: 'ready',
    }

    mocks.useActiveProgram.mockReturnValue({
      data: {
        id: 12,
        name: '5/3/1 Beefcake',
        config: { variation_key: 'bbb' },
      },
      isLoading: false,
    })
    mocks.resolveWorkoutProgram.mockReturnValue({
      isCustom: false,
      template: {
        cycle_length_weeks: 2,
        days_per_week: 2,
        days: [{ label: 'Day A' }, { label: 'Day B' }],
        variation_options: [{ key: 'bbb', name: 'Boring But Big' }],
      },
    })
    mocks.useDashboard.mockReturnValue({
      data: {
        activeProgram: { id: 12, name: '5/3/1 Beefcake', templateKey: 'wendler_531' },
        currentCycle: { id: 3, cycleNumber: 2 },
        currentTms: [],
        recentWorkouts: [],
      },
      isLoading: false,
    })
    mocks.useAnalytics.mockReturnValue({
      data: {
        bodyweightLane: {
          relevant: true,
          exerciseSummaries: [
            {
              exerciseId: 7,
              exerciseName: 'Pull-Up',
              lastSessionDate: '2026-04-05',
              latestStrictRepBest: 12,
              strictSessionCount: 2,
              totalLoggedReps: 42,
            },
          ],
          repTrend: [],
          weeklyVolumeTrend: [],
        },
        coverage,
        e1rmTrend: [],
        volumeTrend: [],
        prHistory: [],
        consistency: {
          totalSessions: 4,
          weeksActive: 2,
          firstSession: '2026-03-20',
          lastSession: '2026-04-05',
        },
        muscleBalance: [],
        stallDetection: [],
        tmProgression: [],
        strengthProfile: createEmptyStrengthProfile(),
      },
      isLoading: false,
    })

    render(<DashboardOverview />)

    expect(screen.getByText('Bodyweight Exercise Review')).toBeInTheDocument()
    expect(screen.queryByText('Open bodyweight exercise review')).not.toBeInTheDocument()
    expect(screen.getByText(/Last session rep best 12 reps/i)).toBeInTheDocument()
  })
})
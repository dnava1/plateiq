import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyAnalyticsCoverage } from '@/lib/analytics'
import type { TrainingInsightResult } from '@/types/insights'
import { AiInsightsPanel } from './AiInsightsPanel'

const mocks = vi.hoisted(() => ({
  useInsights: vi.fn(),
}))

vi.mock('@/hooks/useInsights', () => ({
  useInsights: mocks.useInsights,
}))

function createMockDate(localDate: string, utcDate: string) {
  const [year, month, day] = localDate.split('-').map(Number)

  return {
    getFullYear: () => year,
    getMonth: () => month - 1,
    getDate: () => day,
    toISOString: () => `${utcDate}T00:00:00.000Z`,
  } as unknown as Date
}

describe('AiInsightsPanel', () => {
  beforeEach(() => {
    mocks.useInsights.mockReset()
  })

  function createInsight(overrides: Partial<TrainingInsightResult> = {}): TrainingInsightResult {
    return {
      summary: 'Bench press is trending well while squat needs more attention.',
      strengths: ['Bench press estimated 1RM is climbing.'],
      concerns: ['Squat PR pace has cooled off.'],
      recommendations: ['Keep bench volume steady and add one squat top set next week.'],
      progressionGuidance: {
        disposition: 'actionable',
        action: 'increase',
        exerciseName: 'Bench Press',
        methodContext: 'loaded_strength',
        rationale: 'You have enough comparable signal to nudge Bench Press forward without changing the rest of the block.',
      },
      generatedAt: '2026-04-01T12:00:00.000Z',
      source: 'generated',
      ...overrides,
    }
  }

  function createUseInsightsResult(overrides: Partial<ReturnType<typeof mocks.useInsights>> = {}) {
    return {
      error: null,
      generate: vi.fn(),
      insight: null,
      isLoading: false,
      isPending: false,
      reset: vi.fn(),
      ...overrides,
    }
  }

  function formatGeneratedAt(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  function createCoverage() {
    const coverage = createEmptyAnalyticsCoverage()
    coverage.metrics.consistency = {
      family: 'general_logging',
      reasonCodes: [],
      signalCount: 6,
      status: 'ready',
    }
    return coverage
  }

  it('uses the current filter and renders structured insight sections', () => {
    const insight = createInsight()

    mocks.useInsights.mockReturnValue(createUseInsightsResult({
      insight,
    }))

    render(
      <AiInsightsPanel
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 3 months"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={1}
        selectedExerciseName="Bench Press"
      />, 
    )

    expect(screen.queryByText('Insight Ready')).not.toBeInTheDocument()
    expect(screen.queryByText('Ready Families')).not.toBeInTheDocument()
    expect(screen.queryByText('Bodyweight Lane')).not.toBeInTheDocument()
    expect(screen.queryByText('Signals worth preserving.')).not.toBeInTheDocument()
    expect(screen.queryByText('Areas to watch before they become problems.')).not.toBeInTheDocument()
    expect(screen.queryByText('Practical next actions for the current training block.')).not.toBeInTheDocument()
    expect(mocks.useInsights).toHaveBeenCalledWith({
      dateFrom: '2026-02-01',
      dateTo: '2026-04-01',
      exerciseId: 1,
    })
    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Progression Guidance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Strengths' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Concerns' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recommendations' })).toBeInTheDocument()
    expect(screen.getByText('Increase')).toBeInTheDocument()
    expect(screen.getByText('Loaded strength')).toBeInTheDocument()
    expect(screen.getByText('Bench press is trending well while squat needs more attention.')).toBeInTheDocument()
    expect(screen.getByText('Fresh insight')).toBeInTheDocument()
    expect(screen.getByText(`Generated ${formatGeneratedAt(insight.generatedAt)}`)).toBeInTheDocument()
  })

  it('renders a bounded progression note when the current scope should stay retrospective', async () => {
    mocks.useInsights.mockReturnValue(createUseInsightsResult({
      insight: createInsight({
        progressionGuidance: {
          disposition: 'bounded',
          note: 'Generate this insight for one selected exercise to unlock bounded progression guidance. Broader scopes stay retrospective so the next-step decision remains yours.',
          reason: 'broader_scope',
        },
        source: 'cached',
        summary: 'The current filter is useful for review, but it is still broader than one supported lift call.',
        strengths: ['Consistency is holding together.'],
        concerns: ['The current filter mixes multiple priorities.'],
        recommendations: ['Use a single-lift filter before making a progression call.'],
      }),
    }))

    render(
      <AiInsightsPanel
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 3 months"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={null}
        selectedExerciseName={null}
      />,
    )

    expect(screen.queryByText(/broader scopes stay retrospective/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Progression guidance bounded')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Progression Guidance' })).not.toBeInTheDocument()
    expect(screen.getByText('Latest saved insight')).toBeInTheDocument()
  })

  it('shows inline errors when loading or generation fails', () => {
    mocks.useInsights.mockReturnValue(createUseInsightsResult({
      error: new Error('Provider quota exceeded'),
    }))

    render(
      <AiInsightsPanel
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 3 months"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={1}
        selectedExerciseName="Bench Press"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Provider quota exceeded')
  })

  it('requests a fresh insight when the button is clicked', async () => {
    const user = userEvent.setup()
    const generate = vi.fn()

    mocks.useInsights.mockReturnValue(createUseInsightsResult({
      generate,
    }))

    render(
      <AiInsightsPanel
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 3 months"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={1}
        selectedExerciseName="Bench Press"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Generate insight for Bench Press' }))

    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('clears the previous insight when the active filter changes', async () => {
    mocks.useInsights
      .mockReturnValueOnce(createUseInsightsResult({
        insight: createInsight({
          progressionGuidance: {
            disposition: 'actionable',
            action: 'hold',
            exerciseName: 'Bench Press',
            methodContext: 'loaded_strength',
            rationale: 'You have enough comparable signal to keep this lift moving without forcing a bigger change yet.',
          },
        }),
      }))
      .mockReturnValueOnce(createUseInsightsResult())

    const { rerender } = render(
      <AiInsightsPanel
        key="bench"
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 3 months"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={1}
        selectedExerciseName="Bench Press"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()

    rerender(
      <AiInsightsPanel
        key="squat"
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 3 months"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={2}
        selectedExerciseName="Squat"
      />,
    )

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Summary' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Generate insight for Squat' })).toBeInTheDocument()
    expect(mocks.useInsights).toHaveBeenLastCalledWith({
      dateFrom: '2026-02-01',
      dateTo: '2026-04-01',
      exerciseId: 2,
    })
  })

  it('disables generation when analytics data is not ready', () => {
    mocks.useInsights.mockReturnValue(createUseInsightsResult())

    render(
      <AiInsightsPanel
        coverage={createEmptyAnalyticsCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 3 months"
        hasAnalyticsData={false}
        isInsightEligible={false}
        selectedExerciseId={null}
        selectedExerciseName={null}
      />,
    )

    expect(screen.getByRole('button', { name: 'Generate insight for current analytics filter' })).toBeDisabled()
  })
})

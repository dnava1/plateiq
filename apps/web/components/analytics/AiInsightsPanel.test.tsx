import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyAnalyticsCoverage } from '@/lib/analytics'
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

  it('submits the current filter and renders structured insight sections', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    const mutate = vi.fn((_input, options) => {
      options?.onSuccess?.({
        summary: 'Bench press is trending well while squat needs more attention.',
        strengths: ['Bench press estimated 1RM is climbing.'],
        concerns: ['Squat PR pace has cooled off.'],
        recommendations: ['Keep bench volume steady and add one squat top set next week.'],
        progressionGuidance: {
          disposition: 'actionable',
          action: 'increase',
          exerciseName: 'Bench Press',
          methodContext: 'main_lift_amrap',
          rationale: 'You have enough comparable signal to nudge Bench Press forward without changing the rest of the block.',
        },
      })
    })

    mocks.useInsights.mockReturnValue({
      isPending: false,
      mutate,
      reset,
    })

    render(
      <AiInsightsPanel
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 8 weeks"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={1}
        selectedExerciseName="Bench Press"
      />, 
    )

    await user.click(screen.getByRole('button', { name: 'Generate insight for Bench Press' }))

    expect(reset).toHaveBeenCalled()
    expect(mutate).toHaveBeenCalledWith(
      {
        dateFrom: '2026-02-01',
        dateTo: '2026-04-01',
        exerciseId: 1,
      },
      expect.any(Object),
    )
    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Progression Guidance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Strengths' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Concerns' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recommendations' })).toBeInTheDocument()
    expect(screen.getByText('Increase')).toBeInTheDocument()
    expect(screen.getByText('Bench press is trending well while squat needs more attention.')).toBeInTheDocument()
  })

  it('renders a bounded progression note when the current scope should stay retrospective', async () => {
    const user = userEvent.setup()

    mocks.useInsights.mockReturnValue({
      isPending: false,
      mutate: vi.fn((_input, options) => {
        options?.onSuccess?.({
          summary: 'The current filter is useful for review, but it is still broader than one supported lift call.',
          strengths: ['Consistency is holding together.'],
          concerns: ['The current filter mixes multiple priorities.'],
          recommendations: ['Use a single-lift filter before making a progression call.'],
          progressionGuidance: {
            disposition: 'bounded',
            note: 'Generate this insight for one selected exercise to unlock bounded progression guidance. Broader scopes stay retrospective so the next-step decision remains yours.',
            reason: 'broader_scope',
          },
        })
      }),
      reset: vi.fn(),
    })

    render(
      <AiInsightsPanel
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 8 weeks"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={null}
        selectedExerciseName={null}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Generate insight for current analytics filter' }))

    expect(screen.getByText('Progression guidance bounded')).toBeInTheDocument()
    expect(screen.getByText(/broader scopes stay retrospective/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Progression Guidance' })).not.toBeInTheDocument()
  })

  it('shows inline errors when generation fails', async () => {
    const user = userEvent.setup()

    mocks.useInsights.mockReturnValue({
      isPending: false,
      mutate: vi.fn((_input, options) => {
        options?.onError?.(new Error('Provider quota exceeded'))
      }),
      reset: vi.fn(),
    })

    render(
      <AiInsightsPanel
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 8 weeks"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={1}
        selectedExerciseName="Bench Press"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Generate insight for Bench Press' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Provider quota exceeded')
  })

  it('clears the previous insight when the active filter changes', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    const mutate = vi.fn((_input, options) => {
      options?.onSuccess?.({
        summary: 'Bench press is trending well while squat needs more attention.',
        strengths: ['Bench press estimated 1RM is climbing.'],
        concerns: ['Squat PR pace has cooled off.'],
        recommendations: ['Keep bench volume steady and add one squat top set next week.'],
        progressionGuidance: {
          disposition: 'actionable',
          action: 'hold',
          exerciseName: 'Bench Press',
          methodContext: 'main_lift_amrap',
          rationale: 'You have enough comparable signal to keep this lift moving without forcing a bigger change yet.',
        },
      })
    })

    mocks.useInsights.mockReturnValue({
      isPending: false,
      mutate,
      reset,
    })

    const { rerender } = render(
      <AiInsightsPanel
        key="bench"
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 8 weeks"
        hasAnalyticsData
        isInsightEligible
        selectedExerciseId={1}
        selectedExerciseName="Bench Press"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Generate insight for Bench Press' }))
    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()

    rerender(
      <AiInsightsPanel
        key="squat"
        coverage={createCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 8 weeks"
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
  })

  it('disables generation when analytics data is not ready', () => {
    mocks.useInsights.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    })

    render(
      <AiInsightsPanel
        coverage={createEmptyAnalyticsCoverage()}
        dateRange={{ from: createMockDate('2026-02-01', '2026-01-31'), to: createMockDate('2026-04-01', '2026-03-31') }}
        dateRangeLabel="Last 8 weeks"
        hasAnalyticsData={false}
        isInsightEligible={false}
        selectedExerciseId={null}
        selectedExerciseName={null}
      />,
    )

    expect(screen.getByRole('button', { name: 'Generate insight for current analytics filter' })).toBeDisabled()
  })
})
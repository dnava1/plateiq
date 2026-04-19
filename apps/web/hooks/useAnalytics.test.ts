import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyAnalyticsBodyweightLane, createEmptyAnalyticsCoverage } from '@/lib/analytics'
import { createEmptyStrengthProfile } from '@/lib/strength-profile'
import { analyticsQueryKeys, useAnalytics } from './useAnalytics'

const useSupabaseMock = vi.fn()

vi.mock('./useSupabase', () => ({
  useSupabase: () => useSupabaseMock(),
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useAnalytics', () => {
  beforeEach(() => {
    useSupabaseMock.mockReset()
  })

  it('calls get_analytics_data via rpc with exercise and date filters', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        e1rm_trend: [
          {
            date: '2026-03-20',
            exercise_id: 2,
            exercise_name: 'Squat',
            weight: 315,
            reps: 5,
            e1rm: 367.5,
          },
        ],
        volume_trend: [],
        pr_history: [],
        consistency: {
          total_sessions: 5,
          weeks_active: 4,
          first_session: '2026-02-01',
          last_session: '2026-03-20',
        },
        muscle_balance: [],
        stall_detection: [],
        tm_progression: [],
      },
      error: null,
    })

    useSupabaseMock.mockReturnValue({ rpc })

    const { result } = renderHook(
      () => useAnalytics(2, {
        from: createMockDate('2026-02-01', '2026-01-31'),
        to: createMockDate('2026-04-01', '2026-03-31'),
      }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(rpc).toHaveBeenCalledWith('get_analytics_data', {
      p_exercise_id: 2,
      p_date_from: '2026-02-01',
      p_date_to: '2026-04-01',
    })
    expect(result.current.data).toEqual({
      bodyweightLane: createEmptyAnalyticsBodyweightLane(),
      coverage: {
        ...createEmptyAnalyticsCoverage(),
        metrics: {
          ...createEmptyAnalyticsCoverage().metrics,
          consistency: {
            family: 'general_logging',
            reasonCodes: [],
            signalCount: 5,
            status: 'ready',
          },
          e1rmTrend: {
            family: 'main_lift_amrap',
            reasonCodes: ['limited_history'],
            signalCount: 1,
            status: 'limited',
          },
          stallDetection: {
            family: 'main_lift_amrap',
            reasonCodes: ['limited_history'],
            signalCount: 1,
            status: 'limited',
          },
          strengthProfile: {
            family: 'benchmark_profile',
            reasonCodes: ['strength_profile_missing_profile'],
            signalCount: 0,
            status: 'limited',
          },
        },
      },
      e1rmTrend: [
        {
          date: '2026-03-20',
          exerciseId: 2,
          exerciseName: 'Squat',
          weight: 315,
          reps: 5,
          e1rm: 367.5,
        },
      ],
      volumeTrend: [],
      prHistory: [],
      consistency: {
        totalSessions: 5,
        weeksActive: 4,
        firstSession: '2026-02-01',
        lastSession: '2026-03-20',
      },
      muscleBalance: [],
      stallDetection: [],
      tmProgression: [],
      strengthProfile: createEmptyStrengthProfile(),
    })
  })

  it('surfaces rpc failures', async () => {
    const error = new Error('analytics rpc failed')
    const rpc = vi.fn().mockResolvedValue({ data: null, error })

    useSupabaseMock.mockReturnValue({ rpc })

    const { result } = renderHook(() => useAnalytics(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
  })

  it('uses local calendar dates in query keys', () => {
    expect(
      analyticsQueryKeys.filtered(2, {
        from: createMockDate('2026-02-01', '2026-01-31'),
        to: createMockDate('2026-04-01', '2026-03-31'),
      }),
    ).toEqual(['analytics', 2, '2026-02-01', '2026-04-01', 'default-rounding'])
  })
})
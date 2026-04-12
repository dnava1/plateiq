import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboard } from './useDashboard'

const useSupabaseMock = vi.fn()

vi.mock('./useSupabase', () => ({
  useSupabase: () => useSupabaseMock(),
}))

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

describe('useDashboard', () => {
  beforeEach(() => {
    useSupabaseMock.mockReset()
  })

  it('calls get_dashboard via rpc and parses the aggregate payload', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        active_program: {
          id: 12,
          name: '5/3/1 Beefcake',
          template_key: 'wendler_531',
        },
        current_cycle: {
          id: 8,
          cycle_number: 3,
        },
        recent_workouts: [
          {
            id: 40,
            exercise_name: 'Bench Press',
            week_number: 2,
            completed_at: '2026-04-09T12:00:00Z',
            scheduled_date: '2026-04-09',
          },
        ],
        current_tms: [
          {
            exercise_id: 2,
            exercise_name: 'Squat',
            weight_lbs: 315,
            effective_date: '2026-04-01',
          },
        ],
      },
      error: null,
    })

    useSupabaseMock.mockReturnValue({ rpc })

    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(rpc).toHaveBeenCalledWith('get_dashboard')
    expect(result.current.data).toEqual({
      activeProgram: {
        id: 12,
        name: '5/3/1 Beefcake',
        templateKey: 'wendler_531',
      },
      currentCycle: {
        id: 8,
        cycleNumber: 3,
      },
      recentWorkouts: [
        {
          id: 40,
          exerciseName: 'Bench Press',
          weekNumber: 2,
          completedAt: '2026-04-09T12:00:00Z',
          scheduledDate: '2026-04-09',
        },
      ],
      currentTms: [
        {
          exerciseId: 2,
          exerciseName: 'Squat',
          weightLbs: 315,
          effectiveDate: '2026-04-01',
        },
      ],
    })
  })

  it('surfaces rpc failures', async () => {
    const error = new Error('dashboard rpc failed')
    const rpc = vi.fn().mockResolvedValue({ data: null, error })

    useSupabaseMock.mockReturnValue({ rpc })

    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(error)
  })
})
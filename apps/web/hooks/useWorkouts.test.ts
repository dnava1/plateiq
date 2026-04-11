import * as React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useActiveCycle, useLogSet } from './useWorkouts'

const useSupabaseMock = vi.fn()

vi.mock('./useSupabase', () => ({
  useSupabase: () => useSupabaseMock(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function createCycleBuilder(data: unknown) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  }

  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.is.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  builder.limit.mockReturnValue(builder)
  builder.maybeSingle.mockResolvedValue({ data, error: null })

  return builder
}

describe('useWorkouts', () => {
  beforeEach(() => {
    useSupabaseMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('useActiveCycle returns the latest incomplete cycle', async () => {
    const cycleBuilder = createCycleBuilder({
      id: 9,
      program_id: 12,
      user_id: 'user-1',
      cycle_number: 4,
      start_date: '2026-04-10',
      completed_at: null,
      auto_progression_applied: false,
      created_at: null,
    })

    useSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        expect(table).toBe('cycles')
        return cycleBuilder
      }),
    })

    const { result } = renderHook(() => useActiveCycle(12), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(cycleBuilder.eq).toHaveBeenCalledWith('program_id', 12)
    expect(cycleBuilder.is).toHaveBeenCalledWith('completed_at', null)
    expect(cycleBuilder.order).toHaveBeenCalledWith('cycle_number', { ascending: false })
    expect(cycleBuilder.limit).toHaveBeenCalledWith(1)
    expect(result.current.data?.id).toBe(9)
  })

  it('useLogSet sends the correct upsert payload', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:34:56.000Z'))

    const single = vi.fn().mockResolvedValue({
      data: {
        id: 91,
        workout_id: 44,
        exercise_id: 2,
        user_id: 'user-1',
        set_order: 3,
        set_type: 'main',
        weight_lbs: 225,
        reps_prescribed: 5,
        reps_prescribed_max: null,
        reps_actual: 5,
        is_amrap: false,
        rpe: null,
        intensity_type: 'percentage_tm',
        logged_at: '2026-04-10T12:34:56.000Z',
        updated_at: '2026-04-10T12:34:56.000Z',
      },
      error: null,
    })
    const select = vi.fn(() => ({ single }))
    const upsert = vi.fn(() => ({ select }))

    useSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        expect(table).toBe('workout_sets')
        return { upsert }
      }),
    })

    const { result } = renderHook(() => useLogSet(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({
        workoutId: 44,
        exerciseId: 2,
        exerciseName: 'Squat',
        userId: 'user-1',
        setOrder: 3,
        setType: 'main',
        weightLbs: 225,
        repsPrescribed: 5,
        repsActual: 5,
        isAmrap: false,
        intensityType: 'percentage_tm',
      })
    })

    expect(upsert).toHaveBeenCalledWith(
      {
        workout_id: 44,
        exercise_id: 2,
        user_id: 'user-1',
        set_order: 3,
        set_type: 'main',
        weight_lbs: 225,
        reps_prescribed: 5,
        reps_prescribed_max: null,
        reps_actual: 5,
        is_amrap: false,
        rpe: null,
        intensity_type: 'percentage_tm',
        logged_at: '2026-04-10T12:34:56.000Z',
      },
      { onConflict: 'workout_id,set_order' },
    )
  })

  it('useLogSet rejects fractional reps before calling Supabase', async () => {
    const upsert = vi.fn()

    useSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        expect(table).toBe('workout_sets')
        return { upsert }
      }),
    })

    const { result } = renderHook(() => useLogSet(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({
        workoutId: 44,
        exerciseId: 2,
        exerciseName: 'Squat',
        userId: 'user-1',
        setOrder: 3,
        setType: 'amrap',
        weightLbs: 225,
        repsPrescribed: 5,
        repsActual: 8.5,
        isAmrap: true,
        intensityType: 'percentage_tm',
      }),
    ).rejects.toThrow('Logged reps must be a whole number.')

    expect(upsert).not.toHaveBeenCalled()
  })
})
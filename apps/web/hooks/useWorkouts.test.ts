import * as React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchRecentExerciseHistory,
  useActiveCycle,
  useCompleteWorkout,
  useLogSet,
} from './useWorkouts'

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

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const wrapper = function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  return { queryClient, wrapper }
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
        rpe: 8.5,
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
        actualRpe: 8.5,
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
        rpe: 8.5,
        intensity_type: 'percentage_tm',
        logged_at: '2026-04-10T12:34:56.000Z',
      },
      { onConflict: 'workout_id,set_order' },
    )
  })

  it('useLogSet rejects invalid effort before calling Supabase', async () => {
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
        setType: 'main',
        weightLbs: 225,
        repsPrescribed: 5,
        repsActual: 5,
        isAmrap: false,
        actualRpe: 10.5,
        intensityType: 'percentage_tm',
      }),
    ).rejects.toThrow('Logged effort must be a valid RPE between 1 and 10.')

    expect(upsert).not.toHaveBeenCalled()
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

  it('fetchRecentExerciseHistory excludes the current workout and limits to completed logged history', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ workout_id: 55 }], error: null })
    const order = vi.fn(() => ({ limit }))
    const notChain = {
      not: vi.fn(),
      order,
    }
    notChain.not.mockReturnValue(notChain)
    const neq = vi.fn(() => ({ not: notChain.not }))
    const inMock = vi.fn(() => ({ neq }))
    const eq = vi.fn(() => ({ in: inMock }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))

    const result = await fetchRecentExerciseHistory(
      { from } as unknown as ReturnType<typeof useSupabaseMock>,
      'user-1',
      44,
      [2, 5],
    )

    expect(from).toHaveBeenCalledWith('workout_sets')
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(inMock).toHaveBeenCalledWith('exercise_id', [2, 5])
    expect(neq).toHaveBeenCalledWith('workout_id', 44)
    expect(notChain.not).toHaveBeenCalledWith('reps_actual', 'is', null)
    expect(notChain.not).toHaveBeenCalledWith('logged_at', 'is', null)
    expect(notChain.not).toHaveBeenCalledWith('workouts.completed_at', 'is', null)
    expect(limit).toHaveBeenCalledWith(24)
    expect(result).toEqual([{ workout_id: 55 }])
  })

  it('useCompleteWorkout invalidates recent exercise history after completion settles', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:34:56.000Z'))

    const single = vi.fn().mockResolvedValue({
      data: {
        id: 44,
        user_id: 'user-1',
        cycle_id: 9,
        day_index: 0,
        week_number: 1,
        day_label: 'Lower A',
        scheduled_date: '2026-04-10',
        completed_at: '2026-04-10T12:34:56.000Z',
        created_at: null,
        updated_at: null,
      },
      error: null,
    })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))

    useSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        expect(table).toBe('workouts')
        return { update }
      }),
    })

    const { queryClient, wrapper } = createWrapperWithClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData(['workouts', 'cycle', 9], [
      { id: 44, completed_at: null, notes: null },
    ])

    const { result } = renderHook(() => useCompleteWorkout(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        workoutId: 44,
        cycleId: 9,
      })
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['workout-sets', 'recent-history'] })
  })
})

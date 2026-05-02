import * as React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildTrainingMaxMap,
  fetchRecentExerciseHistory,
  resolveWorkoutProgram,
  seedWorkoutSetsMutation,
  updateWorkoutBlockPrescriptionMutation,
  useActiveCycle,
  useCompleteWorkout,
  useLogSet,
} from './useWorkouts'
import { generateWorkoutPlan } from '@/lib/constants/templates/engine'
import { getTemplate } from '@/lib/constants/templates'
import { buildEditableConfigFromTemplate, rewriteCustomProgramExerciseReferences } from '@/lib/programs/editable'
import type { Json } from '@/types/database'

const useSupabaseMock = vi.fn()

vi.mock('./useSupabase', () => ({
  useSupabase: () => useSupabaseMock(),
}))

vi.mock('@/lib/offline-workout-store', () => ({
  createOfflineWorkoutOutboxEntry: vi.fn((input: { kind: string; setOrder?: number | null; workoutId: number }) => ({
    createdAt: '2026-04-10T12:34:56.000Z',
    id: input.setOrder === null || input.setOrder === undefined
      ? `${input.kind}:${input.workoutId}`
      : `${input.kind}:${input.workoutId}:${input.setOrder}`,
    kind: input.kind,
    lastError: null,
    retryCount: 0,
    setOrder: input.setOrder ?? null,
    status: 'queued',
    updatedAt: '2026-04-10T12:34:56.000Z',
    variables: {},
    workoutId: input.workoutId,
  })),
  getOfflineWorkoutOutboxEntryId: vi.fn((kind: string, workoutId: number, setOrder?: number | null) =>
    setOrder === null || setOrder === undefined ? `${kind}:${workoutId}` : `${kind}:${workoutId}:${setOrder}`,
  ),
  markOfflineWorkoutOutboxEntryFailed: vi.fn().mockResolvedValue(undefined),
  markOfflineWorkoutOutboxEntrySynced: vi.fn().mockResolvedValue(undefined),
  upsertOfflineWorkoutOutboxEntry: vi.fn().mockResolvedValue(undefined),
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
        prescribed_intensity: 0.75,
        prescribed_weight_lbs: 225,
        prescription_base_weight_lbs: 300,
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
        prescribedIntensity: 0.75,
        prescribedWeightLbs: 225,
        prescriptionBaseWeightLbs: 300,
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
        prescribed_weight_lbs: 225,
        prescribed_intensity: 0.75,
        prescription_base_weight_lbs: 300,
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

  it('seedWorkoutSetsMutation inserts workout-only prescription snapshots for missing sets', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 201,
        workout_id: 44,
        exercise_id: 2,
        user_id: 'user-1',
        set_order: 4,
        set_type: 'accessory',
        weight_lbs: 135,
        prescribed_weight_lbs: 135,
        prescribed_intensity: 0.55,
        prescription_base_weight_lbs: 245,
        reps_prescribed: 10,
        reps_prescribed_max: null,
        reps_actual: null,
        is_amrap: false,
        rpe: null,
        intensity_type: 'percentage_tm',
        logged_at: null,
        updated_at: '2026-04-10T12:34:56.000Z',
        exercises: { name: 'Bench Press' },
      },
      error: null,
    })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))

    await seedWorkoutSetsMutation(
      {
        from: vi.fn((table: string) => {
          expect(table).toBe('workout_sets')
          return { insert }
        }),
      } as unknown as ReturnType<typeof useSupabaseMock>,
      {
        cycleId: 9,
        workoutId: 44,
        userId: 'user-1',
        sets: [{
          exerciseId: 2,
          intensityType: 'percentage_tm',
          isAmrap: false,
          prescribedIntensity: 0.55,
          prescribedWeightLbs: 135,
          prescriptionBaseWeightLbs: 245,
          repsPrescribed: 10,
          setOrder: 4,
          setType: 'accessory',
          weightLbs: 135,
        }],
      },
    )

    expect(insert).toHaveBeenCalledWith({
      workout_id: 44,
      exercise_id: 2,
      user_id: 'user-1',
      set_order: 4,
      set_type: 'accessory',
      weight_lbs: 135,
      prescribed_weight_lbs: 135,
      prescribed_intensity: 0.55,
      prescription_base_weight_lbs: 245,
      reps_prescribed: 10,
      reps_prescribed_max: null,
      reps_actual: null,
      is_amrap: false,
      rpe: null,
      intensity_type: 'percentage_tm',
      logged_at: null,
    })
  })

  it('updateWorkoutBlockPrescriptionMutation only changes unlogged sets', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 202,
        workout_id: 44,
        exercise_id: 2,
        user_id: 'user-1',
        set_order: 5,
        set_type: 'accessory',
        weight_lbs: 140,
        prescribed_weight_lbs: 140,
        prescribed_intensity: 0.575,
        prescription_base_weight_lbs: 245,
        reps_prescribed: 10,
        reps_prescribed_max: null,
        reps_actual: null,
        is_amrap: false,
        rpe: null,
        intensity_type: 'percentage_tm',
        logged_at: null,
        updated_at: '2026-04-10T12:34:56.000Z',
        exercises: { name: 'Bench Press' },
      },
      error: null,
    })
    const select = vi.fn(() => ({ maybeSingle }))
    const isMock = vi.fn(() => ({ select }))
    const eqSetOrder = vi.fn(() => ({ is: isMock }))
    const eqUserId = vi.fn(() => ({ eq: eqSetOrder }))
    const eqWorkoutId = vi.fn(() => ({ eq: eqUserId }))
    const update = vi.fn(() => ({ eq: eqWorkoutId }))

    await updateWorkoutBlockPrescriptionMutation(
      {
        from: vi.fn((table: string) => {
          expect(table).toBe('workout_sets')
          return { update }
        }),
      } as unknown as ReturnType<typeof useSupabaseMock>,
      {
        cycleId: 9,
        workoutId: 44,
        userId: 'user-1',
        updates: [{
          prescribedIntensity: 0.575,
          prescribedWeightLbs: 140,
          prescriptionBaseWeightLbs: 245,
          setOrder: 5,
        }],
      },
    )

    expect(update).toHaveBeenCalledWith({
      prescribed_weight_lbs: 140,
      prescribed_intensity: 0.575,
      prescription_base_weight_lbs: 245,
      weight_lbs: 140,
    })
    expect(eqWorkoutId).toHaveBeenCalledWith('workout_id', 44)
    expect(eqUserId).toHaveBeenCalledWith('user_id', 'user-1')
    expect(eqSetOrder).toHaveBeenCalledWith('set_order', 5)
    expect(isMock).toHaveBeenCalledWith('reps_actual', null)
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

  it('resolveWorkoutProgram preserves explicit week overrides for custom template copies', () => {
    const template = getTemplate('wendler_531')
    expect(template).toBeTruthy()

    const editableConfig = buildEditableConfigFromTemplate(template!, { variationKey: 'bbb' })

    const resolved = resolveWorkoutProgram({
      id: 1,
      name: 'Wendler 5/3/1 BBB',
      template_key: 'wendler_531',
      config: editableConfig,
    } as never)

    expect(resolved.template?.week_schemes?.['2']?.days?.[0]?.exercise_blocks).toHaveLength(2)

    const generatedSets = generateWorkoutPlan(
      resolved.template!,
      0,
      2,
      new Map([
        ['bench', 195],
        ['deadlift', 345],
        ['ohp', 130],
        ['squat', 305],
      ]),
      [],
      5,
    )

    expect(generatedSets.slice(0, 3).map((set) => set.reps_prescribed)).toEqual([3, 3, 3])
    expect(generatedSets[0]?.weight_lbs).toBe(90)
    expect(generatedSets[2]?.is_amrap).toBe(true)
    expect(generatedSets[3]?.exercise_key).toBe('Overhead Press')
  })

  it('resolveWorkoutProgram prefers the active cycle snapshot when the saved program has moved on', () => {
    const editableConfig = buildEditableConfigFromTemplate(getTemplate('wendler_531')!, { variationKey: 'bbb' })

    const resolved = resolveWorkoutProgram(
      {
        id: 1,
        name: 'Wendler 5/3/1 BBB',
        template_key: 'starting_strength',
        config: { rounding: 10 },
      } as never,
      5,
      {
        template_key: 'wendler_531',
        config: editableConfig as unknown as Json,
      },
    )

    expect(resolved.isCustom).toBe(true)
    expect(resolved.template?.days_per_week).toBe(4)
    expect(resolved.template?.week_schemes?.['2']?.days?.[0]?.exercise_blocks).toHaveLength(2)
  })

  it('preserves percentage-based loads after a renamed custom exercise rewrites legacy name-only blocks', () => {
    const legacyConfig = {
      type: 'custom' as const,
      level: 'intermediate' as const,
      days_per_week: 1,
      cycle_length_weeks: 1,
      uses_training_max: true,
      tm_percentage: 0.9,
      days: [{
        label: 'Day 1',
        exercise_blocks: [{
          role: 'primary' as const,
          exercise_key: 'Safety Squat Bar',
          sets: [{ sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_tm' as const }],
        }],
      }],
      progression: { style: 'custom' as const },
    }
    const rewritten = rewriteCustomProgramExerciseReferences(legacyConfig, {
      exerciseId: 42,
      previousName: 'Safety Squat Bar',
      nextName: 'Yoke Bar Squat',
    })
    const resolved = resolveWorkoutProgram({
      id: 11,
      name: 'Custom Yoke Bar Program',
      template_key: 'custom',
      config: rewritten.config,
    } as never)
    const generatedSets = generateWorkoutPlan(
      resolved.template!,
      0,
      1,
      buildTrainingMaxMap([
        {
          exercise_id: 42,
          weight_lbs: 315,
          exercises: { name: 'Yoke Bar Squat' },
        },
      ]),
    )

    expect(rewritten.changed).toBe(true)
    expect(generatedSets[0]).toMatchObject({
      exercise_id: 42,
      exercise_key: 'Yoke Bar Squat',
      weight_lbs: 250,
    })
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

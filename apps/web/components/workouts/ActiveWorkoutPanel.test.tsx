import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActiveWorkoutPanel } from './ActiveWorkoutPanel'

const mocks = vi.hoisted(() => ({
  clearRestTimer: vi.fn(),
  clearSession: vi.fn(),
  exitActiveWorkout: vi.fn(),
  setSyncState: vi.fn(),
  startRestTimer: vi.fn(),
}))

const mockGeneratedSets = [
  {
    block_id: 'press-a',
    block_order: 1,
    block_role: 'variation' as const,
    exercise_key: 'ohp',
    exercise_id: 3,
    execution_group: {
      key: 'superset-a',
      label: 'Press + Pull',
      type: 'superset' as const,
    },
    intensity_type: 'percentage_tm' as const,
    is_amrap: false,
    notes: undefined,
    reps_prescribed: 8,
    reps_prescribed_max: undefined,
    rest_seconds: 90,
    rpe: undefined,
    set_order: 1,
    set_type: 'variation' as const,
    weight_lbs: 95,
  },
  {
    block_id: 'press-a',
    block_order: 1,
    block_role: 'variation' as const,
    exercise_key: 'ohp',
    exercise_id: 3,
    execution_group: {
      key: 'superset-a',
      label: 'Press + Pull',
      type: 'superset' as const,
    },
    intensity_type: 'percentage_tm' as const,
    is_amrap: false,
    notes: undefined,
    reps_prescribed: 8,
    reps_prescribed_max: undefined,
    rest_seconds: 90,
    rpe: undefined,
    set_order: 2,
    set_type: 'variation' as const,
    weight_lbs: 95,
  },
  {
    block_id: 'chin-a',
    block_order: 2,
    block_role: 'accessory' as const,
    exercise_key: 'chin_up',
    exercise_id: 2,
    execution_group: {
      key: 'superset-a',
      label: 'Press + Pull',
      type: 'superset' as const,
    },
    intensity_type: 'bodyweight' as const,
    is_amrap: false,
    notes: undefined,
    reps_prescribed: 10,
    reps_prescribed_max: undefined,
    rest_seconds: 60,
    rpe: undefined,
    set_order: 3,
    set_type: 'accessory' as const,
    weight_lbs: 0,
  },
  {
    block_id: 'chin-a',
    block_order: 2,
    block_role: 'accessory' as const,
    exercise_key: 'chin_up',
    exercise_id: 2,
    execution_group: {
      key: 'superset-a',
      label: 'Press + Pull',
      type: 'superset' as const,
    },
    intensity_type: 'bodyweight' as const,
    is_amrap: false,
    notes: undefined,
    reps_prescribed: 10,
    reps_prescribed_max: undefined,
    rest_seconds: 60,
    rpe: undefined,
    set_order: 4,
    set_type: 'accessory' as const,
    weight_lbs: 0,
  },
]

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => 5,
}))

vi.mock('@/hooks/useExercises', () => ({
  buildExerciseKeyMap: () => new Map(),
  resolveExerciseIdFromMap: () => null,
  useExercises: () => ({
    data: [
      { id: 2, name: 'Chin-Up' },
      { id: 3, name: 'Overhead Press' },
    ],
  }),
}))

vi.mock('@/hooks/useTrainingMaxes', () => ({
  useCurrentTrainingMaxes: () => ({ data: [] }),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ data: { id: 'user-1' } }),
}))

vi.mock('@/hooks/useWorkouts', () => ({
  buildTrainingMaxMap: () => new Map(),
  resolveWorkoutProgram: () => ({
    rounding: 5,
    selectedVariationKeys: [],
    template: {
      cycle_length_weeks: 4,
      days: [{ exercise_blocks: [], label: 'Upper A' }],
    },
  }),
  useActiveCycle: () => ({ data: { cycle_number: 2, id: 9 } }),
  useCycleWorkouts: () => ({
    data: [{ completed_at: null, day_label: 'Upper A', id: 44, week_number: 1 }],
  }),
  useWorkoutSets: () => ({
    data: [
      {
        exercise_id: 3,
        exercises: { name: 'Overhead Press' },
        logged_at: '2026-04-17T10:00:00.000Z',
        reps_actual: 8,
        set_order: 1,
        weight_lbs: 95,
      },
    ],
  }),
}))

vi.mock('@/lib/constants/templates/engine', () => ({
  generateWorkoutPlan: () => mockGeneratedSets,
}))

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: (
    selector: (state: {
      activeCycleId: number | null
      activeDayIndex: number | null
      activeWeekNumber: number | null
      activeWorkoutId: number | null
      clearRestTimer: () => void
      clearSession: () => void
      exitActiveWorkout: () => void
      restTimer: {
        durationSeconds: number | null
        endsAt: number | null
        label: string | null
        sourceSetOrder: number | null
        workoutId: number | null
      }
      setSyncState: (setOrder: number, state: { status: 'dirty' | 'queued' | 'synced' | 'error' }) => void
      startRestTimer: (timer: { durationSeconds: number; label?: string | null; sourceSetOrder?: number | null; workoutId?: number | null }) => void
      syncStates: Record<number, { status: 'dirty' | 'queued' | 'synced' | 'error' }>
    }) => unknown,
  ) =>
    selector({
      activeCycleId: 9,
      activeDayIndex: 0,
      activeWeekNumber: 1,
      activeWorkoutId: 44,
      clearRestTimer: mocks.clearRestTimer,
      clearSession: mocks.clearSession,
      exitActiveWorkout: mocks.exitActiveWorkout,
      restTimer: {
        durationSeconds: null,
        endsAt: null,
        label: null,
        sourceSetOrder: null,
        workoutId: null,
      },
      setSyncState: mocks.setSyncState,
      startRestTimer: mocks.startRestTimer,
      syncStates: {},
    }),
}))

vi.mock('./CompleteWorkoutButton', () => ({
  CompleteWorkoutButton: () => <button type="button">Complete Workout</button>,
}))

vi.mock('./OfflineSyncBanner', () => ({
  OfflineSyncBanner: () => <div>Offline sync banner</div>,
}))

vi.mock('./PlateBreakdownInline', () => ({
  PlateBreakdownInline: () => null,
}))

vi.mock('./SetRow', () => ({
  SetRow: ({ set }: { set: { exerciseName: string; set_order: number } }) => (
    <div>{set.exerciseName} set {set.set_order}</div>
  ),
}))

describe('ActiveWorkoutPanel', () => {
  beforeEach(() => {
    mocks.clearRestTimer.mockReset()
    mocks.clearSession.mockReset()
    mocks.exitActiveWorkout.mockReset()
    mocks.setSyncState.mockReset()
    mocks.startRestTimer.mockReset()
  })

  it('renders the grouped execution cue and lets the user return to the launcher', async () => {
    const user = userEvent.setup()

    render(
      <ActiveWorkoutPanel
        program={{
          config: null,
          id: 1,
          name: 'Test Program',
          template_key: 'test-program',
        } as never}
      />,
    )

    expect(screen.getByText('Chin-Up round 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Workout 1 of 4 sets logged. 3 sets left.')).toBeInTheDocument()
    expect(screen.getByText('Superset step 2 of 2 in Press + Pull. 1 of 4 grouped sets logged.')).toBeInTheDocument()
    expect(screen.getByText('After this, go back to Overhead Press for round 2.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to workouts/i }))

    expect(mocks.exitActiveWorkout).toHaveBeenCalledTimes(1)
  })
})
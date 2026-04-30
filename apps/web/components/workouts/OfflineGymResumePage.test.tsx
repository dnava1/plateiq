import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineGymResumePage } from './OfflineGymResumePage'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getActiveWorkoutSnapshot: vi.fn(),
  getLastSnapshotUserId: vi.fn(),
  getOfflineWorkoutPack: vi.fn(),
  saveActiveWorkoutSnapshot: vi.fn(),
  snapshotFromPack: null as unknown,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
    },
  }),
}))

vi.mock('@/hooks/useOfflineWorkoutSync', () => ({
  useOfflineWorkoutSync: () => ({
    entries: [],
    failedEntries: [],
    isOnline: true,
    isRetrying: false,
    pendingCount: 0,
    pendingMutationCount: 0,
    refresh: vi.fn(),
    retrySync: vi.fn(),
  }),
}))

vi.mock('@/lib/offline-workout-store', () => ({
  createOfflineWorkoutSnapshotFromPackWorkout: () => mocks.snapshotFromPack,
  getActiveWorkoutSnapshot: (...args: unknown[]) => mocks.getActiveWorkoutSnapshot(...args),
  getLastSnapshotUserId: (...args: unknown[]) => mocks.getLastSnapshotUserId(...args),
  getOfflineWorkoutPack: (...args: unknown[]) => mocks.getOfflineWorkoutPack(...args),
  saveActiveWorkoutSnapshot: (...args: unknown[]) => mocks.saveActiveWorkoutSnapshot(...args),
}))

vi.mock('./CompleteWorkoutButton', () => ({
  CompleteWorkoutButton: () => <button type="button">Complete Workout</button>,
}))

vi.mock('./SetRow', () => ({
  SetRow: ({ set }: { set: { exerciseName: string; set_order: number } }) => (
    <div>{set.exerciseName} set {set.set_order}</div>
  ),
}))

const packedWorkout = {
  completedAt: null,
  dayIndex: 0,
  dayLabel: 'Squat Day',
  sets: [],
  weekNumber: 1,
  workoutId: 44,
}

const pack = {
  activeCycle: {
    cycleNumber: 1,
    id: 9,
  },
  program: {
    config: null,
    id: 2,
    name: 'Program',
    template_key: 'wendler-531',
  },
  savedAt: '2026-04-29T12:00:00.000Z',
  suggested: {
    dayIndex: 0,
    weekNumber: 1,
  },
  userId: 'user-123',
  version: 1,
  workouts: [packedWorkout],
}

const completedSnapshot = {
  activeDayIndex: 0,
  activeWeekNumber: 1,
  completedAt: null,
  cycleId: 9,
  cycleNumber: 1,
  dayLabel: 'Squat Day',
  lastFailureReason: null,
  lastSuccessfulSyncAt: null,
  pendingCompletionWorkoutId: null,
  pendingMutationCount: 0,
  program: pack.program,
  restTimer: {
    durationSeconds: null,
    endsAt: null,
    label: null,
    sourceSetOrder: null,
    workoutId: null,
  },
  savedAt: '2026-04-29T12:00:00.000Z',
  sets: [
    {
      block_id: 'squat',
      block_order: 1,
      block_role: 'primary' as const,
      display_type: 'standard' as const,
      exercise_key: 'squat',
      exerciseId: 3,
      exerciseName: 'Squat',
      intensity_type: 'percentage_tm' as const,
      is_amrap: false,
      loggedAt: '2026-04-29T12:01:00.000Z',
      prescribedIntensity: 0.75,
      prescribedRpe: null,
      prescribedWeightLbs: 225,
      prescriptionBaseWeightLbs: 300,
      repsActual: 5,
      reps_prescribed: 5,
      reps_prescribed_max: undefined,
      rest_seconds: 90,
      rpe: null,
      set_order: 1,
      set_type: 'main' as const,
      weight_lbs: 225,
      workoutId: 44,
      workoutSetId: 1001,
    },
  ],
  syncStates: {},
  userId: 'user-123',
  version: 1,
  workoutId: 44,
}

describe('OfflineGymResumePage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useRealTimers()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
    mocks.getSession.mockReset()
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })
    mocks.getActiveWorkoutSnapshot.mockReset()
    mocks.getLastSnapshotUserId.mockReset()
    mocks.getLastSnapshotUserId.mockReturnValue(null)
    mocks.getOfflineWorkoutPack.mockReset()
    mocks.saveActiveWorkoutSnapshot.mockReset()
    mocks.saveActiveWorkoutSnapshot.mockResolvedValue(undefined)
    mocks.snapshotFromPack = {
      ...completedSnapshot,
      sets: [],
    }
  })

  it('lets a saved packed workout become the active offline snapshot', async () => {
    const user = userEvent.setup()
    mocks.getActiveWorkoutSnapshot.mockResolvedValue(null)
    mocks.getOfflineWorkoutPack.mockResolvedValue(pack)

    render(<OfflineGymResumePage />)

    await screen.findByText('Saved workout pack')
    await user.click(screen.getByRole('button', { name: /resume/i }))

    expect(mocks.saveActiveWorkoutSnapshot).toHaveBeenCalledWith(mocks.snapshotFromPack)
  })

  it('offers completion from the offline surface once every set is logged', async () => {
    mocks.getActiveWorkoutSnapshot.mockResolvedValue(completedSnapshot)
    mocks.getOfflineWorkoutPack.mockResolvedValue(pack)

    render(<OfflineGymResumePage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete workout/i })).toBeInTheDocument()
    })
  })

  it('falls back to the last offline user when session lookup stalls offline', async () => {
    vi.useFakeTimers()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    mocks.getSession.mockReturnValue(new Promise(() => undefined))
    mocks.getLastSnapshotUserId.mockReturnValue('user-123')
    mocks.getActiveWorkoutSnapshot.mockResolvedValue(completedSnapshot)
    mocks.getOfflineWorkoutPack.mockResolvedValue(pack)

    render(<OfflineGymResumePage />)

    await act(async () => {
      vi.advanceTimersByTime(1300)
    })

    expect(screen.getByText('Squat Day')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete workout/i })).toBeInTheDocument()
  })

  it('leaves loading when offline session lookup stalls without saved data', async () => {
    vi.useFakeTimers()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    mocks.getSession.mockReturnValue(new Promise(() => undefined))
    mocks.getLastSnapshotUserId.mockReturnValue(null)

    render(<OfflineGymResumePage />)

    await act(async () => {
      vi.advanceTimersByTime(1300)
    })

    expect(screen.getByText('Sign in required')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open sign-in/i })).toBeInTheDocument()
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { drainOfflineWorkoutOutbox } from './offline-workout-sync'

const mocks = vi.hoisted(() => {
  const useWorkoutSessionStore = Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      completeWorkoutSession: vi.fn(),
    })),
  })

  return {
    clearActiveWorkoutSnapshot: vi.fn(),
    completeWorkoutMutation: vi.fn(),
    completeWorkoutSession: vi.fn(),
    getOfflineWorkoutOutboxEntries: vi.fn(),
    invalidateQueries: vi.fn(),
    logSetMutation: vi.fn(),
    markOfflineWorkoutOutboxEntryFailed: vi.fn(),
    markOfflineWorkoutOutboxEntrySynced: vi.fn(),
    markOfflineWorkoutOutboxEntrySyncing: vi.fn(),
    markOfflineWorkoutPackWorkoutCompleted: vi.fn(),
    updateWorkoutBlockPrescriptionMutation: vi.fn(),
    useWorkoutSessionStore,
  }
})

vi.mock('@/hooks/useAnalytics', () => ({
  analyticsQueryKeys: {
    all: () => ['analytics'],
  },
}))

vi.mock('@/hooks/useDashboard', () => ({
  dashboardQueryKeys: {
    all: () => ['dashboard'],
  },
}))

vi.mock('@/hooks/useWorkouts', () => ({
  completeWorkoutMutation: (...args: unknown[]) => mocks.completeWorkoutMutation(...args),
  logSetMutation: (...args: unknown[]) => mocks.logSetMutation(...args),
  updateWorkoutBlockPrescriptionMutation: (...args: unknown[]) => mocks.updateWorkoutBlockPrescriptionMutation(...args),
  workoutQueryKeys: {
    amrapHistory: (exerciseId: number | undefined) => ['amrap-history', exerciseId],
    cycle: (cycleId: number | undefined) => ['cycle', cycleId],
    exerciseHistoryRoot: () => ['exercise-history'],
    sets: (workoutId: number | undefined) => ['sets', workoutId],
  },
}))

vi.mock('@/lib/offline-workout-store', () => ({
  clearActiveWorkoutSnapshot: (...args: unknown[]) => mocks.clearActiveWorkoutSnapshot(...args),
  getOfflineWorkoutOutboxEntries: (...args: unknown[]) => mocks.getOfflineWorkoutOutboxEntries(...args),
  getOfflineWorkoutOutboxEntryId: (kind: string, workoutId: number, setOrder?: number | null) =>
    setOrder === null || setOrder === undefined
      ? `${kind}:${workoutId}`
      : `${kind}:${workoutId}:${setOrder}`,
  markOfflineWorkoutOutboxEntryFailed: (...args: unknown[]) => mocks.markOfflineWorkoutOutboxEntryFailed(...args),
  markOfflineWorkoutOutboxEntrySynced: (...args: unknown[]) => mocks.markOfflineWorkoutOutboxEntrySynced(...args),
  markOfflineWorkoutOutboxEntrySyncing: (...args: unknown[]) => mocks.markOfflineWorkoutOutboxEntrySyncing(...args),
  markOfflineWorkoutPackWorkoutCompleted: (...args: unknown[]) => mocks.markOfflineWorkoutPackWorkoutCompleted(...args),
}))

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: mocks.useWorkoutSessionStore,
}))

const setLogVariables = {
  actualRpe: null,
  exerciseId: 3,
  exerciseName: 'Squat',
  intensityType: 'percentage_tm',
  isAmrap: false,
  prescribedIntensity: 0.75,
  prescribedWeightLbs: 225,
  prescriptionBaseWeightLbs: 300,
  repsActual: 5,
  repsPrescribed: 5,
  setOrder: 1,
  setType: 'main',
  userId: 'user-123',
  weightLbs: 225,
  workoutId: 44,
}

describe('drainOfflineWorkoutOutbox', () => {
  beforeEach(() => {
    mocks.clearActiveWorkoutSnapshot.mockReset()
    mocks.completeWorkoutMutation.mockReset()
    mocks.completeWorkoutSession.mockReset()
    mocks.getOfflineWorkoutOutboxEntries.mockReset()
    mocks.invalidateQueries.mockReset()
    mocks.logSetMutation.mockReset()
    mocks.markOfflineWorkoutOutboxEntryFailed.mockReset()
    mocks.markOfflineWorkoutOutboxEntrySynced.mockReset()
    mocks.markOfflineWorkoutOutboxEntrySyncing.mockReset()
    mocks.markOfflineWorkoutPackWorkoutCompleted.mockReset()
    mocks.updateWorkoutBlockPrescriptionMutation.mockReset()
    mocks.useWorkoutSessionStore.getState.mockReturnValue({
      completeWorkoutSession: mocks.completeWorkoutSession,
    })
  })

  it('replays queued workout entries and clears completion state after a completed workout syncs', async () => {
    mocks.getOfflineWorkoutOutboxEntries.mockResolvedValue([
      {
        createdAt: '2026-04-29T12:00:00.000Z',
        id: 'set-log:44:1',
        kind: 'set-log',
        lastError: null,
        retryCount: 0,
        setOrder: 1,
        status: 'queued',
        updatedAt: '2026-04-29T12:00:00.000Z',
        variables: setLogVariables,
        workoutId: 44,
      },
      {
        createdAt: '2026-04-29T12:01:00.000Z',
        id: 'workout-complete:44',
        kind: 'workout-complete',
        lastError: null,
        retryCount: 0,
        setOrder: null,
        status: 'queued',
        updatedAt: '2026-04-29T12:01:00.000Z',
        variables: {
          cycleId: 9,
          userId: 'user-123',
          workoutId: 44,
        },
        workoutId: 44,
      },
    ])
    mocks.logSetMutation.mockResolvedValue({})
    mocks.completeWorkoutMutation.mockResolvedValue({})

    const result = await drainOfflineWorkoutOutbox({
      queryClient: { invalidateQueries: mocks.invalidateQueries } as never,
      supabase: {} as never,
      userId: 'user-123',
    })

    expect(result).toMatchObject({ attempted: 2, failed: 0, synced: 2 })
    expect(mocks.markOfflineWorkoutOutboxEntrySyncing).toHaveBeenCalledWith('user-123', 'set-log:44:1')
    expect(mocks.logSetMutation).toHaveBeenCalledWith({}, setLogVariables)
    expect(mocks.completeWorkoutMutation).toHaveBeenCalledWith({}, {
      cycleId: 9,
      userId: 'user-123',
      workoutId: 44,
    })
    expect(mocks.markOfflineWorkoutOutboxEntrySynced).toHaveBeenCalledWith('user-123', 'workout-complete:44')
    expect(mocks.clearActiveWorkoutSnapshot).toHaveBeenCalledWith('user-123')
    expect(mocks.markOfflineWorkoutPackWorkoutCompleted).toHaveBeenCalledWith('user-123', 44)
    expect(mocks.completeWorkoutSession).toHaveBeenCalledWith(44)
  })

  it('leaves failed replay entries in the outbox with the latest error', async () => {
    const error = new Error('Network unavailable')
    mocks.getOfflineWorkoutOutboxEntries.mockResolvedValue([
      {
        createdAt: '2026-04-29T12:00:00.000Z',
        id: 'set-log:44:1',
        kind: 'set-log',
        lastError: null,
        retryCount: 0,
        setOrder: 1,
        status: 'queued',
        updatedAt: '2026-04-29T12:00:00.000Z',
        variables: setLogVariables,
        workoutId: 44,
      },
    ])
    mocks.logSetMutation.mockRejectedValue(error)

    const result = await drainOfflineWorkoutOutbox({
      supabase: {} as never,
      userId: 'user-123',
    })

    expect(result).toMatchObject({ attempted: 1, failed: 1, synced: 0 })
    expect(mocks.markOfflineWorkoutOutboxEntryFailed).toHaveBeenCalledWith('user-123', 'set-log:44:1', error)
    expect(mocks.markOfflineWorkoutOutboxEntrySynced).not.toHaveBeenCalled()
  })
})

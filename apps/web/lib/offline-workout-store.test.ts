import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearActiveWorkoutSnapshot,
  clearOfflineWorkoutPack,
  createOfflineWorkoutOutboxEntry,
  createOfflineWorkoutSnapshotFromPackWorkout,
  getActiveWorkoutSnapshot,
  getActiveWorkoutSnapshotKey,
  getLastSnapshotUserId,
  getOfflineWorkoutPack,
  getOfflineWorkoutPackKey,
  getOfflineWorkoutOutboxEntries,
  getOfflineWorkoutOutboxEntryId,
  getOfflineWorkoutOutboxKey,
  markOfflineWorkoutOutboxEntryFailed,
  markOfflineWorkoutOutboxEntrySynced,
  markOfflineWorkoutPackWorkoutCompleted,
  saveActiveWorkoutSnapshot,
  saveOfflineWorkoutPack,
  upsertOfflineWorkoutOutboxEntry,
  type OfflineWorkoutPack,
  type OfflineWorkoutSnapshot,
} from './offline-workout-store'

const delMock = vi.fn()
const getMock = vi.fn()
const keysMock = vi.fn()
const setMock = vi.fn()

vi.mock('idb-keyval', () => ({
  del: (...args: unknown[]) => delMock(...args),
  get: (...args: unknown[]) => getMock(...args),
  keys: (...args: unknown[]) => keysMock(...args),
  set: (...args: unknown[]) => setMock(...args),
}))

function createSnapshot(): OfflineWorkoutSnapshot {
  return {
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
    program: {
      config: null,
      id: 2,
      name: 'Program',
      template_key: 'wendler-531',
    },
    restTimer: {
      durationSeconds: null,
      endsAt: null,
      label: null,
      sourceSetOrder: null,
      workoutId: null,
    },
    savedAt: '2026-04-29T12:00:00.000Z',
    sets: [],
    syncStates: {},
    userId: 'user-123',
    version: 1,
    workoutId: 44,
  }
}

function createWorkoutPack(): OfflineWorkoutPack {
  return {
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
    workouts: [
      {
        completedAt: null,
        dayIndex: 0,
        dayLabel: 'Squat Day',
        sets: [],
        weekNumber: 1,
        workoutId: 44,
      },
    ],
  }
}

describe('offline workout store', () => {
  beforeEach(() => {
    delMock.mockReset()
    getMock.mockReset()
    keysMock.mockReset()
    setMock.mockReset()
    localStorage.clear()
  })

  it('stores and restores a user-scoped workout snapshot', async () => {
    const snapshot = createSnapshot()
    getMock.mockResolvedValue(snapshot)

    await saveActiveWorkoutSnapshot(snapshot)
    const restored = await getActiveWorkoutSnapshot('user-123')

    expect(setMock).toHaveBeenCalledWith(getActiveWorkoutSnapshotKey('user-123'), snapshot)
    expect(getMock).toHaveBeenCalledWith(getActiveWorkoutSnapshotKey('user-123'))
    expect(getLastSnapshotUserId()).toBe('user-123')
    expect(restored).toEqual(snapshot)
  })

  it('clears a user-scoped snapshot and last-user pointer', async () => {
    localStorage.setItem('plateiq-offline-workout:last-user', 'user-123')

    await clearActiveWorkoutSnapshot('user-123')

    expect(delMock).toHaveBeenCalledWith(getActiveWorkoutSnapshotKey('user-123'))
    expect(getLastSnapshotUserId()).toBeNull()
  })

  it('stores a user-scoped workout pack and can convert a saved workout into a snapshot', async () => {
    const pack = createWorkoutPack()
    getMock.mockResolvedValue(pack)

    await saveOfflineWorkoutPack(pack)
    const restored = await getOfflineWorkoutPack('user-123')
    const snapshot = createOfflineWorkoutSnapshotFromPackWorkout(pack, pack.workouts[0]!)
    await clearOfflineWorkoutPack('user-123')

    expect(setMock).toHaveBeenCalledWith(getOfflineWorkoutPackKey('user-123'), pack)
    expect(getMock).toHaveBeenCalledWith(getOfflineWorkoutPackKey('user-123'))
    expect(restored).toEqual(pack)
    expect(snapshot).toMatchObject({
      activeDayIndex: 0,
      activeWeekNumber: 1,
      cycleId: 9,
      dayLabel: 'Squat Day',
      userId: 'user-123',
      workoutId: 44,
    })
    expect(delMock).toHaveBeenCalledWith(getOfflineWorkoutPackKey('user-123'))
  })

  it('marks packed workouts complete and blocks resuming completed packed sessions', async () => {
    const pack = createWorkoutPack()
    getMock.mockResolvedValue(pack)

    await markOfflineWorkoutPackWorkoutCompleted('user-123', 44, '2026-04-29T13:00:00.000Z')

    expect(setMock).toHaveBeenCalledWith(
      getOfflineWorkoutPackKey('user-123'),
      expect.objectContaining({
        workouts: [
          expect.objectContaining({
            completedAt: '2026-04-29T13:00:00.000Z',
            workoutId: 44,
          }),
        ],
      }),
    )
    expect(createOfflineWorkoutSnapshotFromPackWorkout(pack, {
      ...pack.workouts[0]!,
      completedAt: '2026-04-29T13:00:00.000Z',
    })).toBeNull()
  })

  it('upserts and lists outbox entries by creation time', async () => {
    const firstEntry = {
      ...createOfflineWorkoutOutboxEntry({
        kind: 'set-log',
        setOrder: 2,
        variables: { setOrder: 2 },
        workoutId: 44,
      }),
      createdAt: '2026-04-29T12:01:00.000Z',
    }
    const secondEntry = {
      ...createOfflineWorkoutOutboxEntry({
        kind: 'workout-complete',
        variables: { workoutId: 44 },
        workoutId: 44,
      }),
      createdAt: '2026-04-29T12:00:00.000Z',
    }
    const firstKey = getOfflineWorkoutOutboxKey('user-123', firstEntry.id)
    const secondKey = getOfflineWorkoutOutboxKey('user-123', secondEntry.id)

    keysMock.mockResolvedValue([firstKey, 'other-key', secondKey])
    getMock.mockImplementation((key: string) => {
      if (key === firstKey) return Promise.resolve(firstEntry)
      if (key === secondKey) return Promise.resolve(secondEntry)
      return Promise.resolve(undefined)
    })

    await upsertOfflineWorkoutOutboxEntry('user-123', firstEntry)
    const entries = await getOfflineWorkoutOutboxEntries('user-123')

    expect(setMock).toHaveBeenCalledWith(firstKey, firstEntry)
    expect(entries).toEqual([secondEntry, firstEntry])
  })

  it('marks outbox entries failed and synced', async () => {
    const entry = createOfflineWorkoutOutboxEntry({
      kind: 'set-log',
      setOrder: 2,
      variables: { setOrder: 2 },
      workoutId: 44,
    })
    const key = getOfflineWorkoutOutboxKey('user-123', entry.id)
    getMock.mockResolvedValue(entry)

    await markOfflineWorkoutOutboxEntryFailed('user-123', entry.id, new Error('No connection'))
    await markOfflineWorkoutOutboxEntrySynced('user-123', entry.id)

    expect(setMock).toHaveBeenCalledWith(key, expect.objectContaining({
      lastError: 'No connection',
      retryCount: 1,
      status: 'failed',
    }))
    expect(delMock).toHaveBeenCalledWith(key)
    expect(getOfflineWorkoutOutboxEntryId('set-log', 44, 2)).toBe(entry.id)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkoutSessionStore } from './workoutSessionStore'

describe('workoutSessionStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useWorkoutSessionStore.getState().clearSession()
  })

  it('persists rest timer metadata for the active workout', () => {
    useWorkoutSessionStore.getState().setActiveWorkout(44)
    useWorkoutSessionStore.getState().startRestTimer({
      durationSeconds: 120,
      label: 'Bench Press',
      sourceSetOrder: 3,
      workoutId: 44,
    })

    expect(useWorkoutSessionStore.getState().restTimer).toMatchObject({
      durationSeconds: 120,
      label: 'Bench Press',
      sourceSetOrder: 3,
      workoutId: 44,
    })

    const persistedValue = JSON.parse(localStorage.getItem('plateiq-workout-session') ?? '{}')
    expect(persistedValue.state.restTimer).toMatchObject({
      durationSeconds: 120,
      label: 'Bench Press',
      sourceSetOrder: 3,
      workoutId: 44,
    })
  })

  it('clears a persisted rest timer when the session is cleared', () => {
    useWorkoutSessionStore.getState().startRestTimer({
      durationSeconds: 90,
      sourceSetOrder: 2,
      workoutId: 44,
    })

    useWorkoutSessionStore.getState().clearSession()

    expect(useWorkoutSessionStore.getState().restTimer).toMatchObject({
      durationSeconds: null,
      endsAt: null,
      label: null,
      sourceSetOrder: null,
      workoutId: null,
    })
  })

  it('drops an old workout rest timer when switching to a different workout', () => {
    useWorkoutSessionStore.getState().setActiveWorkout(44)
    useWorkoutSessionStore.getState().startRestTimer({
      durationSeconds: 90,
      sourceSetOrder: 2,
      workoutId: 44,
    })

    useWorkoutSessionStore.getState().setActiveWorkout(45)

    expect(useWorkoutSessionStore.getState().restTimer.endsAt).toBeNull()
  })

  it('exits the active workout surface while keeping launcher context resumable', () => {
    useWorkoutSessionStore.getState().setActiveContext({
      cycleId: 12,
      dayIndex: 2,
      weekNumber: 3,
    })
    useWorkoutSessionStore.getState().setActiveWorkout(44)
    useWorkoutSessionStore.getState().setSyncState(5, { status: 'queued' })
    useWorkoutSessionStore.getState().startRestTimer({
      durationSeconds: 120,
      sourceSetOrder: 5,
      workoutId: 44,
    })

    useWorkoutSessionStore.getState().exitActiveWorkout()

    expect(useWorkoutSessionStore.getState()).toMatchObject({
      activeCycleId: 12,
      activeDayIndex: 2,
      activeWeekNumber: 3,
      activeWorkoutId: null,
      restTimer: {
        durationSeconds: null,
        endsAt: null,
        label: null,
        sourceSetOrder: null,
        workoutId: null,
      },
      syncStates: {},
    })
  })

  it('clears only the completed workout state', () => {
    useWorkoutSessionStore.getState().setActiveContext({
      cycleId: 12,
      dayIndex: 2,
      weekNumber: 3,
    })
    useWorkoutSessionStore.getState().setActiveWorkout(44)
    useWorkoutSessionStore.getState().setSyncState(5, { status: 'queued' })
    useWorkoutSessionStore.getState().startRestTimer({
      durationSeconds: 120,
      sourceSetOrder: 5,
      workoutId: 44,
    })

    useWorkoutSessionStore.getState().completeWorkoutSession(44)

    expect(useWorkoutSessionStore.getState()).toMatchObject({
      activeWorkoutId: null,
      activeCycleId: null,
      activeDayIndex: null,
      activeWeekNumber: null,
      prToastLedger: {},
      restTimer: {
        durationSeconds: null,
        endsAt: null,
        label: null,
        sourceSetOrder: null,
        workoutId: null,
      },
      syncStates: {},
    })
  })

  it('migrates a persisted version 2 session without dropping resumable workout state', async () => {
    localStorage.setItem('plateiq-workout-session', JSON.stringify({
      state: {
        activeWorkoutId: 44,
        activeCycleId: 12,
        activeDayIndex: 2,
        activeWeekNumber: 3,
        prToastLedger: {
          'toast:44': true,
        },
        restTimer: {
          durationSeconds: 120,
          endsAt: 123456,
          label: 'Bench Press',
          sourceSetOrder: 5,
          workoutId: 44,
        },
        syncStates: {
          5: {
            status: 'queued',
          },
        },
      },
      version: 2,
    }))

    await useWorkoutSessionStore.persist.rehydrate()

    expect(useWorkoutSessionStore.getState()).toMatchObject({
      activeWorkoutId: 44,
      activeCycleId: 12,
      activeDayIndex: 2,
      activeWeekNumber: 3,
      prToastLedger: {
        'toast:44': true,
      },
      restTimer: {
        durationSeconds: 120,
        endsAt: 123456,
        label: 'Bench Press',
        sourceSetOrder: 5,
        workoutId: 44,
      },
      syncStates: {
        5: {
          status: 'queued',
        },
      },
    })
  })

  it('drops legacy workout note drafts while migrating a persisted version 3 session', async () => {
    localStorage.setItem('plateiq-workout-session', JSON.stringify({
      state: {
        activeWorkoutId: 44,
        activeCycleId: 12,
        activeDayIndex: 2,
        activeWeekNumber: 3,
        prToastLedger: {},
        restTimer: {
          durationSeconds: 120,
          endsAt: 123456,
          label: 'Bench Press',
          sourceSetOrder: 5,
          workoutId: 44,
        },
        syncStates: {
          5: {
            status: 'queued',
          },
        },
        workoutNoteDrafts: {
          44: 'Legacy draft that should be discarded',
        },
      },
      version: 3,
    }))

    await useWorkoutSessionStore.persist.rehydrate()

    const state = useWorkoutSessionStore.getState() as Record<string, unknown>

    expect(state).toMatchObject({
      activeWorkoutId: 44,
      activeCycleId: 12,
      activeDayIndex: 2,
      activeWeekNumber: 3,
      restTimer: {
        durationSeconds: 120,
        endsAt: 123456,
        label: 'Bench Press',
        sourceSetOrder: 5,
        workoutId: 44,
      },
      syncStates: {
        5: {
          status: 'queued',
        },
      },
    })
    expect(state).not.toHaveProperty('workoutNoteDrafts')
  })
})

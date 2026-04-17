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
})
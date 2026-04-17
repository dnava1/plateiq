import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SetSyncState {
  status: 'dirty' | 'queued' | 'synced' | 'error'
}

export interface RestTimerState {
  durationSeconds: number | null
  endsAt: number | null
  label: string | null
  sourceSetOrder: number | null
  workoutId: number | null
}

const EMPTY_REST_TIMER: RestTimerState = {
  durationSeconds: null,
  endsAt: null,
  label: null,
  sourceSetOrder: null,
  workoutId: null,
}

interface WorkoutSessionState {
  activeWorkoutId: number | null
  activeCycleId: number | null
  activeDayIndex: number | null
  activeWeekNumber: number | null
  prToastLedger: Record<string, true>
  restTimer: RestTimerState
  syncStates: Record<number, SetSyncState>
  clearRestTimer: () => void
  exitActiveWorkout: () => void
  hasShownPrToast: (toastKey: string) => boolean
  markPrToastShown: (toastKey: string) => void
  setActiveWorkout: (id: number | null) => void
  setActiveContext: (context: { cycleId: number; dayIndex: number; weekNumber: number }) => void
  setSyncState: (setOrder: number, state: SetSyncState) => void
  startRestTimer: (timer: {
    durationSeconds: number
    label?: string | null
    sourceSetOrder?: number | null
    workoutId?: number | null
  }) => void
  clearSession: () => void
}

export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      activeWorkoutId: null,
      activeCycleId: null,
      activeDayIndex: null,
      activeWeekNumber: null,
      prToastLedger: {},
      restTimer: EMPTY_REST_TIMER,
      syncStates: {},
      clearRestTimer: () => set({ restTimer: EMPTY_REST_TIMER }),
      exitActiveWorkout: () =>
        set({
          activeWorkoutId: null,
          restTimer: EMPTY_REST_TIMER,
          syncStates: {},
        }),
      hasShownPrToast: (toastKey) => get().prToastLedger[toastKey] === true,
      markPrToastShown: (toastKey) =>
        set((current) => ({
          prToastLedger: {
            ...current.prToastLedger,
            [toastKey]: true,
          },
        })),
      setActiveWorkout: (activeWorkoutId) =>
        set((current) => ({
          activeWorkoutId,
          restTimer:
            current.restTimer.workoutId !== null
            && activeWorkoutId !== null
            && current.restTimer.workoutId !== activeWorkoutId
              ? EMPTY_REST_TIMER
              : current.restTimer,
        })),
      setActiveContext: (context) =>
        set({
          activeCycleId: context.cycleId,
          activeDayIndex: context.dayIndex,
          activeWeekNumber: context.weekNumber,
        }),
      setSyncState: (setOrder, state) =>
        set((current) => ({
          syncStates: {
            ...current.syncStates,
            [setOrder]: state,
          },
        })),
      startRestTimer: ({ durationSeconds, label = null, sourceSetOrder = null, workoutId = null }) =>
        set({
          restTimer: {
            durationSeconds,
            endsAt: Date.now() + durationSeconds * 1000,
            label,
            sourceSetOrder,
            workoutId,
          },
        }),
      clearSession: () =>
        set({
          activeWorkoutId: null,
          activeCycleId: null,
          activeDayIndex: null,
          activeWeekNumber: null,
          prToastLedger: {},
          restTimer: EMPTY_REST_TIMER,
          syncStates: {},
        }),
    }),
    {
      name: 'plateiq-workout-session',
      version: 2,
    }
  )
)

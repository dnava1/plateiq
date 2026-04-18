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

function createEmptyRestTimer(): RestTimerState {
  return {
    durationSeconds: null,
    endsAt: null,
    label: null,
    sourceSetOrder: null,
    workoutId: null,
  }
}

interface WorkoutSessionState {
  activeWorkoutId: number | null
  activeCycleId: number | null
  activeDayIndex: number | null
  activeWeekNumber: number | null
  prToastLedger: Record<string, true>
  restTimer: RestTimerState
  syncStates: Record<number, SetSyncState>
  completeWorkoutSession: (workoutId: number, options?: { preserveDraft?: boolean }) => void
  clearRestTimer: () => void
  clearWorkoutNoteDraft: (workoutId: number) => void
  exitActiveWorkout: () => void
  hasShownPrToast: (toastKey: string) => boolean
  markPrToastShown: (toastKey: string) => void
  setActiveWorkout: (id: number | null) => void
  setActiveContext: (context: { cycleId: number; dayIndex: number; weekNumber: number }) => void
  setSyncState: (setOrder: number, state: SetSyncState) => void
  setWorkoutNoteDraft: (workoutId: number, note: string) => void
  startRestTimer: (timer: {
    durationSeconds: number
    label?: string | null
    sourceSetOrder?: number | null
    workoutId?: number | null
  }) => void
  workoutNoteDrafts: Record<number, string>
  clearSession: () => void
}

type PersistedWorkoutSessionState = Pick<
  WorkoutSessionState,
  'activeWorkoutId'
  | 'activeCycleId'
  | 'activeDayIndex'
  | 'activeWeekNumber'
  | 'prToastLedger'
  | 'restTimer'
  | 'syncStates'
  | 'workoutNoteDrafts'
>

function createPersistedWorkoutSessionState(): PersistedWorkoutSessionState {
  return {
    activeWorkoutId: null,
    activeCycleId: null,
    activeDayIndex: null,
    activeWeekNumber: null,
    prToastLedger: {},
    restTimer: createEmptyRestTimer(),
    syncStates: {},
    workoutNoteDrafts: {},
  }
}

function normalizePersistedWorkoutSessionState(
  persistedState: unknown,
): PersistedWorkoutSessionState {
  const defaults = createPersistedWorkoutSessionState()
  const persisted = typeof persistedState === 'object' && persistedState !== null
    ? persistedState as Partial<PersistedWorkoutSessionState>
    : {}
  const persistedRestTimer = typeof persisted.restTimer === 'object' && persisted.restTimer !== null
    ? persisted.restTimer
    : {}

  return {
    ...defaults,
    ...persisted,
    prToastLedger: persisted.prToastLedger ?? defaults.prToastLedger,
    restTimer: {
      ...defaults.restTimer,
      ...persistedRestTimer,
    },
    syncStates: persisted.syncStates ?? defaults.syncStates,
    workoutNoteDrafts: persisted.workoutNoteDrafts ?? defaults.workoutNoteDrafts,
  }
}

export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      ...createPersistedWorkoutSessionState(),
      completeWorkoutSession: (workoutId, options) =>
        set((current) => {
          const isActiveWorkout = current.activeWorkoutId === workoutId
          const workoutNoteDrafts = { ...current.workoutNoteDrafts }

          if (!options?.preserveDraft) {
            delete workoutNoteDrafts[workoutId]
          }

          return {
            activeWorkoutId: isActiveWorkout ? null : current.activeWorkoutId,
            activeCycleId: isActiveWorkout ? null : current.activeCycleId,
            activeDayIndex: isActiveWorkout ? null : current.activeDayIndex,
            activeWeekNumber: isActiveWorkout ? null : current.activeWeekNumber,
            prToastLedger: isActiveWorkout ? {} : current.prToastLedger,
            restTimer:
              isActiveWorkout || current.restTimer.workoutId === workoutId
                ? createEmptyRestTimer()
                : current.restTimer,
            syncStates: isActiveWorkout ? {} : current.syncStates,
            workoutNoteDrafts,
          }
        }),
      clearRestTimer: () => set({ restTimer: createEmptyRestTimer() }),
      clearWorkoutNoteDraft: (workoutId) =>
        set((current) => {
          const workoutNoteDrafts = { ...current.workoutNoteDrafts }
          delete workoutNoteDrafts[workoutId]

          return { workoutNoteDrafts }
        }),
      exitActiveWorkout: () =>
        set({
          activeWorkoutId: null,
          restTimer: createEmptyRestTimer(),
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
              ? createEmptyRestTimer()
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
      setWorkoutNoteDraft: (workoutId, note) =>
        set((current) => ({
          workoutNoteDrafts: {
            ...current.workoutNoteDrafts,
            [workoutId]: note,
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
          ...createPersistedWorkoutSessionState(),
        }),
    }),
    {
      name: 'plateiq-workout-session',
      version: 3,
      migrate: (persistedState) => normalizePersistedWorkoutSessionState(persistedState),
    }
  )
)

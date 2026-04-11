import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SetSyncState {
  status: 'dirty' | 'queued' | 'synced' | 'error'
}

interface WorkoutSessionState {
  activeWorkoutId: number | null
  activeCycleId: number | null
  activeDayIndex: number | null
  activeWeekNumber: number | null
  prToastLedger: Record<string, true>
  syncStates: Record<number, SetSyncState>
  hasShownPrToast: (toastKey: string) => boolean
  markPrToastShown: (toastKey: string) => void
  setActiveWorkout: (id: number | null) => void
  setActiveContext: (context: { cycleId: number; dayIndex: number; weekNumber: number }) => void
  setSyncState: (setOrder: number, state: SetSyncState) => void
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
      syncStates: {},
      hasShownPrToast: (toastKey) => get().prToastLedger[toastKey] === true,
      markPrToastShown: (toastKey) =>
        set((current) => ({
          prToastLedger: {
            ...current.prToastLedger,
            [toastKey]: true,
          },
        })),
      setActiveWorkout: (activeWorkoutId) => set({ activeWorkoutId }),
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
      clearSession: () =>
        set({
          activeWorkoutId: null,
          activeCycleId: null,
          activeDayIndex: null,
          activeWeekNumber: null,
          prToastLedger: {},
          syncStates: {},
        }),
    }),
    {
      name: 'plateiq-workout-session',
      version: 2,
    }
  )
)

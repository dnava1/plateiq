import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkoutSessionState {
  activeWorkoutId: number | null
  setActiveWorkout: (id: number | null) => void
}

export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set) => ({
      activeWorkoutId: null,
      setActiveWorkout: (activeWorkoutId) => set({ activeWorkoutId }),
    }),
    {
      name: 'plateiq-workout-session',
    }
  )
)

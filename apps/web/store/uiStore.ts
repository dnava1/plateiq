import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PreferredUnit, WeightRoundingLbs } from '@/types/domain'
import { DEFAULT_WEIGHT_ROUNDING_LBS } from '@/lib/utils'

interface UiState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  preferredUnit: PreferredUnit
  weightRoundingLbs: WeightRoundingLbs
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setPreferredUnit: (unit: PreferredUnit) => void
  setWeightRoundingLbs: (rounding: WeightRoundingLbs) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      theme: 'system',
      preferredUnit: 'lbs',
      weightRoundingLbs: DEFAULT_WEIGHT_ROUNDING_LBS,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setPreferredUnit: (preferredUnit) => set({ preferredUnit }),
      setWeightRoundingLbs: (weightRoundingLbs) => set({ weightRoundingLbs }),
    }),
    {
      name: 'plateiq-ui',
    }
  )
)

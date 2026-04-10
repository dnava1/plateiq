import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PreferredUnit } from '@/types/domain'

interface UiState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  preferredUnit: PreferredUnit
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setPreferredUnit: (unit: PreferredUnit) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      theme: 'system',
      preferredUnit: 'lbs',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setPreferredUnit: (preferredUnit) => set({ preferredUnit }),
    }),
    {
      name: 'plateiq-ui',
    }
  )
)

import { create } from "zustand";

type Theme = "light" | "dark" | "system";
type WeightUnit = "lbs" | "kg";

interface UiStore {
  sidebarOpen: boolean;
  theme: Theme;
  preferredUnit: WeightUnit;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setPreferredUnit: (unit: WeightUnit) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  sidebarOpen: false,
  theme: "system",
  preferredUnit: "lbs",
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  setPreferredUnit: (unit) => set({ preferredUnit: unit }),
}));

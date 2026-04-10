import { create } from 'zustand'
import type { DayTemplate, ProgressionRule, CustomProgramConfig } from '@/types/template'
import type { ProgramLevel, ProgressionStyle } from '@/types/domain'

export type BuilderStep = 'basics' | 'days' | 'exercises' | 'progression' | 'review'

export interface BuilderDraft {
  name: string
  level?: ProgramLevel
  days_per_week: number
  cycle_length_weeks: number
  uses_training_max: boolean
  tm_percentage: number
  rounding: number
  days: DayTemplate[]
  progression: ProgressionRule
}

export const DEFAULT_LINEAR_INCREMENT_LBS = { upper: 5, lower: 10 } as const

export function usesLinearProgression(style: ProgressionStyle) {
  return ['linear_per_session', 'linear_per_week', 'linear_per_cycle'].includes(style)
}

const INITIAL_DRAFT: BuilderDraft = {
  name: '',
  days_per_week: 3,
  cycle_length_weeks: 4,
  uses_training_max: false,
  tm_percentage: 0.9,
  rounding: 5,
  days: [],
  progression: { style: 'linear_per_cycle', increment_lbs: { ...DEFAULT_LINEAR_INCREMENT_LBS } },
}

interface BuilderDraftStore {
  step: BuilderStep
  currentDayIndex: number
  draft: BuilderDraft
  setStep: (s: BuilderStep) => void
  setDayIndex: (i: number) => void
  patchDraft: (patch: Partial<BuilderDraft>) => void
  updateDay: (index: number, day: DayTemplate) => void
  resetDraft: () => void
  toConfig: () => CustomProgramConfig
}

export const useBuilderDraftStore = create<BuilderDraftStore>((set, get) => ({
  step: 'basics',
  currentDayIndex: 0,
  draft: { ...INITIAL_DRAFT, days: [] },
  setStep: (step) => set({ step }),
  setDayIndex: (currentDayIndex) => set({ currentDayIndex }),
  patchDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  updateDay: (index, day) =>
    set((s) => {
      const days = [...s.draft.days]
      days[index] = day
      return { draft: { ...s.draft, days } }
    }),
  resetDraft: () => set({ step: 'basics', currentDayIndex: 0, draft: { ...INITIAL_DRAFT, days: [] } }),
  toConfig: () => {
    const d = get().draft
    const progression = usesLinearProgression(d.progression.style)
      ? {
          ...d.progression,
          increment_lbs: d.progression.increment_lbs ?? { ...DEFAULT_LINEAR_INCREMENT_LBS },
        }
      : {
          ...d.progression,
          increment_lbs: undefined,
        }

    return {
      type: 'custom' as const,
      level: d.level,
      days_per_week: d.days_per_week,
      cycle_length_weeks: d.cycle_length_weeks,
      uses_training_max: d.uses_training_max,
      tm_percentage: d.uses_training_max ? d.tm_percentage : undefined,
      rounding: d.uses_training_max ? d.rounding : undefined,
      days: d.days,
      progression,
    }
  },
}))

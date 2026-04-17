import { create } from 'zustand'
import type {
  CustomProgramConfig,
  DayTemplate,
  EditableProgramMetadata,
  ProgressionRule,
  ProgramWeekSchemes,
} from '@/types/template'
import type { BuilderDraftSource } from '@/lib/programs/editable'
import type { ProgramLevel, ProgressionStyle } from '@/types/domain'

export type BuilderStep = 'basics' | 'days' | 'exercises' | 'progression' | 'review'

export interface BuilderDraft {
  name: string
  level?: ProgramLevel
  days_per_week: number
  cycle_length_weeks: number
  uses_training_max: boolean
  tm_percentage: number
  days: DayTemplate[]
  week_schemes?: ProgramWeekSchemes
  progression: ProgressionRule
  metadata?: EditableProgramMetadata
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
  days: [],
  progression: { style: 'linear_per_cycle', increment_lbs: { ...DEFAULT_LINEAR_INCREMENT_LBS } },
}

interface BuilderDraftStore {
  step: BuilderStep
  currentDayIndex: number
  draft: BuilderDraft
  source: BuilderDraftSource | null
  setStep: (s: BuilderStep) => void
  setDayIndex: (i: number) => void
  patchDraft: (patch: Partial<BuilderDraft>) => void
  patchSource: (source: BuilderDraftSource | null) => void
  updateDay: (index: number, day: DayTemplate) => void
  hydrateDraft: (draft: BuilderDraft, source: BuilderDraftSource | null) => void
  resetDraft: () => void
  toConfig: () => CustomProgramConfig
}

export const useBuilderDraftStore = create<BuilderDraftStore>((set, get) => ({
  step: 'basics',
  currentDayIndex: 0,
  draft: { ...INITIAL_DRAFT, days: [] },
  source: null,
  setStep: (step) => set({ step }),
  setDayIndex: (currentDayIndex) => set({ currentDayIndex }),
  patchDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  patchSource: (source) => set({ source }),
  updateDay: (index, day) =>
    set((s) => {
      const days = [...s.draft.days]
      days[index] = day
      return { draft: { ...s.draft, days } }
    }),
  hydrateDraft: (draft, source) => set({
    step: 'basics',
    currentDayIndex: 0,
    draft: {
      ...draft,
      days: [...draft.days],
      progression: {
        ...draft.progression,
        increment_lbs: draft.progression.increment_lbs ? { ...draft.progression.increment_lbs } : undefined,
      },
      week_schemes: draft.week_schemes
        ? Object.fromEntries(
            Object.entries(draft.week_schemes).map(([weekNumber, scheme]) => [weekNumber, { ...scheme }]),
          )
        : undefined,
      metadata: draft.metadata ? { ...draft.metadata } : undefined,
    },
    source,
  }),
  resetDraft: () => set({ step: 'basics', currentDayIndex: 0, draft: { ...INITIAL_DRAFT, days: [] }, source: null }),
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
      days: d.days,
      week_schemes: d.week_schemes,
      progression,
      metadata: d.metadata,
    }
  },
}))

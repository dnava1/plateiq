import { create } from 'zustand'
import type {
  CustomProgramConfig,
  DayTemplate,
  EditableProgramMetadata,
  ProgressionRule,
  ProgramWeekSchemes,
} from '@/types/template'
import { cloneWeekSchemes, type BuilderDraftSource } from '@/lib/programs/editable'
import { resolveProgramWeekLabel } from '@/lib/programs/week'
import type { ProgramLevel, ProgressionStyle } from '@/types/domain'

export type BuilderStep = 'basics' | 'days' | 'exercises' | 'progression' | 'review'
export type BuilderProgrammingMethod = 'tm_driven' | 'general'

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

export function resolveBuilderProgrammingMethod(usesTrainingMax: boolean): BuilderProgrammingMethod {
  return usesTrainingMax ? 'tm_driven' : 'general'
}

export function usesTrainingMaxForMethod(method: BuilderProgrammingMethod) {
  return method === 'tm_driven'
}

export function createInitialBuilderDraft(overrides: Partial<BuilderDraft> = {}): BuilderDraft {
  const progression = overrides.progression
    ? {
        style: overrides.progression.style ?? 'linear_per_cycle',
        increment_lbs: overrides.progression.increment_lbs
          ? { ...overrides.progression.increment_lbs }
          : { ...DEFAULT_LINEAR_INCREMENT_LBS },
        deload_trigger: overrides.progression.deload_trigger,
        deload_strategy: overrides.progression.deload_strategy,
      }
    : {
        style: 'linear_per_cycle' as const,
        increment_lbs: { ...DEFAULT_LINEAR_INCREMENT_LBS },
      }

  return {
    name: '',
    days_per_week: 3,
    cycle_length_weeks: 4,
    uses_training_max: false,
    tm_percentage: 0.9,
    ...overrides,
    days: overrides.days ? [...overrides.days] : [],
    progression,
  }
}

interface BuilderDraftStore {
  step: BuilderStep
  currentDayIndex: number
  draft: BuilderDraft
  source: BuilderDraftSource | null
  stepError: string | null
  setStep: (s: BuilderStep) => void
  setDayIndex: (i: number) => void
  setStepError: (error: string | null) => void
  clearStepError: () => void
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
  draft: createInitialBuilderDraft(),
  source: null,
  stepError: null,
  setStep: (step) => set({ step, stepError: null }),
  setDayIndex: (currentDayIndex) => set({ currentDayIndex, stepError: null }),
  setStepError: (stepError) => set({ stepError }),
  clearStepError: () => set({ stepError: null }),
  patchDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch }, stepError: null })),
  patchSource: (source) => set({ source }),
  updateDay: (index, day) =>
    set((s) => {
      const days = [...s.draft.days]
      days[index] = day
      return { draft: { ...s.draft, days }, stepError: null }
    }),
  hydrateDraft: (draft, source) => set({
    step: 'basics',
    currentDayIndex: 0,
    stepError: null,
    draft: {
      ...draft,
      days: [...draft.days],
      progression: {
        ...draft.progression,
        increment_lbs: draft.progression.increment_lbs ? { ...draft.progression.increment_lbs } : undefined,
      },
      week_schemes: cloneWeekSchemes(draft.week_schemes),
      metadata: draft.metadata ? { ...draft.metadata } : undefined,
    },
    source,
  }),
  resetDraft: () => set({
    step: 'basics',
    currentDayIndex: 0,
    draft: createInitialBuilderDraft(),
    source: null,
    stepError: null,
  }),
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

    const normalizedWeekSchemes = d.week_schemes
      ? Object.fromEntries(
          Object.entries(d.week_schemes).map(([weekNumber, scheme]) => [
            weekNumber,
            {
              ...scheme,
              label: resolveProgramWeekLabel({ ...d, week_schemes: d.week_schemes }, Number(weekNumber)),
            },
          ]),
        )
      : undefined

    return {
      type: 'custom' as const,
      level: d.level,
      days_per_week: d.days_per_week,
      cycle_length_weeks: d.cycle_length_weeks,
      uses_training_max: d.uses_training_max,
      tm_percentage: d.uses_training_max ? d.tm_percentage : undefined,
      days: d.days,
      week_schemes: normalizedWeekSchemes,
      progression,
      metadata: d.metadata,
    }
  },
}))

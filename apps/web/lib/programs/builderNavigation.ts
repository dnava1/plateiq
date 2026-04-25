import { normalizeProgramStructure, resolveEditableProgramDaySlots } from '@/lib/programs/week'
import {
  validateCustomProgramBasicsStep,
  validateCustomProgramDaysStep,
  validateCustomProgramExerciseDay,
} from '@/lib/validations/program'
import type { BuilderDraft, BuilderStep } from '@/store/builderDraftStore'

export const BUILDER_STEPS: Array<{ key: BuilderStep; label: string }> = [
  { key: 'basics', label: 'Basics' },
  { key: 'days', label: 'Days' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'progression', label: 'Progression' },
  { key: 'review', label: 'Review' },
]

interface BuilderStepValidationResult {
  blockedDayIndex?: number
  blockedStep?: BuilderStep
  error: string | null
  normalizedDraft: BuilderDraft
}

export function getBuilderStepIndex(step: BuilderStep) {
  return BUILDER_STEPS.findIndex((entry) => entry.key === step)
}

export function clampBuilderDayIndex(draft: BuilderDraft, currentDayIndex: number) {
  const totalDays = resolveEditableProgramDaySlots(draft).length

  if (totalDays === 0) {
    return 0
  }

  return Math.min(Math.max(currentDayIndex, 0), totalDays - 1)
}

export function validateBuilderDraftForStep(
  draft: BuilderDraft,
  targetStep: BuilderStep,
): BuilderStepValidationResult {
  const targetStepIndex = getBuilderStepIndex(targetStep)

  if (targetStepIndex <= getBuilderStepIndex('basics')) {
    return {
      error: null,
      normalizedDraft: draft,
    }
  }

  const basicsError = validateCustomProgramBasicsStep(draft.name)

  if (basicsError) {
    return {
      blockedStep: 'basics',
      error: basicsError,
      normalizedDraft: draft,
    }
  }

  const normalizedDraft = {
    ...draft,
    ...normalizeProgramStructure(draft),
  }

  if (targetStepIndex <= getBuilderStepIndex('days')) {
    return {
      error: null,
      normalizedDraft,
    }
  }

  const editableDaySlots = resolveEditableProgramDaySlots(normalizedDraft)
  const daysError = validateCustomProgramDaysStep(editableDaySlots.map((slot) => slot.day))

  if (daysError) {
    return {
      blockedStep: 'days',
      error: daysError,
      normalizedDraft,
    }
  }

  if (targetStepIndex <= getBuilderStepIndex('exercises')) {
    return {
      error: null,
      normalizedDraft,
    }
  }

  for (let dayIndex = 0; dayIndex < editableDaySlots.length; dayIndex += 1) {
    const exerciseError = validateCustomProgramExerciseDay(editableDaySlots[dayIndex].day, dayIndex)

    if (exerciseError) {
      return {
        blockedDayIndex: dayIndex,
        blockedStep: 'exercises',
        error: exerciseError,
        normalizedDraft,
      }
    }
  }

  return {
    error: null,
    normalizedDraft,
  }
}

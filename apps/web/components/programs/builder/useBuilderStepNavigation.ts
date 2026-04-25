'use client'

import { resolveEditableProgramDaySlots } from '@/lib/programs/week'
import { validateCustomProgramExerciseDay } from '@/lib/validations/program'
import {
  clampBuilderDayIndex,
  getBuilderStepIndex,
  validateBuilderDraftForStep,
} from '@/lib/programs/builderNavigation'
import { useBuilderDraftStore, type BuilderStep } from '@/store/builderDraftStore'

export function useBuilderStepNavigation() {
  const {
    currentDayIndex,
    draft,
    patchDraft,
    setDayIndex,
    setStep,
    step,
    stepError,
    setStepError,
    clearStepError,
  } = useBuilderDraftStore()

  const goToStep = (targetStep: BuilderStep) => {
    if (targetStep === step) {
      return true
    }

    const currentStepIndex = getBuilderStepIndex(step)
    const targetStepIndex = getBuilderStepIndex(targetStep)

    if (targetStepIndex <= currentStepIndex) {
      if (targetStep === 'exercises') {
        const nextDayIndex = clampBuilderDayIndex(draft, currentDayIndex)
        setStep(targetStep)
        setDayIndex(nextDayIndex)
        return true
      }

      setStep(targetStep)
      return true
    }

    const validationResult = validateBuilderDraftForStep(draft, targetStep)

    if (validationResult.normalizedDraft !== draft) {
      patchDraft(validationResult.normalizedDraft)
    }

    if (validationResult.error) {
      setStep(validationResult.blockedStep ?? step)

      if (validationResult.blockedStep === 'exercises') {
        setDayIndex(validationResult.blockedDayIndex ?? 0)
      }

      setStepError(validationResult.error)
      return false
    }

    if (targetStep === 'exercises') {
      const nextDayIndex = currentStepIndex > getBuilderStepIndex('exercises')
        ? clampBuilderDayIndex(validationResult.normalizedDraft, currentDayIndex)
        : 0

      setStep(targetStep)
      setDayIndex(nextDayIndex)
      return true
    }

    setStep(targetStep)
    return true
  }

  const goToNextExerciseDay = () => {
    const editableDaySlots = resolveEditableProgramDaySlots(draft)
    const currentSlot = editableDaySlots[currentDayIndex]

    if (!currentSlot) {
      setStep('days')
      return false
    }

    const validationError = validateCustomProgramExerciseDay(currentSlot.day, currentDayIndex)

    if (validationError) {
      setStepError(validationError)
      return false
    }

    clearStepError()

    if (currentDayIndex >= editableDaySlots.length - 1) {
      return goToStep('progression')
    }

    setDayIndex(currentDayIndex + 1)
    return true
  }

  const goToPreviousExerciseDay = () => {
    clearStepError()

    if (currentDayIndex <= 0) {
      setStep('days')
      return true
    }

    setDayIndex(currentDayIndex - 1)
    return true
  }

  return {
    clearStepError,
    goToNextExerciseDay,
    goToPreviousExerciseDay,
    goToStep,
    stepError,
  }
}

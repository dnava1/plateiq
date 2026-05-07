import { buildExerciseKeyMap, resolveExerciseIdFromMap, type Exercise } from '@/hooks/useExercises'
import type { CustomProgramConfig } from '@/types/template'
import { resolveExecutionMaxInputScope, type ExecutionMaxInputMode } from './trainingMax'

interface WeekAwareExecutionProgram extends Pick<CustomProgramConfig, 'cycle_length_weeks' | 'days' | 'week_schemes'> {}

interface CurrentMaxInputSnapshot {
  exercise_id: number
}

export interface RequiredInputCopy {
  badgeLabel: string
  description: string
  emptyStateHint: string
  loadingMessage: string
  missingActionMessage: string
  readyMessage: string
  title: string
  toastLoadingMessage: string
  toastMissingActionMessage: string
}

export interface ExecutionInputRequirementState {
  inputMode: ExecutionMaxInputMode
  missingExerciseNames: string[]
  targetExerciseIds: number[]
  targetExerciseKeys: string[]
}

function formatTrainingMaxTargetLabel(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (segment) => segment.toUpperCase())
}

export function resolveRequiredInputCopy(inputMode: ExecutionMaxInputMode): RequiredInputCopy {
  switch (inputMode) {
    case '1rm':
      return {
        badgeLabel: 'Required lifts',
        emptyStateHint: 'Choose the lifts this program depends on before setting 1RM inputs here.',
        loadingMessage: 'Loading the required 1RM inputs for this program.',
        missingActionMessage: 'Set current estimated 1RMs for',
        readyMessage: 'All required 1RM inputs are set for this program.',
        title: 'Required 1RM Inputs',
        toastLoadingMessage: 'Required 1RM inputs are still loading for this program.',
        toastMissingActionMessage: 'Set current estimated 1RMs for',
        description: 'Set the current estimated 1RM for every lift in this program before you save it. Each dialog can still accept a training max directly if that is what you have.',
      }
    case 'mixed':
      return {
        badgeLabel: 'Required lifts',
        emptyStateHint: 'Choose the lifts this program depends on before setting max inputs here.',
        loadingMessage: 'Loading the required max inputs for this program.',
        missingActionMessage: 'Set the required max inputs for',
        readyMessage: 'All required max inputs are set for this program.',
        title: 'Required Max Inputs',
        toastLoadingMessage: 'Required max inputs are still loading for this program.',
        toastMissingActionMessage: 'Set the required max inputs for',
        description: 'Set the current TM or estimated 1RM for every lift in this program before you save it.',
      }
    default:
      return {
        badgeLabel: 'Required lifts',
        emptyStateHint: 'Choose the lifts this program depends on before setting training maxes here.',
        loadingMessage: 'Loading the required training maxes for this program.',
        missingActionMessage: 'Set current training maxes for',
        readyMessage: 'All required training maxes are set for this program.',
        title: 'Required Training Maxes',
        toastLoadingMessage: 'Training max requirements are still loading for this program.',
        toastMissingActionMessage: 'Set current training maxes for',
        description: 'Set the current training max for every lift in this program before you save it.',
      }
  }
}

export function resolveExecutionInputRequirements(
  definition: WeekAwareExecutionProgram,
  exercises: Exercise[] | undefined,
  maxInputs: CurrentMaxInputSnapshot[] | undefined,
): ExecutionInputRequirementState {
  const maxInputScope = resolveExecutionMaxInputScope(definition)
  const exerciseKeyMap = buildExerciseKeyMap(exercises)
  const resolvedRequiredExerciseIds = [...maxInputScope.exerciseIds]
  const seenRequiredExerciseIds = new Set(resolvedRequiredExerciseIds)
  const unresolvedMaxInputNames: string[] = []

  for (const exerciseKey of maxInputScope.exerciseKeys) {
    const resolvedExerciseId = resolveExerciseIdFromMap(exerciseKeyMap, exerciseKey)

    if (resolvedExerciseId) {
      if (!seenRequiredExerciseIds.has(resolvedExerciseId)) {
        seenRequiredExerciseIds.add(resolvedExerciseId)
        resolvedRequiredExerciseIds.push(resolvedExerciseId)
      }
      continue
    }

    unresolvedMaxInputNames.push(formatTrainingMaxTargetLabel(exerciseKey))
  }

  const exerciseById = new Map((exercises ?? []).map((exercise) => [exercise.id, exercise]))
  const resolvedRequiredExercises = resolvedRequiredExerciseIds.flatMap((exerciseId) => {
    const exercise = exerciseById.get(exerciseId)
    return exercise ? [exercise] : []
  })
  const maxInputExerciseIds = new Set((maxInputs ?? []).map((maxInput) => maxInput.exercise_id))
  const missingExerciseNames = [
    ...resolvedRequiredExercises
      .filter((exercise) => !maxInputExerciseIds.has(exercise.id))
      .map((exercise) => exercise.name),
    ...unresolvedMaxInputNames,
  ]

  if (maxInputScope.inputMode !== 'none' && resolvedRequiredExerciseIds.length === 0 && maxInputScope.exerciseKeys.length === 0) {
    missingExerciseNames.push('the selected primary lifts')
  }

  return {
    inputMode: maxInputScope.inputMode,
    missingExerciseNames,
    targetExerciseIds: maxInputScope.exerciseIds,
    targetExerciseKeys: maxInputScope.exerciseKeys,
  }
}

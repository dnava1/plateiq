import type { DayTemplate, ProgramTemplate } from '@/types/template'
import { collectProgramDays } from './week'
import type { IntensityType } from '@/types/domain'

export interface TrainingMaxTargetScope {
  exerciseIds: number[]
  exerciseKeys: string[]
}

export type ExecutionMaxInputMode = 'none' | 'tm' | '1rm' | 'mixed'

export interface ExecutionMaxInputScope extends TrainingMaxTargetScope {
  inputMode: ExecutionMaxInputMode
}

type WeekAwareTrainingMaxProgram = Pick<ProgramTemplate, 'cycle_length_weeks' | 'days' | 'week_schemes'>

const EXECUTION_BACKED_INTENSITY_TYPES = new Set<IntensityType>(['percentage_tm', 'percentage_1rm'])

function collectTrainingMaxTargetScope(
  days: DayTemplate[],
  includeBlock: (day: DayTemplate, blockIndex: number) => boolean,
): TrainingMaxTargetScope {
  const exerciseIds: number[] = []
  const exerciseKeys: string[] = []
  const seenExerciseIds = new Set<number>()
  const seenExerciseKeys = new Set<string>()

  for (const day of days) {
    for (const [blockIndex, block] of day.exercise_blocks.entries()) {
      if (!includeBlock(day, blockIndex)) {
        continue
      }

      if (typeof block.exercise_id === 'number' && !seenExerciseIds.has(block.exercise_id)) {
        seenExerciseIds.add(block.exercise_id)
        exerciseIds.push(block.exercise_id)
      }

      if (typeof block.exercise_key === 'string') {
        const exerciseKey = block.exercise_key.trim()

        if (exerciseKey.length > 0) {
          const dedupeKey = exerciseKey.toLowerCase()

          if (!seenExerciseKeys.has(dedupeKey)) {
            seenExerciseKeys.add(dedupeKey)
            exerciseKeys.push(exerciseKey)
          }
        }
      }
    }
  }

  return {
    exerciseIds,
    exerciseKeys,
  }
}

export function resolveTrainingMaxTargetScopeFromDays(days: DayTemplate[]): TrainingMaxTargetScope {
  return collectTrainingMaxTargetScope(days, (day, blockIndex) => day.exercise_blocks[blockIndex]?.role === 'primary')
}

export function resolveTrainingMaxTargetScope(program: WeekAwareTrainingMaxProgram): TrainingMaxTargetScope {
  return resolveTrainingMaxTargetScopeFromDays(collectProgramDays(program))
}

function resolveExecutionInputMode(seenIntensityTypes: Set<IntensityType>): ExecutionMaxInputMode {
  const usesTrainingMax = seenIntensityTypes.has('percentage_tm')
  const usesOneRepMax = seenIntensityTypes.has('percentage_1rm')

  if (usesTrainingMax && usesOneRepMax) {
    return 'mixed'
  }

  if (usesTrainingMax) {
    return 'tm'
  }

  if (usesOneRepMax) {
    return '1rm'
  }

  return 'none'
}

export function resolveExecutionMaxInputScopeFromDays(days: DayTemplate[]): ExecutionMaxInputScope {
  const seenIntensityTypes = new Set<IntensityType>()

  const targetScope = collectTrainingMaxTargetScope(
    days,
    (day, blockIndex) => {
      const block = day.exercise_blocks[blockIndex]

      if (!block) {
        return false
      }

      let blockNeedsInput = false

      for (const set of block.sets) {
        if (EXECUTION_BACKED_INTENSITY_TYPES.has(set.intensity_type)) {
          seenIntensityTypes.add(set.intensity_type)
          blockNeedsInput = true
        }
      }

      return blockNeedsInput
    },
  )

  return {
    ...targetScope,
    inputMode: resolveExecutionInputMode(seenIntensityTypes),
  }
}

export function resolveExecutionTrainingMaxTargetScopeFromDays(days: DayTemplate[]): TrainingMaxTargetScope {
  const { exerciseIds, exerciseKeys } = resolveExecutionMaxInputScopeFromDays(days)

  return {
    exerciseIds,
    exerciseKeys,
  }
}

export function resolveExecutionTrainingMaxTargetScope(program: WeekAwareTrainingMaxProgram): TrainingMaxTargetScope {
  return resolveExecutionTrainingMaxTargetScopeFromDays(collectProgramDays(program))
}

export function resolveExecutionMaxInputScope(program: WeekAwareTrainingMaxProgram): ExecutionMaxInputScope {
  return resolveExecutionMaxInputScopeFromDays(collectProgramDays(program))
}

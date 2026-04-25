import type { DayTemplate, ProgramTemplate } from '@/types/template'
import { collectProgramDays } from './week'

export interface TrainingMaxTargetScope {
  exerciseIds: number[]
  exerciseKeys: string[]
}

type WeekAwareTrainingMaxProgram = Pick<ProgramTemplate, 'cycle_length_weeks' | 'days' | 'week_schemes'>

const EXECUTION_BACKED_INTENSITY_TYPES = new Set(['percentage_tm', 'percentage_1rm'])

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

export function resolveExecutionTrainingMaxTargetScopeFromDays(days: DayTemplate[]): TrainingMaxTargetScope {
  return collectTrainingMaxTargetScope(
    days,
    (day, blockIndex) => day.exercise_blocks[blockIndex]?.sets.some((set) => EXECUTION_BACKED_INTENSITY_TYPES.has(set.intensity_type)),
  )
}

export function resolveExecutionTrainingMaxTargetScope(program: WeekAwareTrainingMaxProgram): TrainingMaxTargetScope {
  return resolveExecutionTrainingMaxTargetScopeFromDays(collectProgramDays(program))
}
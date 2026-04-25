import { z } from 'zod'
import type { DayTemplate } from '@/types/template'

const MIN_PROGRAM_NAME_LENGTH = 2
const MAX_PROGRAM_NAME_LENGTH = 100
const MIN_DAYS_PER_WEEK = 1
const MAX_DAYS_PER_WEEK = 7
const MIN_CYCLE_LENGTH_WEEKS = 1
const MAX_CYCLE_LENGTH_WEEKS = 16
const MIN_TM_PERCENTAGE = 0.7
const MAX_TM_PERCENTAGE = 1.0
const MIN_DAY_COUNT = 1
const MAX_DAY_COUNT = 7
const MAX_DAY_LABEL_LENGTH = 100
const MAX_NOTES_LENGTH = 500
const MIN_SET_COUNT = 1
const MAX_SET_COUNT = 20
const MIN_REPS = 1
const MAX_REPS = 100
const MIN_INTENSITY = 0
const MAX_INTENSITY = 10000
const MAX_PROGRESSION_INCREMENT_LBS = 50
const REPS_PATTERN = /^\d+\+?$|^\d+-\d+$/

const PROGRAM_NAME_ERROR_MESSAGE = `Give your program a name with at least ${MIN_PROGRAM_NAME_LENGTH} characters.`
const DAY_LABEL_ERROR_MESSAGE = 'Add a label for each training day.'
const DAY_EXERCISE_ERROR_MESSAGE = 'Add at least one exercise to each training day.'
const EXERCISE_NAME_ERROR_MESSAGE = 'Enter a name for each exercise.'
const SET_COUNT_ERROR_MESSAGE = `Enter between ${MIN_SET_COUNT} and ${MAX_SET_COUNT} sets.`
const REPS_ERROR_MESSAGE = 'Use reps like 5, 5+, or 3-5.'
const INTENSITY_ERROR_MESSAGE = 'Enter a valid intensity.'
const DEFAULT_CUSTOM_PROGRAM_ERROR_MESSAGE = 'Check your program details and try again.'

export const createProgramSchema = z.object({
  template_key: z.string().min(1, 'Select a program template'),
  name: z.string().trim().min(MIN_PROGRAM_NAME_LENGTH, PROGRAM_NAME_ERROR_MESSAGE).max(MAX_PROGRAM_NAME_LENGTH),
  variation_key: z.string().optional(),
  tm_percentage: z.number().min(MIN_TM_PERCENTAGE).max(MAX_TM_PERCENTAGE),
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>

const setPrescriptionSchema = z.object({
  sets: z.number().int().min(MIN_SET_COUNT, SET_COUNT_ERROR_MESSAGE).max(MAX_SET_COUNT, SET_COUNT_ERROR_MESSAGE),
  reps: z.union([
    z.number().int().min(MIN_REPS, REPS_ERROR_MESSAGE).max(MAX_REPS, REPS_ERROR_MESSAGE),
    z.string().trim().regex(REPS_PATTERN, REPS_ERROR_MESSAGE),
  ]),
  reps_max: z.number().int().min(1).max(100).optional(),
  intensity: z.number().min(MIN_INTENSITY, INTENSITY_ERROR_MESSAGE).max(MAX_INTENSITY, INTENSITY_ERROR_MESSAGE),
  intensity_type: z.enum(['percentage_tm', 'percentage_1rm', 'rpe', 'fixed_weight', 'bodyweight', 'percentage_work_set']),
  display_type: z.enum(['backoff']).optional(),
  is_amrap: z.boolean().optional(),
  rest_seconds: z.number().int().min(0).max(600).optional(),
})

const executionGroupSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().max(MAX_DAY_LABEL_LENGTH).optional(),
  type: z.enum(['superset', 'circuit']),
})

const exerciseBlockSchema = z.object({
  block_id: z.string().min(1).optional(),
  role: z.enum(['primary', 'variation', 'accessory']),
  exercise_id: z.number().int().positive().optional(),
  exercise_key: z.string().trim().min(1, EXERCISE_NAME_ERROR_MESSAGE).optional(),
  execution_group: executionGroupSchema.optional(),
  sets: z.array(setPrescriptionSchema).min(1),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
})

const customDaySchema = z.object({
  label: z.string().trim().min(1, DAY_LABEL_ERROR_MESSAGE).max(MAX_DAY_LABEL_LENGTH),
  exercise_blocks: z.array(exerciseBlockSchema).min(1, DAY_EXERCISE_ERROR_MESSAGE),
})

const progressionRuleSchema = z.object({
  style: z.enum(['linear_per_session', 'linear_per_week', 'linear_per_cycle', 'percentage_cycle', 'wave', 'autoregulated', 'custom']),
  increment_lbs: z.object({
    upper: z.number().min(0).max(MAX_PROGRESSION_INCREMENT_LBS),
    lower: z.number().min(0).max(MAX_PROGRESSION_INCREMENT_LBS),
  }).optional(),
  deload_trigger: z.string().optional(),
  deload_strategy: z.string().optional(),
})

const weekSchemeSchema = z.object({
  label: z.string().trim().min(1),
  intensity_modifier: z.number().positive().optional(),
  days: z.array(customDaySchema).min(MIN_DAY_COUNT).max(MAX_DAY_COUNT).optional(),
})

const editableProgramMetadataSchema = z.object({
  source_template_key: z.string().trim().min(1).optional(),
  selected_variation_key: z.string().trim().min(1).nullable().optional(),
})

export const customProgramConfigSchema = z.object({
  type: z.literal('custom'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  days_per_week: z.number().int().min(MIN_DAYS_PER_WEEK).max(MAX_DAYS_PER_WEEK),
  cycle_length_weeks: z.number().int().min(MIN_CYCLE_LENGTH_WEEKS).max(MAX_CYCLE_LENGTH_WEEKS),
  uses_training_max: z.boolean(),
  tm_percentage: z.number().min(MIN_TM_PERCENTAGE).max(MAX_TM_PERCENTAGE).optional(),
  days: z.array(customDaySchema).min(MIN_DAY_COUNT).max(MAX_DAY_COUNT),
  week_schemes: z.record(z.string(), weekSchemeSchema).optional(),
  progression: progressionRuleSchema,
  metadata: editableProgramMetadataSchema.optional(),
})

export const createCustomProgramSchema = z.object({
  name: z.string().trim().min(MIN_PROGRAM_NAME_LENGTH, PROGRAM_NAME_ERROR_MESSAGE).max(MAX_PROGRAM_NAME_LENGTH),
  definition: customProgramConfigSchema,
})

export type CreateCustomProgramInput = z.infer<typeof createCustomProgramSchema>

type CustomProgramDayLike = Pick<DayTemplate, 'label' | 'exercise_blocks'>

function formatDayReference(day: Pick<DayTemplate, 'label'>, dayIndex: number) {
  const label = day.label.trim()
  return label.length > 0 ? label : `day ${dayIndex + 1}`
}

function isValidSetCount(value: number) {
  return Number.isInteger(value) && value >= MIN_SET_COUNT && value <= MAX_SET_COUNT
}

function isValidRepTarget(value: number | string) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= MIN_REPS && value <= MAX_REPS
  }

  return REPS_PATTERN.test(value.trim())
}

function isValidIntensity(value: number) {
  return Number.isFinite(value) && value >= MIN_INTENSITY && value <= MAX_INTENSITY
}

export function validateCustomProgramBasicsStep(name: string) {
  return name.trim().length >= MIN_PROGRAM_NAME_LENGTH ? null : PROGRAM_NAME_ERROR_MESSAGE
}

export function validateCustomProgramDaysStep(days: Array<Pick<DayTemplate, 'label'>>) {
  const invalidDayIndex = days.findIndex((day) => day.label.trim().length === 0)

  if (invalidDayIndex === -1) {
    return null
  }

  return `Add a label for day ${invalidDayIndex + 1} before continuing.`
}

export function validateCustomProgramExerciseDay(day: CustomProgramDayLike, dayIndex: number) {
  const dayReference = formatDayReference(day, dayIndex)

  if (day.exercise_blocks.length === 0) {
    return `Add at least one exercise to ${dayReference} before continuing.`
  }

  const invalidExerciseIndex = day.exercise_blocks.findIndex(
    (block) => (block.exercise_key?.trim().length ?? 0) === 0,
  )

  if (invalidExerciseIndex === -1) {
    for (let blockIndex = 0; blockIndex < day.exercise_blocks.length; blockIndex += 1) {
      const block = day.exercise_blocks[blockIndex]

      for (let setIndex = 0; setIndex < block.sets.length; setIndex += 1) {
        const set = block.sets[setIndex]

        if (!isValidSetCount(set.sets)) {
          return `Enter between ${MIN_SET_COUNT} and ${MAX_SET_COUNT} sets for set ${setIndex + 1} of exercise ${blockIndex + 1} on ${dayReference} before continuing.`
        }

        if (!isValidRepTarget(set.reps)) {
          return `Use reps like 5, 5+, or 3-5 for set ${setIndex + 1} of exercise ${blockIndex + 1} on ${dayReference} before continuing.`
        }

        if (!isValidIntensity(set.intensity)) {
          return `Enter a valid intensity for set ${setIndex + 1} of exercise ${blockIndex + 1} on ${dayReference} before continuing.`
        }
      }
    }

    return null
  }

  return `Enter a name for exercise ${invalidExerciseIndex + 1} on ${dayReference} before continuing.`
}

export function getCreateCustomProgramErrorMessage(error: z.ZodError<CreateCustomProgramInput>) {
  const issue = error.issues[0]

  if (!issue) {
    return DEFAULT_CUSTOM_PROGRAM_ERROR_MESSAGE
  }

  if (issue.path[0] === 'name') {
    return PROGRAM_NAME_ERROR_MESSAGE
  }

  if (issue.path[0] !== 'definition') {
    return issue.message || DEFAULT_CUSTOM_PROGRAM_ERROR_MESSAGE
  }

  const path = issue.path.slice(1)

  if (path[0] === 'days_per_week') {
    return `Choose between ${MIN_DAYS_PER_WEEK} and ${MAX_DAYS_PER_WEEK} training days per week.`
  }

  if (path[0] === 'cycle_length_weeks') {
    return `Choose a cycle length between ${MIN_CYCLE_LENGTH_WEEKS} and ${MAX_CYCLE_LENGTH_WEEKS} weeks.`
  }

  if (path[0] === 'tm_percentage') {
    return 'Choose a training max percentage between 70% and 100%.'
  }

  if (path[0] === 'progression') {
    return 'Check your progression settings before creating the program.'
  }

  if (path[0] === 'days' && typeof path[1] === 'number') {
    const dayNumber = path[1] + 1

    if (path[2] === 'label') {
      return `Add a label for day ${dayNumber} before creating the program.`
    }

    if (path[2] === 'exercise_blocks') {
      if (path.length === 3) {
        return `Add at least one exercise to day ${dayNumber} before creating the program.`
      }

      if (typeof path[3] === 'number' && path[4] === 'exercise_key') {
        return `Enter a name for exercise ${path[3] + 1} on day ${dayNumber} before creating the program.`
      }

      if (typeof path[3] === 'number' && path[4] === 'sets') {
        if (path.length === 5) {
          return `Add at least one set to exercise ${path[3] + 1} on day ${dayNumber} before creating the program.`
        }

        if (typeof path[5] === 'number') {
          const setNumber = path[5] + 1
          const exerciseNumber = path[3] + 1

          if (path[6] === 'sets') {
            return `Enter between ${MIN_SET_COUNT} and ${MAX_SET_COUNT} sets for set ${setNumber} of exercise ${exerciseNumber} on day ${dayNumber} before creating the program.`
          }

          if (path[6] === 'reps') {
            return `Use reps like 5, 5+, or 3-5 for set ${setNumber} of exercise ${exerciseNumber} on day ${dayNumber} before creating the program.`
          }

          if (path[6] === 'intensity') {
            return `Enter a valid intensity for set ${setNumber} of exercise ${exerciseNumber} on day ${dayNumber} before creating the program.`
          }
        }
      }
    }
  }

  if (issue.message === DAY_LABEL_ERROR_MESSAGE) {
    return 'Add a label for each training day before creating the program.'
  }

  if (issue.message === DAY_EXERCISE_ERROR_MESSAGE) {
    return 'Add at least one exercise to each training day before creating the program.'
  }

  if (issue.message === EXERCISE_NAME_ERROR_MESSAGE) {
    return 'Enter a name for each exercise before creating the program.'
  }

  if (issue.message === SET_COUNT_ERROR_MESSAGE) {
    return 'Enter a valid set count before creating the program.'
  }

  if (issue.message === REPS_ERROR_MESSAGE) {
    return 'Use reps like 5, 5+, or 3-5 before creating the program.'
  }

  if (issue.message === INTENSITY_ERROR_MESSAGE) {
    return 'Enter a valid intensity before creating the program.'
  }

  return issue.message || DEFAULT_CUSTOM_PROGRAM_ERROR_MESSAGE
}

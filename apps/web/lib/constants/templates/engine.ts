import type {
  ProgramTemplate,
  SetPrescription,
  GeneratedSet,
  ExerciseBlock,
} from '@/types/template'
import { roundToIncrement } from '@/lib/utils'
import { resolveProgramDay } from '@/lib/programs/week'

const GENERATED_BLOCK_ID_DELIMITER = '-'

function normalizeBlockIdPart(value: string | number | undefined) {
  return String(value ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, GENERATED_BLOCK_ID_DELIMITER)
    .replace(/^-+|-+$/g, '')
}

function buildGeneratedBlockId(
  block: ExerciseBlock,
  dayIndex: number,
  blockIndex: number,
  scope: string,
) {
  if (block.block_id) {
    return block.block_id
  }

  return [
    `day-${dayIndex + 1}`,
    scope,
    `block-${blockIndex + 1}`,
    block.role,
    normalizeBlockIdPart(block.exercise_key ?? block.exercise_id),
  ].join(GENERATED_BLOCK_ID_DELIMITER)
}

export function resolveWeight(
  prescription: SetPrescription,
  trainingMaxes: Map<string, number>,
  exerciseKey: string,
  preferredRounding: number = 5,
  percentageWorkSetBase: number = 0
): number {
  switch (prescription.intensity_type) {
    case 'percentage_tm': {
      const tm = trainingMaxes.get(exerciseKey)
      if (!tm) return 0
      return roundToIncrement(tm * prescription.intensity, preferredRounding, 'down')
    }
    case 'percentage_1rm': {
      const tm = trainingMaxes.get(exerciseKey)
      if (!tm) return 0
      // Assume TM is stored, use it as proxy for 1RM % (user's TM/1RM ratio varies)
      return roundToIncrement(tm * prescription.intensity, preferredRounding, 'down')
    }
    case 'fixed_weight':
      return prescription.intensity
    case 'bodyweight':
      return 0
    case 'rpe':
      return 0 // RPE-based: user determines weight
    case 'percentage_work_set': {
      if (percentageWorkSetBase <= 0) return 0
      return roundToIncrement(percentageWorkSetBase * prescription.intensity, preferredRounding, 'down')
    }
    default:
      return 0
  }
}

function parseReps(reps: number | string): { prescribed: number; max?: number; isAmrap: boolean } {
  if (typeof reps === 'number') {
    return { prescribed: reps, isAmrap: false }
  }
  if (reps.endsWith('+')) {
    return { prescribed: parseInt(reps, 10), isAmrap: true }
  }
  if (reps.includes('-')) {
    const [min, max] = reps.split('-').map(Number)
    return { prescribed: min, max, isAmrap: false }
  }
  const parsed = parseInt(reps, 10)
  return { prescribed: isNaN(parsed) ? 0 : parsed, isAmrap: false }
}

function expandBlock(
  block: ExerciseBlock,
  blockId: string,
  blockOrder: number,
  exerciseKey: string,
  exerciseId: number | undefined,
  trainingMaxes: Map<string, number>,
  startOrder: number,
  preferredRounding: number,
  percentageWorkSetBase: number
): GeneratedSet[] {
  const sets: GeneratedSet[] = []
  let order = startOrder

  for (const prescription of block.sets) {
    const { prescribed, max, isAmrap } = parseReps(prescription.reps)
    const weight = resolveWeight(
      prescription,
      trainingMaxes,
      exerciseKey,
      preferredRounding,
      percentageWorkSetBase,
    )
    const actualIsAmrap = prescription.is_amrap ?? isAmrap

    for (let i = 0; i < prescription.sets; i++) {
      sets.push({
        block_id: blockId,
        block_order: blockOrder,
        block_role: block.role,
        exercise_key: exerciseKey,
        exercise_id: exerciseId,
        execution_group: block.execution_group,
        display_type: prescription.display_type,
        set_order: order++,
        set_type: actualIsAmrap ? 'amrap' : (block.role === 'primary' ? 'main' : block.role) as GeneratedSet['set_type'],
        weight_lbs: weight,
        reps_prescribed: prescribed,
        reps_prescribed_max: max,
        is_amrap: actualIsAmrap,
        intensity_type: prescription.intensity_type,
        rest_seconds: prescription.rest_seconds,
        rpe: prescription.intensity_type === 'rpe' ? prescription.intensity : undefined,
        notes: block.notes,
      })
    }
  }

  return sets
}

export function generateWorkoutPlan(
  template: ProgramTemplate,
  dayIndex: number,
  weekNumber: number,
  trainingMaxes: Map<string, number>,
  selectedVariations: string[] = [],
  preferredRounding: number = 5
): GeneratedSet[] {
  const day = resolveProgramDay(template, dayIndex, weekNumber)
  if (!day) return []

  const allSets: GeneratedSet[] = []
  let setOrder = 1
  let blockOrder = 1

  const weekScheme = template.week_schemes?.[weekNumber]
  const shouldApplyWeekModifier = Boolean(weekScheme?.intensity_modifier) && !weekScheme?.days
  const adjustedDayBlocks = day.exercise_blocks.map((block) =>
    shouldApplyWeekModifier
      ? {
          ...block,
          sets: block.sets.map((set) => ({
            ...set,
            intensity:
              set.intensity_type === 'percentage_tm'
                ? set.intensity * (weekScheme.intensity_modifier ?? 1)
                : set.intensity,
          })),
        }
      : block,
  )

  const primaryBlock = adjustedDayBlocks.find((block) => block.role === 'primary') ?? adjustedDayBlocks[0]
  const primaryExerciseKey = primaryBlock?.exercise_key ?? 'unknown'
  const primaryExerciseId = primaryBlock?.exercise_id
  const percentageWorkSetBase = primaryBlock?.sets[0]
    ? resolveWeight(
        primaryBlock.sets[0],
        trainingMaxes,
        primaryExerciseKey,
        preferredRounding,
      )
    : 0

  for (const [index, block] of adjustedDayBlocks.entries()) {
    const exerciseKey = block.exercise_key ?? primaryExerciseKey ?? 'unknown'
    const exerciseId = block.exercise_id ?? primaryExerciseId
    const blockId = buildGeneratedBlockId(block, dayIndex, index, 'base')

    const blockSets = expandBlock(
      block,
      blockId,
      blockOrder,
      exerciseKey,
      exerciseId,
      trainingMaxes,
      setOrder,
      preferredRounding,
      percentageWorkSetBase,
    )
    allSets.push(...blockSets)
    setOrder += blockSets.length
    blockOrder += 1
  }

  // Expand selected variations
  if (template.variation_options) {
    for (const variation of template.variation_options) {
      if (selectedVariations.includes(variation.key)) {
        for (const [index, block] of variation.blocks.entries()) {
          const exerciseKey = block.exercise_key ?? primaryExerciseKey ?? 'unknown'
          const exerciseId = block.exercise_id ?? primaryExerciseId
          const blockId = buildGeneratedBlockId(block, dayIndex, index, `variation-${variation.key}`)
          const blockSets = expandBlock(
            block,
            blockId,
            blockOrder,
            exerciseKey,
            exerciseId,
            trainingMaxes,
            setOrder,
            preferredRounding,
            percentageWorkSetBase,
          )
          allSets.push(...blockSets)
          setOrder += blockSets.length
          blockOrder += 1
        }
      }
    }
  }

  return allSets
}

export function getProgressionIncrements(
  template: ProgramTemplate,
  exerciseKey: string
): { upper: number; lower: number } {
  const defaults = template.progression.increment_lbs ?? { upper: 5, lower: 10 }
  // Lower body exercises (squat, deadlift) typically progress faster
  const isLower = ['squat', 'deadlift'].includes(exerciseKey)
  return isLower ? { upper: defaults.lower, lower: defaults.lower } : { upper: defaults.upper, lower: defaults.upper }
}

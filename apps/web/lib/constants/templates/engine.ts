import type {
  ProgramTemplate,
  SetPrescription,
  GeneratedSet,
  ExerciseBlock,
} from '@/types/template'
import { roundToNearest } from '@/lib/utils'

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
      return roundToNearest(tm * prescription.intensity, preferredRounding)
    }
    case 'percentage_1rm': {
      const tm = trainingMaxes.get(exerciseKey)
      if (!tm) return 0
      // Assume TM is stored, use it as proxy for 1RM % (user's TM/1RM ratio varies)
      return roundToNearest(tm * prescription.intensity, preferredRounding)
    }
    case 'fixed_weight':
      return prescription.intensity
    case 'bodyweight':
      return 0
    case 'rpe':
      return 0 // RPE-based: user determines weight
    case 'percentage_work_set': {
      if (percentageWorkSetBase <= 0) return 0
      return roundToNearest(percentageWorkSetBase * prescription.intensity, preferredRounding)
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
        exercise_key: exerciseKey,
        exercise_id: exerciseId,
        set_order: order++,
        set_type: actualIsAmrap ? 'amrap' : (block.role === 'primary' ? 'main' : block.role) as GeneratedSet['set_type'],
        weight_lbs: weight,
        reps_prescribed: prescribed,
        reps_prescribed_max: max,
        is_amrap: actualIsAmrap,
        intensity_type: prescription.intensity_type,
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
  const day = template.days[dayIndex]
  if (!day) return []

  const allSets: GeneratedSet[] = []
  let setOrder = 1

  // Get week scheme modifier if applicable (e.g., 5/3/1 wave loading)
  const weekScheme = template.week_schemes?.[weekNumber]
  const adjustedDayBlocks = day.exercise_blocks.map((block) =>
    weekScheme?.intensity_modifier
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
  
  for (const block of adjustedDayBlocks) {
    const exerciseKey = block.exercise_key ?? primaryExerciseKey ?? 'unknown'
    const exerciseId = block.exercise_id ?? primaryExerciseId

    const blockSets = expandBlock(
      block,
      exerciseKey,
      exerciseId,
      trainingMaxes,
      setOrder,
      preferredRounding,
      percentageWorkSetBase,
    )
    allSets.push(...blockSets)
    setOrder += blockSets.length
  }

  // Expand selected variations
  if (template.variation_options) {
    for (const variation of template.variation_options) {
      if (selectedVariations.includes(variation.key)) {
        for (const block of variation.blocks) {
          const exerciseKey = block.exercise_key ?? primaryExerciseKey ?? 'unknown'
          const exerciseId = block.exercise_id ?? primaryExerciseId
          const blockSets = expandBlock(
            block,
            exerciseKey,
            exerciseId,
            trainingMaxes,
            setOrder,
            preferredRounding,
            percentageWorkSetBase,
          )
          allSets.push(...blockSets)
          setOrder += blockSets.length
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

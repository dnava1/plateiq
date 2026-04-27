import { describe, it, expect } from 'vitest'
import { resolveWeight, generateWorkoutPlan, getProgressionIncrements } from './engine'
import { TEMPLATE_REGISTRY } from './index'
import type { ProgramTemplate, SetPrescription } from '@/types/template'

// Helper to create a SetPrescription
function makePrescription(overrides: Partial<SetPrescription> & Pick<SetPrescription, 'intensity_type' | 'intensity'>): SetPrescription {
  return { sets: 1, reps: 5, ...overrides }
}

describe('resolveWeight', () => {
  const trainingMaxes = new Map([
    ['squat', 300],
    ['bench', 200],
    ['ohp', 130],
    ['deadlift', 400],
  ])

  it('handles percentage_tm', () => {
    const prescription = makePrescription({ intensity: 0.85, intensity_type: 'percentage_tm' })
    // 300 * 0.85 = 255, rounded to nearest 5 = 255
    expect(resolveWeight(prescription, trainingMaxes, 'squat')).toBe(255)
  })

  it('handles percentage_tm with rounding', () => {
    const prescription = makePrescription({ intensity: 0.65, intensity_type: 'percentage_tm' })
    // 300 * 0.65 = 195
    expect(resolveWeight(prescription, trainingMaxes, 'squat')).toBe(195)
  })

  it('handles percentage_tm when TM missing', () => {
    const prescription = makePrescription({ intensity: 0.85, intensity_type: 'percentage_tm' })
    expect(resolveWeight(prescription, trainingMaxes, 'power_clean')).toBe(0)
  })

  it('handles percentage_1rm', () => {
    const prescription = makePrescription({ intensity: 0.75, intensity_type: 'percentage_1rm' })
    // 200 * 0.75 = 150
    expect(resolveWeight(prescription, trainingMaxes, 'bench')).toBe(150)
  })

  it('handles fixed_weight', () => {
    const prescription = makePrescription({ intensity: 135, intensity_type: 'fixed_weight' })
    expect(resolveWeight(prescription, trainingMaxes, 'squat')).toBe(135)
  })

  it('handles bodyweight', () => {
    const prescription = makePrescription({ intensity: 0, intensity_type: 'bodyweight' })
    expect(resolveWeight(prescription, trainingMaxes, 'pullup')).toBe(0)
  })

  it('handles rpe', () => {
    const prescription = makePrescription({ intensity: 8, intensity_type: 'rpe' })
    expect(resolveWeight(prescription, trainingMaxes, 'squat')).toBe(0)
  })

  it('handles percentage_work_set', () => {
    const prescription = makePrescription({ intensity: 0.5, intensity_type: 'percentage_work_set' })
    expect(resolveWeight(prescription, trainingMaxes, 'squat', 5, 255)).toBe(125)
  })

  it('rounds to custom increment', () => {
    const prescription = makePrescription({ intensity: 0.725, intensity_type: 'percentage_tm' })
    // 300 * 0.725 = 217.5, rounded to nearest 2.5 = 217.5
    expect(resolveWeight(prescription, trainingMaxes, 'squat', 2.5)).toBe(217.5)
  })
})

describe('generateWorkoutPlan', () => {
  const trainingMaxes = new Map([
    ['squat', 300],
    ['bench', 200],
    ['ohp', 130],
    ['deadlift', 400],
  ])

  it('generates sets for Starting Strength Workout A', () => {
    const template = TEMPLATE_REGISTRY['starting_strength']
    const sets = generateWorkoutPlan(template, 0, 1, trainingMaxes)

    // Workout A: squat 3x5, bench 3x5, deadlift 1x5 = 7 total sets
    expect(sets).toHaveLength(7)

    // Squat sets
    const squatSets = sets.filter((s) => s.exercise_key === 'squat')
    expect(squatSets).toHaveLength(3)
    squatSets.forEach((s) => {
      expect(s.reps_prescribed).toBe(5)
      expect(s.set_type).toBe('main')
    })

    // Bench sets
    const benchSets = sets.filter((s) => s.exercise_key === 'bench')
    expect(benchSets).toHaveLength(3)

    // Deadlift sets
    const deadliftSets = sets.filter((s) => s.exercise_key === 'deadlift')
    expect(deadliftSets).toHaveLength(1)

    // set_order should be sequential
    expect(sets.map((s) => s.set_order)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('generates sets for Wendler 5/3/1 Squat Day (Week 1)', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    // Squat Day is day index 3
    const sets = generateWorkoutPlan(template, 3, 1, trainingMaxes)

    // 3 working sets (1 set each at 65%, 75%, 85%)
    expect(sets).toHaveLength(3)

    // Week 1 modifier is 1.0, so percentages stay the same
    // Set 1: 300 * 0.65 = 195
    expect(sets[0].weight_lbs).toBe(195)
    // Set 2: 300 * 0.75 = 225
    expect(sets[1].weight_lbs).toBe(225)
    // Set 3: 300 * 0.85 = 255 (AMRAP)
    expect(sets[2].weight_lbs).toBe(255)
    expect(sets[2].is_amrap).toBe(true)
  })

  it('applies week 2 intensity modifier for 5/3/1', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    const sets = generateWorkoutPlan(template, 3, 2, trainingMaxes)

    // Week 2 modifier is 1.0769
    // Set 1: 300 * 0.65 * 1.0769 = 210 (rounded to 5)
    expect(sets[0].weight_lbs).toBe(210)
    expect(sets[1].weight_lbs).toBe(240)
    expect(sets[2].weight_lbs).toBe(270)
    expect(sets.map((set) => set.reps_prescribed)).toEqual([3, 3, 3])
    expect(sets[2].is_amrap).toBe(true)
  })

  it('applies week 3 rep targets for 5/3/1', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    const sets = generateWorkoutPlan(template, 3, 3, trainingMaxes)

    expect(sets.map((set) => set.weight_lbs)).toEqual([225, 255, 285])
    expect(sets.map((set) => set.reps_prescribed)).toEqual([5, 3, 1])
    expect(sets[2].is_amrap).toBe(true)
  })

  it('applies week 4 deload modifier for 5/3/1', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    const sets = generateWorkoutPlan(template, 3, 4, trainingMaxes)

    // Week 4 modifier is 0.6154
    expect(sets.map((set) => set.weight_lbs)).toEqual([120, 150, 180])
    expect(sets.map((set) => set.reps_prescribed)).toEqual([5, 5, 5])
    expect(sets.every((set) => !set.is_amrap)).toBe(true)
  })

  it('handles variation options (5/3/1 BBB)', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    const sets = generateWorkoutPlan(template, 3, 1, trainingMaxes, ['bbb'])

    // 3 main sets + 5 BBB variation sets = 8
    expect(sets).toHaveLength(8)

    const variationSets = sets.filter((s) => s.set_type === 'variation')
    expect(variationSets).toHaveLength(5)
    variationSets.forEach((s) => {
      expect(s.reps_prescribed).toBe(10)
      expect(s.exercise_key).toBe('squat')
      expect(s.weight_lbs).toBe(150)
    })
  })

  it('uses the exact first working set weight for Wendler FSL across wave weeks', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    const weekTwoSets = generateWorkoutPlan(template, 3, 2, trainingMaxes, ['fsl'])
    const weekThreeSets = generateWorkoutPlan(template, 3, 3, trainingMaxes, ['fsl'])
    const weekTwoBackoffSets = weekTwoSets.filter((set) => set.set_type === 'variation')
    const weekThreeBackoffSets = weekThreeSets.filter((set) => set.set_type === 'variation')

    expect(weekTwoSets[0]?.weight_lbs).toBe(210)
    expect(weekTwoBackoffSets).toHaveLength(5)
    expect(weekTwoBackoffSets.every((set) => set.weight_lbs === 210)).toBe(true)

    expect(weekThreeSets[0]?.weight_lbs).toBe(225)
    expect(weekThreeBackoffSets).toHaveLength(5)
    expect(weekThreeBackoffSets.every((set) => set.weight_lbs === 225)).toBe(true)
  })

  it('uses the first working set weight for percentage_work_set variations', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    const customVariation = {
      ...template,
      variation_options: [
        {
          key: 'backoff',
          name: 'Backoff',
          description: 'Backoff sets based on the first work set',
          blocks: [
            {
              role: 'variation' as const,
              exercise_key: undefined,
              sets: [{ sets: 2, reps: 5, intensity: 0.9, intensity_type: 'percentage_work_set' as const, display_type: 'backoff' as const }],
            },
          ],
        },
      ],
    }

    const sets = generateWorkoutPlan(customVariation, 3, 1, trainingMaxes, ['backoff'])
    const backoffSets = sets.filter((set) => set.set_type === 'variation')

    expect(backoffSets).toHaveLength(2)
    expect(backoffSets[0].weight_lbs).toBe(175)
    expect(backoffSets[0].exercise_key).toBe('squat')
    expect(backoffSets[0].display_type).toBe('backoff')
  })

  it('uses the first non-warmup work set as the percentage_work_set base', () => {
    const template: ProgramTemplate = {
      key: 'warmup-support',
      name: 'Warmup Support',
      level: 'beginner',
      description: 'Warmup and drop set coverage',
      days_per_week: 1,
      cycle_length_weeks: 1,
      uses_training_max: true,
      required_exercises: ['squat'],
      days: [
        {
          label: 'Squat Day',
          exercise_blocks: [
            {
              role: 'primary',
              exercise_key: 'squat',
              sets: [
                { sets: 1, reps: 5, intensity: 0.4, intensity_type: 'percentage_work_set', purpose: 'warmup' },
                { sets: 1, reps: 3, intensity: 0.6, intensity_type: 'percentage_work_set', purpose: 'warmup' },
                { sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
                { sets: 1, reps: 12, intensity: 0.7, intensity_type: 'percentage_work_set', display_type: 'drop' },
              ],
            },
          ],
        },
      ],
      progression: {
        style: 'linear_per_cycle',
        increment_lbs: { upper: 5, lower: 10 },
      },
    }

    const sets = generateWorkoutPlan(template, 0, 1, trainingMaxes)

    expect(sets.map((set) => set.set_type)).toEqual(['warmup', 'warmup', 'main', 'main', 'main', 'main'])
    expect(sets.map((set) => set.weight_lbs)).toEqual([90, 135, 225, 225, 225, 155])
    expect(sets[5]?.display_type).toBe('drop')
  })

  it('uses each block\'s first non-warmup work set before falling back to the primary block base', () => {
    const template: ProgramTemplate = {
      key: 'block-specific-percentage-work-set',
      name: 'Block Specific Percentage Work Set',
      level: 'intermediate',
      description: 'Block-specific percentage_work_set support',
      days_per_week: 1,
      cycle_length_weeks: 1,
      uses_training_max: true,
      required_exercises: ['squat', 'bench'],
      days: [
        {
          label: 'Upper Lower',
          exercise_blocks: [
            {
              role: 'primary',
              exercise_key: 'squat',
              sets: [
                { sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
              ],
            },
            {
              role: 'variation',
              exercise_key: 'bench',
              sets: [
                { sets: 2, reps: 6, intensity: 0.7, intensity_type: 'percentage_tm' },
                { sets: 1, reps: 10, intensity: 0.8, intensity_type: 'percentage_work_set', display_type: 'drop' },
              ],
            },
          ],
        },
      ],
      progression: {
        style: 'linear_per_cycle',
        increment_lbs: { upper: 5, lower: 10 },
      },
    }

    const sets = generateWorkoutPlan(template, 0, 1, trainingMaxes)
    const squatSets = sets.filter((set) => set.exercise_key === 'squat')
    const benchSets = sets.filter((set) => set.exercise_key === 'bench')

    expect(squatSets.map((set) => set.weight_lbs)).toEqual([225, 225, 225])
    expect(benchSets.map((set) => set.weight_lbs)).toEqual([140, 140, 110])
    expect(benchSets[2]?.display_type).toBe('drop')
  })

  it('preserves block metadata, rest timing, and execution groups through generation', () => {
    const template: ProgramTemplate = {
      key: 'execution-metadata',
      name: 'Execution Metadata',
      level: 'intermediate',
      description: 'Metadata preservation test',
      days_per_week: 1,
      cycle_length_weeks: 1,
      uses_training_max: true,
      required_exercises: ['bench', 'chin_up'],
      days: [
        {
          label: 'Upper',
          exercise_blocks: [
            {
              block_id: 'bench-main',
              role: 'primary',
              exercise_key: 'bench',
              sets: [{ sets: 2, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm', rest_seconds: 180 }],
              notes: 'Pause each rep.',
            },
            {
              role: 'accessory',
              exercise_key: 'chin_up',
              execution_group: {
                key: 'upper-a',
                label: 'Press + Pull',
                type: 'superset',
              },
              sets: [{ sets: 2, reps: 8, intensity: 0, intensity_type: 'bodyweight', rest_seconds: 60 }],
              notes: 'Move quickly between blocks.',
            },
          ],
        },
      ],
      progression: {
        style: 'linear_per_week',
        increment_lbs: { upper: 5, lower: 10 },
      },
    }

    const sets = generateWorkoutPlan(template, 0, 1, trainingMaxes)

    expect(sets[0]).toMatchObject({
      block_id: 'bench-main',
      block_order: 1,
      block_role: 'primary',
      notes: 'Pause each rep.',
      rest_seconds: 180,
    })

    expect(sets[2]).toMatchObject({
      block_role: 'accessory',
      block_order: 2,
      execution_group: {
        key: 'upper-a',
        label: 'Press + Pull',
        type: 'superset',
      },
      rest_seconds: 60,
    })
  })

  it('creates stable fallback block ids when the template omits them', () => {
    const template = TEMPLATE_REGISTRY['starting_strength']
    const sets = generateWorkoutPlan(template, 0, 1, trainingMaxes)
    const squatSets = sets.filter((set) => set.exercise_key === 'squat')
    const benchSets = sets.filter((set) => set.exercise_key === 'bench')

    expect(new Set(squatSets.map((set) => set.block_id)).size).toBe(1)
    expect(new Set(benchSets.map((set) => set.block_id)).size).toBe(1)
    expect(squatSets[0]?.block_id).not.toBe(benchSets[0]?.block_id)
  })

  it('ignores unselected variations', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    const sets = generateWorkoutPlan(template, 3, 1, trainingMaxes, [])
    expect(sets).toHaveLength(3)
  })

  it('returns empty for invalid day index', () => {
    const template = TEMPLATE_REGISTRY['starting_strength']
    expect(generateWorkoutPlan(template, 99, 1, trainingMaxes)).toEqual([])
  })

  it('uses explicit Candito week schemes when generating plans', () => {
    const template = TEMPLATE_REGISTRY['candito_6_week_strength']
    const sets = generateWorkoutPlan(template, 0, 4, trainingMaxes)

    expect(sets).toHaveLength(3)
    expect(sets.map((set) => set.exercise_key)).toEqual(['squat', 'bench', 'bench'])
    expect(sets.map((set) => set.weight_lbs)).toEqual([275, 180, 180])
    expect(sets.map((set) => set.reps_prescribed)).toEqual([2, 3, 3])
  })

  it('uses explicit Rippler week schemes when generating plans', () => {
    const template = TEMPLATE_REGISTRY['gzcl_the_rippler']
    const sets = generateWorkoutPlan(template, 0, 2, trainingMaxes)

    expect(sets).toHaveLength(19)
    expect(sets[0]).toMatchObject({ exercise_key: 'bench', reps_prescribed: 3, weight_lbs: 170 })
    expect(sets[3]).toMatchObject({ exercise_key: 'bench', reps_prescribed: 3, is_amrap: true, weight_lbs: 170 })
    expect(sets.filter((set) => set.exercise_key === 'incline_bench').every((set) => set.weight_lbs === 0)).toBe(true)
    expect(sets.filter((set) => set.exercise_key === 'lateral_raise').length).toBe(5)
    expect(sets.filter((set) => set.exercise_key === 'tricep_pushdown').length).toBe(5)
  })

  it('uses explicit Sheiko week schemes when generating plans', () => {
    const template = TEMPLATE_REGISTRY['sheiko']
    const sets = generateWorkoutPlan(template, 0, 3, trainingMaxes)

    expect(sets).toHaveLength(21)
    expect(sets[0]).toMatchObject({ exercise_key: 'squat', reps_prescribed: 5, weight_lbs: 150 })
    expect(sets[6]).toMatchObject({ exercise_key: 'squat', reps_prescribed: 3, weight_lbs: 240 })
    expect(sets[7]).toMatchObject({ exercise_key: 'bench', reps_prescribed: 5, weight_lbs: 100 })
    expect(sets[14]).toMatchObject({ exercise_key: 'bench', reps_prescribed: 2, weight_lbs: 150 })
    expect(sets[15]).toMatchObject({ exercise_key: 'squat', reps_prescribed: 5, weight_lbs: 150 })
    expect(sets[20]).toMatchObject({ exercise_key: 'squat', reps_prescribed: 4, weight_lbs: 210 })
  })

  // Test plan generation for all 19 templates
  const allTemplateKeys = Object.keys(TEMPLATE_REGISTRY)

  it('has all 19 templates in the registry', () => {
    expect(allTemplateKeys).toHaveLength(19)
  })

  it.each(allTemplateKeys)('generates a valid plan for %s', (key) => {
    const template = TEMPLATE_REGISTRY[key]
    const sets = generateWorkoutPlan(template, 0, 1, trainingMaxes)

    // Every template should produce at least 1 set for day 0
    expect(sets.length).toBeGreaterThanOrEqual(1)

    // All sets should have valid structure
    sets.forEach((s) => {
      expect(s.exercise_key).toBeTruthy()
      expect(s.set_order).toBeGreaterThanOrEqual(1)
      expect(['warmup', 'main', 'amrap', 'variation', 'accessory']).toContain(s.set_type)
      expect(typeof s.weight_lbs).toBe('number')
      expect(s.reps_prescribed).toBeGreaterThanOrEqual(0)
      expect(typeof s.is_amrap).toBe('boolean')
    })

    // set_order should be sequential with no gaps
    const orders = sets.map((s) => s.set_order)
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBe(orders[i - 1] + 1)
    }
  })
})

describe('getProgressionIncrements', () => {
  it('returns lower body increments for squat', () => {
    const template = TEMPLATE_REGISTRY['starting_strength']
    const result = getProgressionIncrements(template, 'squat')
    expect(result).toEqual({ upper: 10, lower: 10 })
  })

  it('returns lower body increments for deadlift', () => {
    const template = TEMPLATE_REGISTRY['starting_strength']
    const result = getProgressionIncrements(template, 'deadlift')
    expect(result).toEqual({ upper: 10, lower: 10 })
  })

  it('returns upper body increments for bench', () => {
    const template = TEMPLATE_REGISTRY['starting_strength']
    const result = getProgressionIncrements(template, 'bench')
    expect(result).toEqual({ upper: 5, lower: 5 })
  })

  it('returns upper body increments for ohp', () => {
    const template = TEMPLATE_REGISTRY['starting_strength']
    const result = getProgressionIncrements(template, 'ohp')
    expect(result).toEqual({ upper: 5, lower: 5 })
  })
})

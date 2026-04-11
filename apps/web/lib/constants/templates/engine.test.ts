import { describe, it, expect } from 'vitest'
import { resolveWeight, generateWorkoutPlan, getProgressionIncrements } from './engine'
import { TEMPLATE_REGISTRY } from './index'
import type { SetPrescription } from '@/types/template'

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
    expect(resolveWeight(prescription, trainingMaxes, 'squat', 5, 255)).toBe(130)
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
    // Set 2: 300 * 0.75 * 1.0769 = 242.3.. → 240
    expect(sets[1].weight_lbs).toBe(240)
    // Set 3: 300 * 0.85 * 1.0769 = 274.6.. → 275
    expect(sets[2].weight_lbs).toBe(275)
  })

  it('applies week 4 deload modifier for 5/3/1', () => {
    const template = TEMPLATE_REGISTRY['wendler_531']
    const sets = generateWorkoutPlan(template, 3, 4, trainingMaxes)

    // Week 4 modifier is 0.6154
    // Set 1: 300 * 0.65 * 0.6154 = 120 (rounded to 5)
    expect(sets[0].weight_lbs).toBe(120)
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
              sets: [{ sets: 2, reps: 5, intensity: 0.9, intensity_type: 'percentage_work_set' as const }],
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

  // Test plan generation for all 15 templates
  const allTemplateKeys = Object.keys(TEMPLATE_REGISTRY)

  it('has all 15 templates in the registry', () => {
    expect(allTemplateKeys).toHaveLength(15)
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

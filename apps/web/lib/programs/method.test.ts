import { describe, expect, it } from 'vitest'
import {
  resolveDefinitionNeedsTrainingMaxForExecution,
  resolveProgramNeedsTrainingMaxForExecution,
  resolveProgramUsesTrainingMax,
} from './method'

describe('resolveProgramUsesTrainingMax', () => {
  it('returns true for TM-driven templates', () => {
    expect(resolveProgramUsesTrainingMax({
      template_key: 'wendler_531',
      config: null,
    } as never)).toBe(true)
  })

  it('returns false for non-TM templates', () => {
    expect(resolveProgramUsesTrainingMax({
      template_key: 'starting_strength',
      config: null,
    } as never)).toBe(false)
  })

  it('prefers custom-program method flags over template defaults', () => {
    expect(resolveProgramUsesTrainingMax({
      template_key: 'custom',
      config: {
        type: 'custom',
        name: 'Custom General Program',
        description: null,
        level: 'intermediate',
        days_per_week: 3,
        cycle_length_weeks: 4,
        uses_training_max: false,
        tm_percentage: 0.9,
        days: [],
        progression: {
          style: 'linear_per_cycle',
          increment_lbs: { upper: 5, lower: 10 },
        },
      },
    } as never)).toBe(false)

    expect(resolveProgramUsesTrainingMax({
      template_key: 'custom',
      config: {
        type: 'custom',
        name: 'Custom TM Program',
        description: null,
        level: 'intermediate',
        days_per_week: 3,
        cycle_length_weeks: 4,
        uses_training_max: true,
        tm_percentage: 0.9,
        days: [],
        progression: {
          style: 'linear_per_cycle',
          increment_lbs: { upper: 5, lower: 10 },
        },
      },
    } as never)).toBe(true)
  })
})

describe('resolveProgramNeedsTrainingMaxForExecution', () => {
  it('returns true for built-in templates whose prescriptions still use TM-backed percentages', () => {
    expect(resolveProgramNeedsTrainingMaxForExecution({
      template_key: 'texas_method',
      config: null,
    } as never)).toBe(true)
  })

  it('returns true for TM-backed prescriptions even when a custom program is marked general', () => {
    expect(resolveProgramNeedsTrainingMaxForExecution({
      template_key: 'custom',
      config: {
        type: 'custom',
        level: 'intermediate',
        days_per_week: 1,
        cycle_length_weeks: 4,
        uses_training_max: false,
        tm_percentage: 0.9,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_key: 'squat',
                sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' }],
              },
            ],
          },
        ],
        progression: {
          style: 'linear_per_cycle',
          increment_lbs: { upper: 5, lower: 10 },
        },
      },
    } as never)).toBe(true)
  })

  it('returns false for custom programs with no TM-backed prescriptions', () => {
    expect(resolveProgramNeedsTrainingMaxForExecution({
      template_key: 'custom',
      config: {
        type: 'custom',
        level: 'intermediate',
        days_per_week: 1,
        cycle_length_weeks: 4,
        uses_training_max: false,
        tm_percentage: 0.9,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_key: 'pull_up',
                sets: [{ sets: 3, reps: 8, intensity: 0, intensity_type: 'bodyweight' }],
              },
            ],
          },
        ],
        progression: {
          style: 'linear_per_cycle',
          increment_lbs: { upper: 5, lower: 10 },
        },
      },
    } as never)).toBe(false)
  })

  it('returns false for non-TM templates with no TM-backed prescriptions', () => {
    expect(resolveProgramNeedsTrainingMaxForExecution({
      template_key: 'starting_strength',
      config: null,
    } as never)).toBe(false)
  })
})

describe('resolveDefinitionNeedsTrainingMaxForExecution', () => {
  it('returns false when a legacy TM flag remains but no prescriptions still depend on TM', () => {
    expect(resolveDefinitionNeedsTrainingMaxForExecution({
      uses_training_max: true,
      days: [
        {
          label: 'Day 1',
          exercise_blocks: [
            {
              role: 'primary',
              exercise_key: 'Squat',
              sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
            },
          ],
        },
      ],
    } as never)).toBe(false)
  })

  it('returns true when a definition keeps TM-backed prescriptions under a general method flag', () => {
    expect(resolveDefinitionNeedsTrainingMaxForExecution({
      uses_training_max: false,
      days: [
        {
          label: 'Day 1',
          exercise_blocks: [
            {
              role: 'primary',
              exercise_key: 'Squat',
              sets: [{ sets: 3, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' }],
            },
          ],
        },
      ],
    } as never)).toBe(true)
  })

  it('returns false when a definition uses no TM-backed prescriptions', () => {
    expect(resolveDefinitionNeedsTrainingMaxForExecution({
      uses_training_max: false,
      days: [
        {
          label: 'Day 1',
          exercise_blocks: [
            {
              role: 'primary',
              exercise_key: 'Pull Up',
              sets: [{ sets: 3, reps: 8, intensity: 0, intensity_type: 'bodyweight' }],
            },
          ],
        },
      ],
    } as never)).toBe(false)
  })
})
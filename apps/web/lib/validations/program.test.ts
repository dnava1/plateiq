import { describe, it, expect } from 'vitest'
import {
  createCustomProgramSchema,
  createProgramSchema,
  getCreateCustomProgramErrorMessage,
  validateCustomProgramBasicsStep,
  validateCustomProgramDaysStep,
  validateCustomProgramExerciseDay,
} from './program'

function buildValidCustomProgramInput() {
  return {
    name: 'Custom Upper Lower',
    definition: {
      type: 'custom' as const,
      days_per_week: 2,
      cycle_length_weeks: 4,
      uses_training_max: true,
      tm_percentage: 0.9,
      days: [
        {
          label: 'Upper',
          exercise_blocks: [
            {
              role: 'primary' as const,
              exercise_key: 'Bench Press',
              sets: [
                {
                  sets: 3,
                  reps: 5,
                  intensity: 0.75,
                  intensity_type: 'percentage_tm' as const,
                },
              ],
            },
          ],
        },
      ],
      progression: {
        style: 'linear_per_cycle' as const,
        increment_lbs: {
          upper: 5,
          lower: 10,
        },
      },
    },
  }
}

describe('createProgramSchema', () => {
  it('accepts valid program creation input', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: "Wendler's 5/3/1",
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional variation_key', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: "My 5/3/1",
      variation_key: 'bbb',
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.variation_key).toBe('bbb')
    }
  })

  it('rejects missing template_key', () => {
    const result = createProgramSchema.safeParse({
      template_key: '',
      name: 'My Program',
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(false)
  })

  it('rejects name shorter than 2 characters', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'A',
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(false)
  })

  it('rejects tm_percentage below 0.7', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'My Program',
      tm_percentage: 0.6,
    })
    expect(result.success).toBe(false)
  })

  it('rejects tm_percentage above 1.0', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'My Program',
      tm_percentage: 1.05,
    })
    expect(result.success).toBe(false)
  })

  it('ignores legacy rounding input', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'My Program',
      rounding: 15,
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('rounding')
    }
  })
})

describe('custom program builder validation helpers', () => {
  it('accepts week-specific day overrides in custom program definitions', () => {
    const input = buildValidCustomProgramInput()
    const result = createCustomProgramSchema.safeParse({
      ...input,
      definition: {
        ...input.definition,
        week_schemes: {
          '2': {
            label: 'Week 2',
            days: [
              {
                label: 'Lower',
                exercise_blocks: [
                  {
                    role: 'primary',
                    exercise_key: 'Squat',
                    sets: [
                      {
                        sets: 3,
                        reps: 3,
                        intensity: 0.8,
                        intensity_type: 'percentage_tm',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    })

    expect(result.success).toBe(true)
  })

  it('requires a readable program name before leaving basics', () => {
    expect(validateCustomProgramBasicsStep(' ')).toBe('Give your program a name with at least 2 characters.')
    expect(validateCustomProgramBasicsStep('Upper / Lower')).toBeNull()
  })

  it('requires every day label before leaving the days step', () => {
    expect(
      validateCustomProgramDaysStep([
        { label: 'Upper' },
        { label: ' ' },
      ]),
    ).toBe('Add a label for day 2 before continuing.')
  })

  it('requires at least one named exercise before leaving a day', () => {
    expect(
      validateCustomProgramExerciseDay({
        label: 'Upper',
        exercise_blocks: [],
      }, 0),
    ).toBe('Add at least one exercise to Upper before continuing.')

    expect(
      validateCustomProgramExerciseDay({
        label: 'Upper',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_key: ' ',
            sets: [
              {
                sets: 3,
                reps: 5,
                intensity: 0.75,
                intensity_type: 'percentage_tm',
              },
            ],
          },
        ],
      }, 0),
    ).toBe('Enter a name for exercise 1 on Upper before continuing.')
  })

  it('requires valid sets and reps before leaving a day', () => {
    expect(
      validateCustomProgramExerciseDay({
        label: 'Upper',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_key: 'Bench Press',
            sets: [
              {
                sets: 21,
                reps: 5,
                intensity: 0.75,
                intensity_type: 'percentage_tm',
              },
            ],
          },
        ],
      }, 0),
    ).toBe('Enter between 1 and 20 sets for set 1 of exercise 1 on Upper before continuing.')

    expect(
      validateCustomProgramExerciseDay({
        label: 'Upper',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_key: 'Bench Press',
            sets: [
              {
                sets: 3,
                reps: 'abc',
                intensity: 0.75,
                intensity_type: 'percentage_tm',
              },
            ],
          },
        ],
      }, 0),
    ).toBe('Use reps like 5, 5+, or 3-5 for set 1 of exercise 1 on Upper before continuing.')
  })
})

describe('getCreateCustomProgramErrorMessage', () => {
  it('maps a short custom program name to a friendly message', () => {
    const result = createCustomProgramSchema.safeParse({
      ...buildValidCustomProgramInput(),
      name: 'A',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getCreateCustomProgramErrorMessage(result.error)).toBe('Give your program a name with at least 2 characters.')
    }
  })

  it('maps blank day labels to a friendly review message', () => {
    const result = createCustomProgramSchema.safeParse({
      ...buildValidCustomProgramInput(),
      definition: {
        ...buildValidCustomProgramInput().definition,
        days: [
          {
            ...buildValidCustomProgramInput().definition.days[0],
            label: ' ',
          },
        ],
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getCreateCustomProgramErrorMessage(result.error)).toBe('Add a label for day 1 before creating the program.')
    }
  })

  it('maps blank exercise names to a friendly review message', () => {
    const input = buildValidCustomProgramInput()
    const result = createCustomProgramSchema.safeParse({
      ...input,
      definition: {
        ...input.definition,
        days: [
          {
            ...input.definition.days[0],
            exercise_blocks: [
              {
                ...input.definition.days[0].exercise_blocks[0],
                exercise_key: ' ',
              },
            ],
          },
        ],
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getCreateCustomProgramErrorMessage(result.error)).toBe('Enter a name for exercise 1 on day 1 before creating the program.')
    }
  })

  it('maps invalid set counts to a friendly review message', () => {
    const input = buildValidCustomProgramInput()
    const result = createCustomProgramSchema.safeParse({
      ...input,
      definition: {
        ...input.definition,
        days: [
          {
            ...input.definition.days[0],
            exercise_blocks: [
              {
                ...input.definition.days[0].exercise_blocks[0],
                sets: [
                  {
                    ...input.definition.days[0].exercise_blocks[0].sets[0],
                    sets: 21,
                  },
                ],
              },
            ],
          },
        ],
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getCreateCustomProgramErrorMessage(result.error)).toBe('Enter between 1 and 20 sets for set 1 of exercise 1 on day 1 before creating the program.')
    }
  })

  it('maps invalid reps to a friendly review message', () => {
    const input = buildValidCustomProgramInput()
    const result = createCustomProgramSchema.safeParse({
      ...input,
      definition: {
        ...input.definition,
        days: [
          {
            ...input.definition.days[0],
            exercise_blocks: [
              {
                ...input.definition.days[0].exercise_blocks[0],
                sets: [
                  {
                    ...input.definition.days[0].exercise_blocks[0].sets[0],
                    reps: 'abc',
                  },
                ],
              },
            ],
          },
        ],
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getCreateCustomProgramErrorMessage(result.error)).toBe('Use reps like 5, 5+, or 3-5 for set 1 of exercise 1 on day 1 before creating the program.')
    }
  })
})

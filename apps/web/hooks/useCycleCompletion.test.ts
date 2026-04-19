import { describe, expect, it } from 'vitest'
import type { CustomProgramConfig } from '@/types/template'
import type { TrainingProgram } from './usePrograms'
import { buildCycleCompletionPreview } from './useCycleCompletion'

function createCustomProgram(style: CustomProgramConfig['progression']['style']) {
  const customProgramConfig: CustomProgramConfig = {
    type: 'custom',
    level: 'intermediate',
    days_per_week: 1,
    cycle_length_weeks: 1,
    uses_training_max: true,
    tm_percentage: 0.9,
    progression: {
      style,
      increment_lbs: { upper: 5, lower: 10 },
    },
    days: [
      {
        label: 'Squat Day',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_id: 1,
            exercise_key: 'squat',
            sets: [{ sets: 1, reps: '5', intensity: 0.85, intensity_type: 'percentage_tm' }],
          },
        ],
      },
    ],
  }

  return {
    template_key: 'custom',
    name: `${style} Squat`,
    config: customProgramConfig,
  } as unknown as TrainingProgram
}

describe('buildCycleCompletionPreview', () => {
  it('multiplies linear per-session increments by completed primary sessions', () => {
    const program = {
      template_key: 'starting_strength',
      name: 'Starting Strength',
      config: { rounding: 5, tm_percentage: 0.9 },
    } as unknown as TrainingProgram

    const rows = buildCycleCompletionPreview({
      program,
      exercises: [{ id: 1, name: 'Squat' }] as never,
      trainingMaxes: [
        {
          exercise_id: 1,
          weight_lbs: 300,
          exercises: { name: 'Squat' },
        },
      ],
      cycleWorkouts: [
        {
          primary_exercise_id: 1,
          completed_at: '2026-04-10T10:00:00.000Z',
          workout_sets: null,
        },
        {
          primary_exercise_id: 1,
          completed_at: '2026-04-12T10:00:00.000Z',
          workout_sets: null,
        },
      ] as never,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      exerciseName: 'Squat',
      currentTmLbs: 300,
      incrementLbs: 20,
      newTmLbs: 320,
    })
  })

  it('holds the training max when AMRAP performance clearly misses the target', () => {
    const program = createCustomProgram('autoregulated')

    const rows = buildCycleCompletionPreview({
      program,
      exercises: [{ id: 1, name: 'Squat' }] as never,
      trainingMaxes: [
        {
          exercise_id: 1,
          weight_lbs: 300,
          exercises: { name: 'Squat' },
        },
      ],
      cycleWorkouts: [
        {
          primary_exercise_id: 1,
          completed_at: '2026-04-10T10:00:00.000Z',
          workout_sets: [
            {
              exercise_id: 1,
              is_amrap: true,
              reps_actual: 3,
              reps_prescribed: 5,
              set_type: 'amrap',
              intensity_type: 'percentage_tm',
              rpe: null,
            },
          ],
        },
      ] as never,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      exerciseName: 'Squat',
      currentTmLbs: 300,
      incrementLbs: 0,
      newTmLbs: 300,
    })
    expect(rows[0].reason).toMatch(/holds/i)
    expect(rows[0].reason).toMatch(/deload manually/i)
  })

  it.each([
    'linear_per_session',
    'linear_per_week',
    'linear_per_cycle',
    'percentage_cycle',
    'wave',
    'custom',
  ] as const)('holds %s progression when logged effort is maximal', (style) => {
    const rows = buildCycleCompletionPreview({
      program: createCustomProgram(style),
      exercises: [{ id: 1, name: 'Squat' }] as never,
      trainingMaxes: [
        {
          exercise_id: 1,
          weight_lbs: 300,
          exercises: { name: 'Squat' },
        },
      ],
      cycleWorkouts: [
        {
          primary_exercise_id: 1,
          completed_at: '2026-04-10T10:00:00.000Z',
          workout_sets: [
            {
              exercise_id: 1,
              intensity_type: 'percentage_tm',
              is_amrap: false,
              reps_actual: 5,
              reps_prescribed: 5,
              rpe: 10,
              set_type: 'main',
            },
          ],
        },
      ] as never,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      exerciseName: 'Squat',
      currentTmLbs: 300,
      incrementLbs: 0,
      newTmLbs: 300,
    })
    expect(rows[0].reason).toMatch(/guardrail/i)
    expect(rows[0].reason).toMatch(/RPE 10/i)
  })

  it('holds autoregulated progression when AMRAP target is met but effort is maximal', () => {
    const rows = buildCycleCompletionPreview({
      program: createCustomProgram('autoregulated'),
      exercises: [{ id: 1, name: 'Squat' }] as never,
      trainingMaxes: [
        {
          exercise_id: 1,
          weight_lbs: 300,
          exercises: { name: 'Squat' },
        },
      ],
      cycleWorkouts: [
        {
          primary_exercise_id: 1,
          completed_at: '2026-04-10T10:00:00.000Z',
          workout_sets: [
            {
              exercise_id: 1,
              intensity_type: 'percentage_tm',
              is_amrap: true,
              reps_actual: 5,
              reps_prescribed: 5,
              rpe: 10,
              set_type: 'amrap',
            },
          ],
        },
      ] as never,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      exerciseName: 'Squat',
      currentTmLbs: 300,
      incrementLbs: 0,
      newTmLbs: 300,
    })
    expect(rows[0].reason).toMatch(/AMRAP target was met/i)
    expect(rows[0].reason).toMatch(/guardrail/i)
  })
})
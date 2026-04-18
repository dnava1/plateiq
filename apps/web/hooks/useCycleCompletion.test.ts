import { describe, expect, it } from 'vitest'
import type { CustomProgramConfig } from '@/types/template'
import type { TrainingProgram } from './usePrograms'
import { buildCycleCompletionPreview } from './useCycleCompletion'

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
    const customProgramConfig: CustomProgramConfig = {
      type: 'custom',
      level: 'intermediate',
      days_per_week: 1,
      cycle_length_weeks: 1,
      uses_training_max: true,
      tm_percentage: 0.9,
      progression: {
        style: 'autoregulated',
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
              sets: [{ sets: 1, reps: '5+', intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true }],
            },
          ],
        },
      ],
    }

    const program = {
      template_key: 'custom',
      name: 'Autoregulated Squat',
      config: customProgramConfig,
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
          workout_sets: [
            {
              exercise_id: 1,
              is_amrap: true,
              reps_actual: 3,
              reps_prescribed: 5,
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
})
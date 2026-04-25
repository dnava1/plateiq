import type { DayTemplate, ProgramTemplate } from '@/types/template'

function createGreyskullWorkout(
  label: string,
  firstExerciseKey: 'ohp' | 'bench',
  secondExerciseKey: 'chin_up' | 'row',
  thirdExerciseKey: 'squat' | 'deadlift',
  thirdExerciseNotes: string,
): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: firstExerciseKey,
        sets: [
          { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
          { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
        ],
        notes: 'Last set AMRAP — aim for 10+ reps to increase weight next session',
      },
      {
        role: 'primary',
        exercise_key: secondExerciseKey,
        sets: [
          { sets: 2, reps: 5, intensity: 0, intensity_type: secondExerciseKey === 'chin_up' ? 'bodyweight' : 'fixed_weight' },
          { sets: 1, reps: '5+', intensity: 0, intensity_type: secondExerciseKey === 'chin_up' ? 'bodyweight' : 'fixed_weight', is_amrap: true },
        ],
      },
      {
        role: 'primary',
        exercise_key: thirdExerciseKey,
        sets: thirdExerciseKey === 'deadlift'
          ? [{ sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true }]
          : [
              { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
              { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
            ],
        notes: thirdExerciseNotes,
      },
    ],
  }
}

const GREYSKULL_WORKOUT_A = createGreyskullWorkout('Workout A', 'ohp', 'chin_up', 'squat', 'Last set AMRAP')
const GREYSKULL_WORKOUT_B = createGreyskullWorkout('Workout B', 'bench', 'row', 'deadlift', 'Last (only) set AMRAP')

export const greyskulllp: ProgramTemplate = {
  key: 'greyskull_lp',
  name: 'Greyskull LP',
  level: 'beginner',
  description:
    'John Sheaffer\'s (Johnny Pain) Greyskull Linear Progression. Based on Starting Strength but with AMRAP (as many reps as possible) on the last set of every exercise to allow for faster strength/rep gains. Runs as a 2-week A/B/A then B/A/B rotation.',
  days_per_week: 3,
  cycle_length_weeks: 2,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift', 'chin_up', 'row'],
  week_schemes: {
    1: { label: 'Week 1 — A / B / A' },
    2: {
      label: 'Week 2 — B / A / B',
      days: [GREYSKULL_WORKOUT_B, GREYSKULL_WORKOUT_A, GREYSKULL_WORKOUT_B],
    },
  },
  days: [
    GREYSKULL_WORKOUT_A,
    GREYSKULL_WORKOUT_B,
    GREYSKULL_WORKOUT_A,
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Fail to get 5 reps on the AMRAP set',
    deload_strategy: 'Reset to 90% (10% reduction) and rebuild',
  },
  source_url: 'https://greyskull.com',
}

import type { DayTemplate, ProgramTemplate } from '@/types/template'

function createStrongliftsWorkout(
  label: string,
  pressExerciseKey: 'bench' | 'ohp',
  pullExerciseKey: 'barbell_row' | 'deadlift',
  pullSets: DayTemplate['exercise_blocks'][number]['sets'],
): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'squat',
        sets: [{ sets: 5, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
      },
      {
        role: 'primary',
        exercise_key: pressExerciseKey,
        sets: [{ sets: 5, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
      },
      {
        role: 'primary',
        exercise_key: pullExerciseKey,
        sets: pullSets,
      },
    ],
  }
}

const STRONGLIFTS_WORKOUT_A = createStrongliftsWorkout(
  'Workout A',
  'bench',
  'barbell_row',
  [{ sets: 5, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
)
const STRONGLIFTS_WORKOUT_B = createStrongliftsWorkout(
  'Workout B',
  'ohp',
  'deadlift',
  [{ sets: 1, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
)

export const stronglifts5x5: ProgramTemplate = {
  key: 'stronglifts_5x5',
  name: 'StrongLifts 5×5',
  level: 'beginner',
  description:
    'Mehdi\'s simple 5×5 program. Three days per week with an explicit 2-week A/B/A then B/A/B rotation. Five sets of five reps on all main lifts (one set of five for deadlift). Linear progression every session.',
  days_per_week: 3,
  cycle_length_weeks: 2,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift', 'barbell_row'],
  week_schemes: {
    1: { label: 'Week 1 — A / B / A' },
    2: {
      label: 'Week 2 — B / A / B',
      days: [STRONGLIFTS_WORKOUT_B, STRONGLIFTS_WORKOUT_A, STRONGLIFTS_WORKOUT_B],
    },
  },
  days: [
    STRONGLIFTS_WORKOUT_A,
    STRONGLIFTS_WORKOUT_B,
    STRONGLIFTS_WORKOUT_A,
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Fail to complete all reps on same weight 3 times',
    deload_strategy: 'Deload to 90% (10% reduction) and rebuild',
  },
  source_url: 'https://stronglifts.com/5x5/',
}

import type { ProgramTemplate } from '@/types/template'

export const stronglifts5x5: ProgramTemplate = {
  key: 'stronglifts_5x5',
  name: 'StrongLifts 5×5',
  level: 'beginner',
  description:
    'Mehdi\'s simple 5×5 program. Three days per week, A/B alternating workouts. Five sets of five reps on all main lifts (one set of five for deadlift). Linear progression every session.',
  days_per_week: 3,
  cycle_length_weeks: 1,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift', 'barbell_row'],
  days: [
    {
      label: 'Workout A',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [{ sets: 5, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [{ sets: 5, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
        {
          role: 'primary',
          exercise_key: 'barbell_row',
          sets: [{ sets: 5, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
      ],
    },
    {
      label: 'Workout B',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [{ sets: 5, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
        {
          role: 'primary',
          exercise_key: 'ohp',
          sets: [{ sets: 5, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [{ sets: 1, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Fail to complete all reps on same weight 3 times',
    deload_strategy: 'Deload to 90% (10% reduction) and rebuild',
  },
  source_url: 'https://stronglifts.com/5x5/',
}

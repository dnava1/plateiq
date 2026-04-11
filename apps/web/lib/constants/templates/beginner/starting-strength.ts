import type { ProgramTemplate } from '@/types/template'

export const startingStrength: ProgramTemplate = {
  key: 'starting_strength',
  name: 'Starting Strength',
  level: 'beginner',
  description:
    'Mark Rippetoe\'s classic barbell program. Three compound lifts per session, 3 days/week, with linear progression every session. Ideal for complete beginners building a strength foundation.',
  days_per_week: 3,
  cycle_length_weeks: 1,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift'],
  days: [
    {
      label: 'Workout A',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [{ sets: 3, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [{ sets: 3, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [{ sets: 1, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
      ],
    },
    {
      label: 'Workout B',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [{ sets: 3, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
        },
        {
          role: 'primary',
          exercise_key: 'ohp',
          sets: [{ sets: 3, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
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
    deload_trigger: '3 consecutive failures on same weight',
    deload_strategy: 'Reset to 90% of failed weight',
  },
  source_url: 'https://startingstrength.com',
}

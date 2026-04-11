import type { ProgramTemplate } from '@/types/template'

export const greyskulllp: ProgramTemplate = {
  key: 'greyskull_lp',
  name: 'Greyskull LP',
  level: 'beginner',
  description:
    'John Sheaffer\'s (Johnny Pain) Greyskull Linear Progression. Based on Starting Strength but with AMRAP (as many reps as possible) on the last set of every exercise to allow for faster strength/rep gains. 3 days/week, A/B alternating.',
  days_per_week: 3,
  cycle_length_weeks: 1,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift', 'chin_up', 'row'],
  days: [
    {
      label: 'Workout A',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'ohp',
          sets: [
            { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
            { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
          ],
          notes: 'Last set AMRAP — aim for 10+ reps to increase weight next session',
        },
        {
          role: 'primary',
          exercise_key: 'chin_up',
          sets: [
            { sets: 2, reps: 5, intensity: 0, intensity_type: 'bodyweight' },
            { sets: 1, reps: '5+', intensity: 0, intensity_type: 'bodyweight', is_amrap: true },
          ],
        },
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
            { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
          ],
          notes: 'Last set AMRAP',
        },
      ],
    },
    {
      label: 'Workout B',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [
            { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
            { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
          ],
          notes: 'Last set AMRAP',
        },
        {
          role: 'primary',
          exercise_key: 'row',
          sets: [
            { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
            { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
          ],
        },
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [
            { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
          ],
          notes: 'Last (only) set AMRAP',
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Fail to get 5 reps on the AMRAP set',
    deload_strategy: 'Reset to 90% (10% reduction) and rebuild',
  },
  source_url: 'https://greyskull.com',
}

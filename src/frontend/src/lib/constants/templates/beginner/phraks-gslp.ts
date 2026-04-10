import type { ProgramTemplate } from '@/types/template'

export const phraksGslp: ProgramTemplate = {
  key: 'phraks_gslp',
  name: "Phrak's Greyskull LP",
  level: 'beginner',
  description:
    "Phrakture's variant of Greyskull LP, popular on Reddit's r/Fitness. Identical structure to GSLP but replaces chin-ups with barbell rows for a more accessible beginner setup. AMRAP on the final set of every exercise.",
  days_per_week: 3,
  cycle_length_weeks: 1,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift', 'row'],
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
          notes: 'Last set AMRAP',
        },
        {
          role: 'primary',
          exercise_key: 'row',
          sets: [
            { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
            { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
          ],
          notes: 'Barbell row, last set AMRAP',
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
          notes: 'Only set — AMRAP',
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 2.5, lower: 5 },
    deload_trigger: 'Fail to reach 5 reps on AMRAP set',
    deload_strategy: 'Reset 10% and rebuild',
  },
  source_url: 'https://old.reddit.com/r/Fitness/wiki/phraks-gslp',
}

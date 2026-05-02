import type { ProgramTemplate } from '@/types/template'

// Madcow 5×5 uses ramping sets (pyramid up to a top set).
// The percentages here represent the top set of the day as a fraction of 5RM.
// For ramping sets, the first 4 sets build up; only the 5th counts toward progression.

export const madcow5x5: ProgramTemplate = {
  key: 'madcow_5x5',
  name: 'Madcow 5×5',
  level: 'intermediate',
  description:
    'Bill Starr\'s 5×5 as popularized by Madcow. Three days per week with ramping sets (pyramid up to a heavy top set). Monday builds volume, Wednesday is moderate, Friday features a heavier top set with a back-off set. Weekly linear progression.',
  days_per_week: 3,
  cycle_length_weeks: 4,
  uses_training_max: false,
  required_exercises: ['Squat', 'Bench Press', 'Overhead Press', 'Deadlift', 'Barbell Row'],
  days: [
    {
      label: 'Monday — Volume',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Squat',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 1.0, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Ramping sets — each set heavier. Top set is your current 5RM.',
        },
        {
          role: 'primary',
          exercise_key: 'Bench Press',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 1.0, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Ramping 5×5',
        },
        {
          role: 'primary',
          exercise_key: 'Barbell Row',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 1.0, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Barbell row — ramping 5×5',
        },
      ],
    },
    {
      label: 'Wednesday — Recovery',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Squat',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Light day — only 2 sets, do not grind',
        },
        {
          role: 'primary',
          exercise_key: 'Overhead Press',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' },
          ],
          notes: 'OHP 4 sets (lighter than Friday bench)',
        },
        {
          role: 'primary',
          exercise_key: 'Deadlift',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Deadlift 4 sets',
        },
      ],
    },
    {
      label: 'Friday — Heavy',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Squat',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 1.025, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 8, intensity: 0.8, intensity_type: 'percentage_1rm', display_type: 'backoff' },
          ],
          notes: 'Ramp 4×5, then new heavy 1×3 (+2.5%), then back-off 1×8 @ 80%',
        },
        {
          role: 'primary',
          exercise_key: 'Bench Press',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 1.025, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 8, intensity: 0.8, intensity_type: 'percentage_1rm', display_type: 'backoff' },
          ],
          notes: 'Same ramp pattern + heavy triple + back-off',
        },
        {
          role: 'primary',
          exercise_key: 'Barbell Row',
          sets: [
            { sets: 1, reps: 5, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 1.025, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 8, intensity: 0.8, intensity_type: 'percentage_1rm', display_type: 'backoff' },
          ],
          notes: 'Row — ramp + heavy triple + back-off',
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_week',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Fail to complete top set reps',
    deload_strategy: 'Take a light week at 80% across the board',
  },
  source_url: 'https://madcow.net/5x5_Program.htm',
}

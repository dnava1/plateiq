import type { ProgramTemplate } from '@/types/template'

// Sheiko — simplified version of the classic #37 prep → #32 → #29 → #30 cycle.
// This represents a 4-week block from Sheiko #37 as a starting point.
// Very high frequency: each main lift done 3-4 times per week at 70-80%.

export const sheiko: ProgramTemplate = {
  key: 'sheiko',
  name: 'Sheiko',
  level: 'advanced',
  description:
    'Boris Sheiko\'s powerlifting program (simplified #37 block). 4 days per week, extremely high volume at moderate intensities (70-85% 1RM). Each main lift is trained 3-4x per week with lots of doubles and triples. Builds sport-specific strength through technical repetition.',
  days_per_week: 4,
  cycle_length_weeks: 4,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'deadlift'],
  days: [
    {
      label: 'Monday — Squat + Bench',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 1, reps: 5, intensity: 0.5, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 2, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 5, reps: 2, intensity: 0.75, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Squat — work to 75% 1RM, multiple doubles and triples',
        },
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [
            { sets: 1, reps: 5, intensity: 0.5, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 2, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 4, reps: 2, intensity: 0.75, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Bench — 75% top sets, multiple doubles',
        },
      ],
    },
    {
      label: 'Wednesday — Squat + Deadlift',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 1, reps: 5, intensity: 0.5, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 3, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 3, reps: 2, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Squat — heavier day, 80% doubles',
        },
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [
            { sets: 1, reps: 5, intensity: 0.5, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 2, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 4, reps: 2, intensity: 0.75, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Deadlift — 75% doubles and triples',
        },
      ],
    },
    {
      label: 'Friday — Bench + Squat',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [
            { sets: 1, reps: 5, intensity: 0.5, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 3, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 3, reps: 2, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Bench — heavier day, 80% doubles',
        },
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 1, reps: 5, intensity: 0.5, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 2, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 3, reps: 2, intensity: 0.75, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Recovery squat day — keep this lighter',
        },
      ],
    },
    {
      label: 'Saturday — Bench + Deadlift',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [
            { sets: 1, reps: 5, intensity: 0.5, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 2, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 3, reps: 2, intensity: 0.75, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Bench recovery day',
        },
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [
            { sets: 1, reps: 5, intensity: 0.5, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 4, intensity: 0.6, intensity_type: 'percentage_1rm' },
            { sets: 3, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
            { sets: 2, reps: 2, intensity: 0.8, intensity_type: 'percentage_1rm' },
            { sets: 1, reps: 3, intensity: 0.7, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Deadlift — heavier day, 80% doubles',
        },
      ],
    },
  ],
  progression: {
    style: 'percentage_cycle',
    deload_trigger: 'After competition or every 4-week block',
    deload_strategy: 'Rest 1-2 weeks before transitioning to next Sheiko program (#32, #29)',
  },
  source_url: 'https://sheiko-program.ru',
}

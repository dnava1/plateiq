import type { ProgramTemplate } from '@/types/template'

// Smolov Jr. — 3-week peaking cycle for a single lift.
// 4 sessions per week, each with different percentages.
// Week 1: base percentages
// Week 2: +5-10 lbs to each day
// Week 3: +10-15 lbs to each day
// Typically run for bench or squat.

export const smolovJr: ProgramTemplate = {
  key: 'smolov_jr',
  name: 'Smolov Jr.',
  level: 'advanced',
  description:
    'The Smolov Jr. is a 3-week intensive specialization block for a single lift (usually bench or squat). 4 sessions per week with very high volume at 70-85% 1RM. Each week the weights increase by 5-15 lbs. Used as a peaking cycle before competition or to break a plateau.',
  days_per_week: 4,
  cycle_length_weeks: 3,
  uses_training_max: false,
  required_exercises: ['squat'],
  week_schemes: {
    1: { label: 'Week 1 — Base Loading', intensity_modifier: 1.0 },
    2: { label: 'Week 2 — +5-10 lbs', intensity_modifier: 1.0 }, // Absolute adds handled by user
    3: { label: 'Week 3 — +10-15 lbs', intensity_modifier: 1.0 },
  },
  days: [
    {
      label: 'Session 1 — 6×6',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 6, reps: 6, intensity: 0.70, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Week 1: 70% × 6×6. Week 2: add 5-10 lbs. Week 3: add 10-15 lbs total vs Week 1.',
        },
      ],
    },
    {
      label: 'Session 2 — 7×5',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 7, reps: 5, intensity: 0.75, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Week 1: 75% × 7×5. Increment each week.',
        },
      ],
    },
    {
      label: 'Session 3 — 8×4',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 8, reps: 4, intensity: 0.80, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Week 1: 80% × 8×4. Hardest session volume-wise.',
        },
      ],
    },
    {
      label: 'Session 4 — 10×3',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 10, reps: 3, intensity: 0.85, intensity_type: 'percentage_1rm' },
          ],
          notes: 'Week 1: 85% × 10×3. Highest intensity of the week.',
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_week',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'After 3 weeks, test new 1RM',
    deload_strategy: 'Deload 1 week, then test. Expect 20-40 lb gain on bench, more on squat.',
  },
  source_url: 'https://www.powerliftingtowin.com/smolov-jr/',
}

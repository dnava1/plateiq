import type { ProgramTemplate } from '@/types/template'

// Wendler 5/3/1: The sets shown are the "working sets" after warm-up.
// Week schemes apply intensity multipliers to the base percentages.
// Base percentages: Set 1=65%, Set 2=75%, Set 3=85%
// Week 1 (5s week): multiply by 1.0 → 65/75/85
// Week 2 (3s week): multiply by ~1.077 → 70/80/90
// Week 3 (5/3/1 week): multiply by ~1.154 → 75/85/95
// Week 4 (Deload): multiply by ~0.615 → 40/50/60
// The AMRAP set is the last set of weeks 1-3.

export const wendler531: ProgramTemplate = {
  key: 'wendler_531',
  name: "Wendler's 5/3/1",
  level: 'intermediate',
  description:
    "Jim Wendler's 5/3/1 program. Four days per week with one main lift per day. Uses wave loading (5s/3s/5-3-1/deload) over a 4-week cycle. Based on a training max (TM = 90% of 1RM). The last set of main working sets is AMRAP. Build strength over months, not weeks.",
  days_per_week: 4,
  cycle_length_weeks: 4,
  uses_training_max: true,
  default_tm_percentage: 0.9,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift'],
  week_schemes: {
    1: { label: '5s Week', intensity_modifier: 1.0 },
    2: { label: '3s Week', intensity_modifier: 1.0769 },
    3: { label: '5/3/1 Week', intensity_modifier: 1.1538 },
    4: { label: 'Deload', intensity_modifier: 0.6154 },
  },
  days: [
    {
      label: 'OHP Day',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'ohp',
          sets: [
            { sets: 1, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm' },
            { sets: 1, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '5+', intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Week 1: 5/5/5+  |  Week 2: 3/3/3+  |  Week 3: 5/3/1+  |  Week 4: Deload',
        },
      ],
    },
    {
      label: 'Deadlift Day',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [
            { sets: 1, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm' },
            { sets: 1, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '5+', intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Last set AMRAP on weeks 1-3',
        },
      ],
    },
    {
      label: 'Bench Day',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [
            { sets: 1, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm' },
            { sets: 1, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '5+', intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Last set AMRAP on weeks 1-3',
        },
      ],
    },
    {
      label: 'Squat Day',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 1, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm' },
            { sets: 1, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '5+', intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Last set AMRAP on weeks 1-3',
        },
      ],
    },
  ],
  variation_options: [
    {
      key: 'bbb',
      name: 'Boring But Big (BBB)',
      description: '5 sets × 10 reps @ 50% TM of the main lift',
      blocks: [
        {
          role: 'variation',
          exercise_key: undefined,
          sets: [{ sets: 5, reps: 10, intensity: 0.5, intensity_type: 'percentage_tm', display_type: 'backoff' }],
          notes: 'BBB — same lift as main, 50% TM',
        },
      ],
    },
    {
      key: 'fsl',
      name: 'First Set Last (FSL)',
      description: '5 sets × 5 reps at the first working set weight',
      blocks: [
        {
          role: 'variation',
          exercise_key: undefined,
          sets: [{ sets: 5, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm', display_type: 'backoff' }],
          notes: 'FSL — 5×5 at first working set weight',
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_cycle',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Every 4th week is a programmed deload',
    deload_strategy: 'Week 4: reduce to 40/50/60% TM for 3×5',
  },
  source_url: 'https://www.jimwendler.com/blogs/jimwendler-com/101065094-5-3-1-for-a-beginner',
}

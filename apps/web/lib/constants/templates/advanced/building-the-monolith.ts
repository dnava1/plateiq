import type { ProgramTemplate } from '@/types/template'

// Building the Monolith is a 6-week 5/3/1 variant by Jim Wendler.
// High accessory volume, 3 days/week with 5/3/1 loading on main lifts.
// Widowmaker = 1×20 at FSL (first set last) weight — absolutely brutal.

export const buildingTheMonolith: ProgramTemplate = {
  key: 'building_the_monolith',
  name: 'Building the Monolith',
  level: 'advanced',
  description:
    "Jim Wendler's 5/3/1 building the monolith. 3 days/week, 6-week challenge. Combines classic 5/3/1 wave loading with extremely high accessory volume (100 chins, 100 dips, 100 face pulls per week). Uses a TM and includes a 'Widowmaker' 20-rep back-off set.",
  days_per_week: 3,
  cycle_length_weeks: 6,
  uses_training_max: true,
  default_tm_percentage: 0.9,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift'],
  week_schemes: {
    1: { label: 'Week 1 — 5s', intensity_modifier: 1.0 },
    2: { label: 'Week 2 — 3s', intensity_modifier: 1.0769 },
    3: { label: 'Week 3 — 5/3/1', intensity_modifier: 1.1538 },
    4: { label: 'Week 4 — 5s (cycle 2)', intensity_modifier: 1.0 },
    5: { label: 'Week 5 — 3s (cycle 2)', intensity_modifier: 1.0769 },
    6: { label: 'Week 6 — 5/3/1 (cycle 2)', intensity_modifier: 1.1538 },
  },
  days: [
    {
      label: 'Day 1 — Squat',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 1, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm' },
            { sets: 1, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '5+', intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true },
            { sets: 1, reps: '20+', intensity: 0.65, intensity_type: 'percentage_tm', display_type: 'backoff', is_amrap: true },
          ],
          notes: 'Standard 5/3/1 sets + Widowmaker set @ first-set-last weight (65%) for 20 reps',
        },
        {
          role: 'variation',
          execution_group: {
            key: 'day-1-press-chin',
            label: 'Press + Chin Superset',
            type: 'superset',
          },
          exercise_key: 'ohp',
          sets: [{ sets: 5, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm', display_type: 'backoff' }],
          notes: 'OHP 5×5 at FSL (65% OHP TM)',
        },
        {
          role: 'accessory',
          execution_group: {
            key: 'day-1-press-chin',
            label: 'Press + Chin Superset',
            type: 'superset',
          },
          exercise_key: 'chin_up',
          sets: [{ sets: 5, reps: 10, intensity: 0, intensity_type: 'bodyweight' }],
          notes: '50 chins per session × 2 sessions = 100/week — superset with OHP',
        },
        {
          role: 'accessory',
          exercise_key: 'dip',
          sets: [{ sets: 5, reps: 10, intensity: 0, intensity_type: 'bodyweight' }],
          notes: '50 dips per session',
        },
        {
          role: 'accessory',
          exercise_key: 'face_pull',
          sets: [{ sets: 5, reps: 20, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: '100 face pulls per session',
        },
      ],
    },
    {
      label: 'Day 2 — Deadlift',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [
            { sets: 1, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm' },
            { sets: 1, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '5+', intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Standard 5/3/1 — no Widowmaker on deadlift day',
        },
        {
          role: 'variation',
          exercise_key: 'bench',
          sets: [{ sets: 5, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm', display_type: 'backoff' }],
          notes: 'Bench 5×5 @ FSL (65% bench TM)',
        },
        {
          role: 'accessory',
          exercise_key: 'db_row',
          sets: [{ sets: 5, reps: 20, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: '100 dumbbell rows (50 each side) per session',
        },
        {
          role: 'accessory',
          exercise_key: 'curl',
          sets: [{ sets: 4, reps: 10, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'Curls 40 reps',
        },
      ],
    },
    {
      label: 'Day 3 — OHP',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'ohp',
          sets: [
            { sets: 1, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm' },
            { sets: 1, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '5+', intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Standard 5/3/1 OHP',
        },
        {
          role: 'variation',
          exercise_key: 'squat',
          sets: [{ sets: 5, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm', display_type: 'backoff' }],
          notes: 'Squat 5×5 @ FSL (65% squat TM)',
        },
        {
          role: 'accessory',
          exercise_key: 'chin_up',
          sets: [{ sets: 5, reps: 10, intensity: 0, intensity_type: 'bodyweight' }],
          notes: '50 chins — second session of the week',
        },
        {
          role: 'accessory',
          exercise_key: 'dip',
          sets: [{ sets: 5, reps: 10, intensity: 0, intensity_type: 'bodyweight' }],
          notes: '50 dips',
        },
        {
          role: 'accessory',
          exercise_key: 'band_pull_apart',
          sets: [{ sets: 10, reps: 20, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: '200 band pull-aparts per session',
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_cycle',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'After 6 weeks, take a deload before next cycle',
    deload_strategy: 'Take 1 week easy at 40-60% before starting next 5/3/1 cycle',
  },
  source_url: 'https://www.jimwendler.com/blogs/jimwendler-com/building-the-monolith',
}

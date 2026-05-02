import type { DayTemplate, ProgramTemplate } from '@/types/template'

function createTexasMethodDays(
  mondayPressKey: 'Bench Press' | 'Overhead Press',
  wednesdayPressKey: 'Bench Press' | 'Overhead Press',
  fridayPressKey: 'Bench Press' | 'Overhead Press',
): DayTemplate[] {
  return [
    {
      label: 'Monday — Volume Day',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Squat',
          sets: [{ sets: 5, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' }],
          notes: '5×5 @ ~90% of Friday 5RM. This is the volume cornerstone.',
        },
        {
          role: 'primary',
          exercise_key: mondayPressKey,
          sets: [{ sets: 5, reps: 5, intensity: 0.9, intensity_type: 'percentage_1rm' }],
          notes: 'Volume press alternates weekly with the Friday intensity press.',
        },
        {
          role: 'variation',
          exercise_key: 'Barbell Row',
          sets: [{ sets: 3, reps: 8, intensity: 0, intensity_type: 'fixed_weight' }],
        },
      ],
    },
    {
      label: 'Wednesday — Recovery Day',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Squat',
          sets: [{ sets: 2, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' }],
          notes: '2×5 light squat — do NOT grind',
        },
        {
          role: 'primary',
          exercise_key: wednesdayPressKey,
          sets: [{ sets: 3, reps: 5, intensity: 0.8, intensity_type: 'percentage_1rm' }],
          notes: 'Recovery press alternates opposite the Monday/Friday lift.',
        },
        {
          role: 'variation',
          exercise_key: 'Deadlift',
          sets: [{ sets: 1, reps: 5, intensity: 0.7, intensity_type: 'percentage_1rm' }],
          notes: 'Light pull — Power Clean 5×3 is a common substitution',
        },
      ],
    },
    {
      label: 'Friday — Intensity Day',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Squat',
          sets: [{ sets: 1, reps: '5+', intensity: 1.0, intensity_type: 'percentage_1rm', is_amrap: true }],
          notes: 'Work to a new 5-rep PR — add 5 lbs from last week\'s Friday',
        },
        {
          role: 'primary',
          exercise_key: fridayPressKey,
          sets: [{ sets: 1, reps: '5+', intensity: 1.0, intensity_type: 'percentage_1rm', is_amrap: true }],
          notes: 'New 5-rep PR attempt on the same lift used Monday that week.',
        },
        {
          role: 'variation',
          exercise_key: 'Deadlift',
          sets: [{ sets: 1, reps: 5, intensity: 1.0, intensity_type: 'fixed_weight' }],
          notes: 'Heavy 1×5 deadlift, add weight when possible',
        },
      ],
    },
  ]
}

export const texasMethod: ProgramTemplate = {
  key: 'texas_method',
  name: 'Texas Method',
  level: 'intermediate',
  description:
    'A classic intermediate program with a 3-day weekly structure: Monday (Volume — high volume at moderate intensity), Wednesday (Recovery — light work), Friday (Intensity — work to a new 5RM PR). Bench and overhead press alternate over an explicit 2-week cycle.',
  days_per_week: 3,
  cycle_length_weeks: 2,
  uses_training_max: false,
  required_exercises: ['Squat', 'Bench Press', 'Overhead Press', 'Deadlift', 'Barbell Row', 'Power Clean'],
  week_schemes: {
    1: { label: 'Week 1 — Bench Focus' },
    2: {
      label: 'Week 2 — OHP Focus',
      days: createTexasMethodDays('Overhead Press', 'Bench Press', 'Overhead Press'),
    },
  },
  days: createTexasMethodDays('Bench Press', 'Overhead Press', 'Bench Press'),
  progression: {
    style: 'linear_per_week',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Fail to achieve new PR on Friday',
    deload_strategy: 'Vary exercises, modify volume, or take a deload week',
  },
  source_url: 'https://startingstrength.com/article/the_texas_method',
}

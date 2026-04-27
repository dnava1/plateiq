import type { DayTemplate, ProgramTemplate, SetPrescription } from '@/types/template'

// Wendler 5/3/1: The sets shown are the working sets after warm-up.
// Each week carries its own exact percentages and rep targets.
// The AMRAP set is the last set of weeks 1-3.

interface Wendler531SetTarget {
  intensity: number
  reps: SetPrescription['reps']
}

type Wendler531WeekTargets = [Wendler531SetTarget, Wendler531SetTarget, Wendler531SetTarget]

const WENDLER_531_DAY_DEFINITIONS = [
  { label: 'OHP Day', exerciseKey: 'ohp' },
  { label: 'Deadlift Day', exerciseKey: 'deadlift' },
  { label: 'Bench Day', exerciseKey: 'bench' },
  { label: 'Squat Day', exerciseKey: 'squat' },
] as const

function createWendler531Sets(targets: Wendler531WeekTargets): SetPrescription[] {
  return [
    { sets: 1, reps: targets[0].reps, intensity: targets[0].intensity, intensity_type: 'percentage_tm' },
    { sets: 1, reps: targets[1].reps, intensity: targets[1].intensity, intensity_type: 'percentage_tm' },
    {
      sets: 1,
      reps: targets[2].reps,
      intensity: targets[2].intensity,
      intensity_type: 'percentage_tm',
      is_amrap: typeof targets[2].reps === 'string' && targets[2].reps.endsWith('+'),
    },
  ]
}

function createWendler531Days(targets: Wendler531WeekTargets, notes: string): DayTemplate[] {
  return WENDLER_531_DAY_DEFINITIONS.map(({ label, exerciseKey }) => ({
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: exerciseKey,
        sets: createWendler531Sets(targets),
        notes,
      },
    ],
  }))
}

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
    1: { label: '5s Week' },
    2: {
      label: '3s Week',
      days: createWendler531Days([
        { intensity: 0.7, reps: 3 },
        { intensity: 0.8, reps: 3 },
        { intensity: 0.9, reps: '3+' },
      ], 'Week 2: 3/3/3+'),
    },
    3: {
      label: '5/3/1 Week',
      days: createWendler531Days([
        { intensity: 0.75, reps: 5 },
        { intensity: 0.85, reps: 3 },
        { intensity: 0.95, reps: '1+' },
      ], 'Week 3: 5/3/1+'),
    },
    4: {
      label: 'Deload',
      days: createWendler531Days([
        { intensity: 0.4, reps: 5 },
        { intensity: 0.5, reps: 5 },
        { intensity: 0.6, reps: 5 },
      ], 'Week 4: Deload'),
    },
  },
  days: createWendler531Days(
    [
      { intensity: 0.65, reps: 5 },
      { intensity: 0.75, reps: 5 },
      { intensity: 0.85, reps: '5+' },
    ],
    'Week 1: 5/5/5+  |  Week 2: 3/3/3+  |  Week 3: 5/3/1+  |  Week 4: Deload',
  ),
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
      description: '5 sets × 5 reps at 100% of the first working set weight',
      blocks: [
        {
          role: 'variation',
          exercise_key: undefined,
          sets: [{ sets: 5, reps: 5, intensity: 1.0, intensity_type: 'percentage_work_set', display_type: 'backoff' }],
          notes: 'FSL — 5×5 at the exact first working set weight',
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

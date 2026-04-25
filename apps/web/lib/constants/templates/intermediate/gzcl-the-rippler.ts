import type { DayTemplate, ProgramTemplate, SetPrescription } from '@/types/template'

interface RipplerWeekDefinition {
  weekNumber: number
  label: string
  t1Sets: SetPrescription[]
  t2Sets: SetPrescription[] | null
  t2PercentageLabel?: string
  t3Sets: SetPrescription[] | null
}

function percentage1rmSets(definitions: Array<{ sets: number; reps: number | string; intensity: number; isAmrap?: boolean }>): SetPrescription[] {
  return definitions.map(({ sets, reps, intensity, isAmrap }) => ({
    sets,
    reps,
    intensity,
    intensity_type: 'percentage_1rm',
    is_amrap: isAmrap,
  }))
}

function fixedSets(sets: number, reps: number | string): SetPrescription[] {
  return [{ sets, reps, intensity: 0, intensity_type: 'fixed_weight' }]
}

function createRipplerDays(week: RipplerWeekDefinition): DayTemplate[] {
  const t2Note = week.t2PercentageLabel
    ? `Use about ${week.t2PercentageLabel} of your 5RM on the T2 lift for this week.`
    : undefined

  const buildDay = (
    label: string,
    primaryKey: 'bench' | 'squat' | 'ohp' | 'deadlift',
    secondaryKey: 'incline_bench' | 'rdl' | 'close_grip_bench' | 'front_squat',
    accessories: Array<'lateral_raise' | 'tricep_pushdown' | 'pull_up' | 'barbell_curl' | 'dumbbell_bench_press' | 'lat_pulldown' | 'barbell_row' | 'face_pull'>,
  ): DayTemplate => ({
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: primaryKey,
        sets: week.t1Sets,
        notes: 'T1 work follows the official Rippler wave. These percentages are the converted weekly top-tier targets for the program.',
      },
      ...(week.t2Sets
        ? [{
            role: 'variation' as const,
            exercise_key: secondaryKey,
            sets: week.t2Sets,
            notes: t2Note,
          }]
        : []),
      ...(week.t3Sets
        ? accessories.map((exerciseKey) => ({
            role: 'accessory' as const,
            exercise_key: exerciseKey,
            sets: week.t3Sets!,
            notes: 'Pick a load you can perform for roughly 10 hard reps. These are the customizable T3 slots of the program.',
          }))
        : []),
    ],
  })

  return [
    buildDay('Day 1 — Bench Focus', 'bench', 'incline_bench', ['lateral_raise', 'tricep_pushdown']),
    buildDay('Day 2 — Squat Focus', 'squat', 'rdl', ['pull_up', 'barbell_curl']),
    buildDay('Day 3 — Press Focus', 'ohp', 'close_grip_bench', ['dumbbell_bench_press', 'lat_pulldown']),
    buildDay('Day 4 — Deadlift Focus', 'deadlift', 'front_squat', ['barbell_row', 'face_pull']),
  ]
}

const RIPPLER_WEEKS: RipplerWeekDefinition[] = [
  {
    weekNumber: 1,
    label: 'Week 1 — Wave 1 Base',
    t1Sets: percentage1rmSets([{ sets: 3, reps: 5, intensity: 0.8 }]),
    t2Sets: fixedSets(5, 6),
    t2PercentageLabel: '68%',
    t3Sets: fixedSets(5, '10+'),
  },
  {
    weekNumber: 2,
    label: 'Week 2 — Wave 1 Push',
    t1Sets: percentage1rmSets([{ sets: 3, reps: 3, intensity: 0.85 }, { sets: 1, reps: '3+', intensity: 0.85, isAmrap: true }]),
    t2Sets: fixedSets(5, 5),
    t2PercentageLabel: '72%',
    t3Sets: fixedSets(5, '10+'),
  },
  {
    weekNumber: 3,
    label: 'Week 3 — Wave 1 Reset',
    t1Sets: percentage1rmSets([{ sets: 3, reps: 4, intensity: 0.825 }]),
    t2Sets: fixedSets(4, 4).concat(fixedSets(1, '4+')),
    t2PercentageLabel: '76%',
    t3Sets: fixedSets(5, '10+'),
  },
  {
    weekNumber: 4,
    label: 'Week 4 — Wave 1 Peak',
    t1Sets: percentage1rmSets([{ sets: 5, reps: 2, intensity: 0.875 }]),
    t2Sets: fixedSets(4, 6),
    t2PercentageLabel: '70%',
    t3Sets: fixedSets(4, '10+'),
  },
  {
    weekNumber: 5,
    label: 'Week 5 — Wave 2 Base',
    t1Sets: percentage1rmSets([{ sets: 2, reps: 4, intensity: 0.85 }, { sets: 1, reps: '4+', intensity: 0.85, isAmrap: true }]),
    t2Sets: fixedSets(4, 5),
    t2PercentageLabel: '74%',
    t3Sets: fixedSets(4, '10+'),
  },
  {
    weekNumber: 6,
    label: 'Week 6 — Wave 2 Push',
    t1Sets: percentage1rmSets([{ sets: 4, reps: 2, intensity: 0.9 }]),
    t2Sets: fixedSets(3, 4).concat(fixedSets(1, '4+')),
    t2PercentageLabel: '78%',
    t3Sets: fixedSets(4, '10+'),
  },
  {
    weekNumber: 7,
    label: 'Week 7 — Wave 2 Reset',
    t1Sets: percentage1rmSets([{ sets: 3, reps: 3, intensity: 0.875 }]),
    t2Sets: fixedSets(3, 6),
    t2PercentageLabel: '72%',
    t3Sets: fixedSets(3, '10+'),
  },
  {
    weekNumber: 8,
    label: 'Week 8 — Wave 2 Peak',
    t1Sets: percentage1rmSets([{ sets: 8, reps: 1, intensity: 0.925 }, { sets: 1, reps: '1+', intensity: 0.925, isAmrap: true }]),
    t2Sets: fixedSets(3, 5),
    t2PercentageLabel: '76%',
    t3Sets: fixedSets(3, '10+'),
  },
  {
    weekNumber: 9,
    label: 'Week 9 — Wave 3 Base',
    t1Sets: percentage1rmSets([{ sets: 2, reps: 2, intensity: 0.9 }, { sets: 1, reps: '2+', intensity: 0.9, isAmrap: true }]),
    t2Sets: fixedSets(2, 4).concat(fixedSets(1, '4+')),
    t2PercentageLabel: '80%',
    t3Sets: fixedSets(3, '10+'),
  },
  {
    weekNumber: 10,
    label: 'Week 10 — Wave 3 Peak',
    t1Sets: percentage1rmSets([{ sets: 1, reps: 1, intensity: 0.95 }]),
    t2Sets: fixedSets(4, 3).concat(fixedSets(1, '3+')),
    t2PercentageLabel: '85%',
    t3Sets: fixedSets(2, '10+'),
  },
  {
    weekNumber: 11,
    label: 'Week 11 — 2RM Preparation',
    t1Sets: percentage1rmSets([{ sets: 3, reps: 2, intensity: 0.85 }, { sets: 1, reps: '2+', intensity: 0.85, isAmrap: true }]),
    t2Sets: null,
    t3Sets: null,
  },
  {
    weekNumber: 12,
    label: 'Week 12 — 1RM Test',
    t1Sets: percentage1rmSets([{ sets: 1, reps: 1, intensity: 0.95 }]),
    t2Sets: null,
    t3Sets: null,
  },
]

const [RIPPLER_WEEK_ONE, ...RIPPLER_REMAINING_WEEKS] = RIPPLER_WEEKS

export const gzclTheRippler: ProgramTemplate = {
  key: 'gzcl_the_rippler',
  name: 'GZCL: The Rippler',
  level: 'intermediate',
  description:
    'Cody Lefever\'s 12-week GZCL bridge program. A four-day upper/lower split with bi-weekly undulation in intensity, gradually falling accessory volume, and a final two-week peak that removes T2 and T3 work before testing.',
  days_per_week: 4,
  cycle_length_weeks: 12,
  uses_training_max: false,
  required_exercises: [
    'bench',
    'squat',
    'ohp',
    'deadlift',
    'incline_bench',
    'rdl',
    'close_grip_bench',
    'front_squat',
    'lateral_raise',
    'tricep_pushdown',
    'pull_up',
    'barbell_curl',
    'dumbbell_bench_press',
    'lat_pulldown',
    'barbell_row',
    'face_pull',
  ],
  week_schemes: Object.fromEntries([
    [RIPPLER_WEEK_ONE.weekNumber, { label: RIPPLER_WEEK_ONE.label }],
    ...RIPPLER_REMAINING_WEEKS.map((week) => [
      week.weekNumber,
      {
        label: week.label,
        days: createRipplerDays(week),
      },
    ]),
  ]),
  days: createRipplerDays(RIPPLER_WEEK_ONE),
  progression: {
    style: 'wave',
    deload_trigger: 'Unplanned missed reps during weeks 1-10 or a clear inability to recover between waves',
    deload_strategy: 'Trim T3 work first, then drop the next week\'s T1 and T2 targets by 5% if fatigue still runs high',
  },
  source_url: 'https://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html',
}
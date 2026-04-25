import type { DayTemplate, ProgramTemplate, SetPrescription } from '@/types/template'

interface BuildingTheMonolithWeekTarget {
  weekNumber: number
  label: string
  targets: [
    { intensity: number; reps: SetPrescription['reps'] },
    { intensity: number; reps: SetPrescription['reps'] },
    { intensity: number; reps: SetPrescription['reps'] },
  ]
  firstSetLastIntensity: number
  notes: string
}

const BUILDING_THE_MONOLITH_WEEK_TARGETS: BuildingTheMonolithWeekTarget[] = [
  {
    weekNumber: 1,
    label: 'Week 1 — 5s',
    targets: [
      { intensity: 0.65, reps: 5 },
      { intensity: 0.75, reps: 5 },
      { intensity: 0.85, reps: '5+' },
    ],
    firstSetLastIntensity: 0.65,
    notes: 'Week 1: 5/5/5+ with first-set-last supplemental work.',
  },
  {
    weekNumber: 2,
    label: 'Week 2 — 3s',
    targets: [
      { intensity: 0.7, reps: 3 },
      { intensity: 0.8, reps: 3 },
      { intensity: 0.9, reps: '3+' },
    ],
    firstSetLastIntensity: 0.7,
    notes: 'Week 2: 3/3/3+ with first-set-last supplemental work.',
  },
  {
    weekNumber: 3,
    label: 'Week 3 — 5/3/1',
    targets: [
      { intensity: 0.75, reps: 5 },
      { intensity: 0.85, reps: 3 },
      { intensity: 0.95, reps: '1+' },
    ],
    firstSetLastIntensity: 0.75,
    notes: 'Week 3: 5/3/1+ with first-set-last supplemental work.',
  },
  {
    weekNumber: 4,
    label: 'Week 4 — 5s (Cycle 2)',
    targets: [
      { intensity: 0.65, reps: 5 },
      { intensity: 0.75, reps: 5 },
      { intensity: 0.85, reps: '5+' },
    ],
    firstSetLastIntensity: 0.65,
    notes: 'Week 4: restart the 5s wave with the second cycle.',
  },
  {
    weekNumber: 5,
    label: 'Week 5 — 3s (Cycle 2)',
    targets: [
      { intensity: 0.7, reps: 3 },
      { intensity: 0.8, reps: 3 },
      { intensity: 0.9, reps: '3+' },
    ],
    firstSetLastIntensity: 0.7,
    notes: 'Week 5: second-cycle 3s wave with first-set-last work.',
  },
  {
    weekNumber: 6,
    label: 'Week 6 — 5/3/1 (Cycle 2)',
    targets: [
      { intensity: 0.75, reps: 5 },
      { intensity: 0.85, reps: 3 },
      { intensity: 0.95, reps: '1+' },
    ],
    firstSetLastIntensity: 0.75,
    notes: 'Week 6: second-cycle 5/3/1 wave with first-set-last work.',
  },
]

function createBuildingTheMonolithMainSets(
  week: BuildingTheMonolithWeekTarget,
  includeWidowmaker: boolean,
): SetPrescription[] {
  const sets: SetPrescription[] = [
    { sets: 1, reps: week.targets[0].reps, intensity: week.targets[0].intensity, intensity_type: 'percentage_tm' },
    { sets: 1, reps: week.targets[1].reps, intensity: week.targets[1].intensity, intensity_type: 'percentage_tm' },
    {
      sets: 1,
      reps: week.targets[2].reps,
      intensity: week.targets[2].intensity,
      intensity_type: 'percentage_tm',
      is_amrap: typeof week.targets[2].reps === 'string' && week.targets[2].reps.endsWith('+'),
    },
  ]

  if (includeWidowmaker) {
    sets.push({
      sets: 1,
      reps: '20+',
      intensity: week.firstSetLastIntensity,
      intensity_type: 'percentage_tm',
      display_type: 'backoff',
      is_amrap: true,
    })
  }

  return sets
}

function createBuildingTheMonolithDays(week: BuildingTheMonolithWeekTarget): DayTemplate[] {
  return [
    {
      label: 'Day 1 — Squat',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: createBuildingTheMonolithMainSets(week, true),
          notes: `${week.notes} Widowmaker set at the first-set-last weight.`,
        },
        {
          role: 'variation',
          execution_group: {
            key: 'day-1-press-chin',
            label: 'Press + Chin Superset',
            type: 'superset',
          },
          exercise_key: 'ohp',
          sets: [{ sets: 5, reps: 5, intensity: week.firstSetLastIntensity, intensity_type: 'percentage_tm', display_type: 'backoff' }],
          notes: `OHP 5×5 at first-set-last (${Math.round(week.firstSetLastIntensity * 100)}%)`,
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
          sets: createBuildingTheMonolithMainSets(week, false),
          notes: `${week.notes} No Widowmaker on deadlift day.`,
        },
        {
          role: 'variation',
          exercise_key: 'bench',
          sets: [{ sets: 5, reps: 5, intensity: week.firstSetLastIntensity, intensity_type: 'percentage_tm', display_type: 'backoff' }],
          notes: `Bench 5×5 at first-set-last (${Math.round(week.firstSetLastIntensity * 100)}%)`,
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
          sets: createBuildingTheMonolithMainSets(week, false),
          notes: week.notes,
        },
        {
          role: 'variation',
          exercise_key: 'squat',
          sets: [{ sets: 5, reps: 5, intensity: week.firstSetLastIntensity, intensity_type: 'percentage_tm', display_type: 'backoff' }],
          notes: `Squat 5×5 at first-set-last (${Math.round(week.firstSetLastIntensity * 100)}%)`,
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
  ]
}

const [BUILDING_THE_MONOLITH_WEEK_ONE, ...BUILDING_THE_MONOLITH_REMAINING_WEEKS] = BUILDING_THE_MONOLITH_WEEK_TARGETS

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
  week_schemes: Object.fromEntries([
    [BUILDING_THE_MONOLITH_WEEK_ONE.weekNumber, { label: BUILDING_THE_MONOLITH_WEEK_ONE.label }],
    ...BUILDING_THE_MONOLITH_REMAINING_WEEKS.map((week) => [
      week.weekNumber,
      {
        label: week.label,
        days: createBuildingTheMonolithDays(week),
      },
    ]),
  ]),
  days: createBuildingTheMonolithDays(BUILDING_THE_MONOLITH_WEEK_ONE),
  progression: {
    style: 'linear_per_cycle',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'After 6 weeks, take a deload before next cycle',
    deload_strategy: 'Take 1 week easy at 40-60% before starting next 5/3/1 cycle',
  },
  source_url: 'https://www.jimwendler.com/blogs/jimwendler-com/building-the-monolith',
}

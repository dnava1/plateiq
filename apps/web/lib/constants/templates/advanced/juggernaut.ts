import type { DayTemplate, ProgramTemplate, SetPrescription } from '@/types/template'

interface JuggernautWeekTarget {
  weekNumber: number
  label: string
  straightSets: number
  straightReps: number
  amrapReps?: SetPrescription['reps']
  intensity: number
  notes: string
}

const JUGGERNAUT_WEEK_TARGETS: JuggernautWeekTarget[] = [
  { weekNumber: 1, label: '10s Accumulation (60%×10×3)', straightSets: 3, straightReps: 10, intensity: 0.6, notes: '10s accumulation week.' },
  { weekNumber: 2, label: '10s Intensification (65%×10×2 + PR set)', straightSets: 2, straightReps: 10, amrapReps: '10+', intensity: 0.65, notes: '10s intensification week with a final PR set.' },
  { weekNumber: 3, label: '10s Realization (70%×10+ AMRAP)', straightSets: 0, straightReps: 10, amrapReps: '10+', intensity: 0.7, notes: '10s realization week — PR set only.' },
  { weekNumber: 4, label: '10s Deload (50%×5×2)', straightSets: 2, straightReps: 5, intensity: 0.5, notes: '10s deload week.' },
  { weekNumber: 5, label: '8s Accumulation (65%×8×3)', straightSets: 3, straightReps: 8, intensity: 0.65, notes: '8s accumulation week.' },
  { weekNumber: 6, label: '8s Intensification (70%×8×2 + PR set)', straightSets: 2, straightReps: 8, amrapReps: '8+', intensity: 0.7, notes: '8s intensification week with a final PR set.' },
  { weekNumber: 7, label: '8s Realization (75%×8+ AMRAP)', straightSets: 0, straightReps: 8, amrapReps: '8+', intensity: 0.75, notes: '8s realization week — PR set only.' },
  { weekNumber: 8, label: '8s Deload (50%×5×2)', straightSets: 2, straightReps: 5, intensity: 0.5, notes: '8s deload week.' },
  { weekNumber: 9, label: '5s Accumulation (70%×5×4)', straightSets: 4, straightReps: 5, intensity: 0.7, notes: '5s accumulation week.' },
  { weekNumber: 10, label: '5s Intensification (75%×5×3 + PR set)', straightSets: 3, straightReps: 5, amrapReps: '5+', intensity: 0.75, notes: '5s intensification week with a final PR set.' },
  { weekNumber: 11, label: '5s Realization (80%×5+ AMRAP)', straightSets: 0, straightReps: 5, amrapReps: '5+', intensity: 0.8, notes: '5s realization week — PR set only.' },
  { weekNumber: 12, label: '5s Deload (55%×5×3)', straightSets: 3, straightReps: 5, intensity: 0.55, notes: '5s deload week.' },
  { weekNumber: 13, label: '3s Accumulation (75%×3×5)', straightSets: 5, straightReps: 3, intensity: 0.75, notes: '3s accumulation week.' },
  { weekNumber: 14, label: '3s Intensification (80%×3×4 + PR set)', straightSets: 4, straightReps: 3, amrapReps: '3+', intensity: 0.8, notes: '3s intensification week with a final PR set.' },
  { weekNumber: 15, label: '3s Realization (85%×3+ AMRAP)', straightSets: 0, straightReps: 3, amrapReps: '3+', intensity: 0.85, notes: '3s realization week — PR set only.' },
  { weekNumber: 16, label: '3s Deload (60%×3×4)', straightSets: 4, straightReps: 3, intensity: 0.6, notes: '3s deload week.' },
]

const JUGGERNAUT_DAY_DEFINITIONS = [
  {
    label: 'Day 1 — Squat',
    exerciseKey: 'Squat',
    variationExerciseKey: 'Leg Press',
    variationNotes: 'Squat supplemental — leg press, front squat, or SSB squat',
    accessoryExerciseKey: 'Ab Wheel Rollout',
    accessoryNotes: 'Core accessory',
  },
  {
    label: 'Day 2 — Bench',
    exerciseKey: 'Bench Press',
    variationExerciseKey: 'Incline Bench Press',
    variationNotes: 'Bench supplemental — incline, dumbbell press, close-grip',
    accessoryExerciseKey: 'Barbell Row',
    accessoryNotes: 'Back accessory — rows, lat pulldowns',
  },
  {
    label: 'Day 3 — Deadlift',
    exerciseKey: 'Deadlift',
    variationExerciseKey: 'Romanian Deadlift',
    variationNotes: 'Deadlift supplemental — RDL, SLDL, trap bar',
    accessoryExerciseKey: 'Ab Wheel Rollout',
    accessoryNotes: 'Core accessory',
  },
  {
    label: 'Day 4 — OHP',
    exerciseKey: 'Overhead Press',
    variationExerciseKey: 'Incline Bench Press',
    variationNotes: 'OHP supplemental — push press, dumbbell OHP',
    accessoryExerciseKey: 'Barbell Row',
    accessoryNotes: 'Back volume',
  },
] as const

function createJuggernautPrimarySets(target: JuggernautWeekTarget): SetPrescription[] {
  const sets: SetPrescription[] = []

  if (target.straightSets > 0) {
    sets.push({
      sets: target.straightSets,
      reps: target.straightReps,
      intensity: target.intensity,
      intensity_type: 'percentage_tm',
    })
  }

  if (target.amrapReps) {
    sets.push({
      sets: 1,
      reps: target.amrapReps,
      intensity: target.intensity,
      intensity_type: 'percentage_tm',
      is_amrap: true,
    })
  }

  return sets
}

function createJuggernautDays(target: JuggernautWeekTarget): DayTemplate[] {
  return JUGGERNAUT_DAY_DEFINITIONS.map((day) => ({
    label: day.label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: day.exerciseKey,
        sets: createJuggernautPrimarySets(target),
        notes: target.notes,
      },
      {
        role: 'variation',
        exercise_key: day.variationExerciseKey,
        sets: [{ sets: 3, reps: 'varies', intensity: 7.0, intensity_type: 'rpe' }],
        notes: day.variationNotes,
      },
      {
        role: 'accessory',
        exercise_key: day.accessoryExerciseKey,
        sets: [{ sets: day.accessoryExerciseKey === 'Barbell Row' ? 4 : 3, reps: 10, intensity: 7.0, intensity_type: 'rpe' }],
        notes: day.accessoryNotes,
      },
    ],
  }))
}

const [JUGGERNAUT_WEEK_ONE, ...JUGGERNAUT_REMAINING_WEEKS] = JUGGERNAUT_WEEK_TARGETS

export const juggernaut: ProgramTemplate = {
  key: 'juggernaut',
  name: 'Juggernaut Method',
  level: 'advanced',
  description:
    'Chad Wesley Smith\'s Juggernaut Method. A 16-week periodized program organized into four 4-week waves (10s, 8s, 5s, 3s). Each wave has an accumulation week, intensification week, realization week (AMRAP), and deload. 4 days/week — one main lift per day.',
  days_per_week: 4,
  cycle_length_weeks: 16,
  uses_training_max: true,
  default_tm_percentage: 0.9,
  required_exercises: ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'],
  week_schemes: Object.fromEntries([
    [JUGGERNAUT_WEEK_ONE.weekNumber, { label: JUGGERNAUT_WEEK_ONE.label }],
    ...JUGGERNAUT_REMAINING_WEEKS.map((week) => [
      week.weekNumber,
      {
        label: week.label,
        days: createJuggernautDays(week),
      },
    ]),
  ]),
  days: createJuggernautDays(JUGGERNAUT_WEEK_ONE),
  progression: {
    style: 'percentage_cycle',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Every 4th week of each wave',
    deload_strategy: 'Week 4 of each wave: reduce to 50-60%, 5 reps',
  },
  source_url: 'https://www.chadwesleysmith.com',
}

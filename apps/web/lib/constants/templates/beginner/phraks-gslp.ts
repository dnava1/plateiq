import type { DayTemplate, ProgramTemplate } from '@/types/template'

function createPhraksWorkout(
  label: string,
  firstExerciseKey: 'Overhead Press' | 'Bench Press',
  thirdExerciseKey: 'Squat' | 'Deadlift',
  thirdExerciseNotes: string,
): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: firstExerciseKey,
        sets: [
          { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
          { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
        ],
        notes: 'Last set AMRAP',
      },
      {
        role: 'primary',
        exercise_key: 'Barbell Row',
        sets: [
          { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
          { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
        ],
        notes: 'Barbell row, last set AMRAP',
      },
      {
        role: 'primary',
        exercise_key: thirdExerciseKey,
        sets: thirdExerciseKey === 'Deadlift'
          ? [{ sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true }]
          : [
              { sets: 2, reps: 5, intensity: 0, intensity_type: 'fixed_weight' },
              { sets: 1, reps: '5+', intensity: 0, intensity_type: 'fixed_weight', is_amrap: true },
            ],
        notes: thirdExerciseNotes,
      },
    ],
  }
}

const PHRAKS_WORKOUT_A = createPhraksWorkout('Workout A', 'Overhead Press', 'Squat', 'Last set AMRAP')
const PHRAKS_WORKOUT_B = createPhraksWorkout('Workout B', 'Bench Press', 'Deadlift', 'Only set — AMRAP')

export const phraksGslp: ProgramTemplate = {
  key: 'phraks_gslp',
  name: "Phrak's Greyskull LP",
  level: 'beginner',
  description:
    "Phrakture's variant of Greyskull LP, popular on Reddit's r/Fitness. Identical structure to GSLP but replaces chin-ups with barbell rows for a more accessible beginner setup. Runs on a 2-week A/B/A then B/A/B rotation with AMRAP on the final set of every exercise.",
  days_per_week: 3,
  cycle_length_weeks: 2,
  uses_training_max: false,
  required_exercises: ['Squat', 'Bench Press', 'Overhead Press', 'Deadlift', 'Barbell Row'],
  week_schemes: {
    1: { label: 'Week 1 — A / B / A' },
    2: {
      label: 'Week 2 — B / A / B',
      days: [PHRAKS_WORKOUT_B, PHRAKS_WORKOUT_A, PHRAKS_WORKOUT_B],
    },
  },
  days: [
    PHRAKS_WORKOUT_A,
    PHRAKS_WORKOUT_B,
    PHRAKS_WORKOUT_A,
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 2.5, lower: 5 },
    deload_trigger: 'Fail to reach 5 reps on AMRAP set',
    deload_strategy: 'Reset 10% and rebuild',
  },
  source_url: 'https://old.reddit.com/r/Fitness/wiki/phraks-gslp',
}

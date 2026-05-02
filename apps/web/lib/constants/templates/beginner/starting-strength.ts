import type { DayTemplate, ProgramTemplate } from '@/types/template'

function createStartingStrengthWorkout(
  label: string,
  pressExerciseKey: 'Bench Press' | 'Overhead Press',
): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'Squat',
        sets: [{ sets: 3, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
      },
      {
        role: 'primary',
        exercise_key: pressExerciseKey,
        sets: [{ sets: 3, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
      },
      {
        role: 'primary',
        exercise_key: 'Deadlift',
        sets: [{ sets: 1, reps: 5, intensity: 0, intensity_type: 'fixed_weight' }],
      },
    ],
  }
}

const STARTING_STRENGTH_WORKOUT_A = createStartingStrengthWorkout('Workout A', 'Bench Press')
const STARTING_STRENGTH_WORKOUT_B = createStartingStrengthWorkout('Workout B', 'Overhead Press')

export const startingStrength: ProgramTemplate = {
  key: 'starting_strength',
  name: 'Starting Strength',
  level: 'beginner',
  description:
    'Mark Rippetoe\'s classic barbell program. Three compound lifts per session, 3 days/week, with linear progression every session. The A/B workouts alternate across a 2-week ABA/BAB cycle. Ideal for complete beginners building a strength foundation.',
  days_per_week: 3,
  cycle_length_weeks: 2,
  uses_training_max: false,
  required_exercises: ['Squat', 'Bench Press', 'Overhead Press', 'Deadlift'],
  week_schemes: {
    1: { label: 'Week 1 — A / B / A' },
    2: {
      label: 'Week 2 — B / A / B',
      days: [STARTING_STRENGTH_WORKOUT_B, STARTING_STRENGTH_WORKOUT_A, STARTING_STRENGTH_WORKOUT_B],
    },
  },
  days: [
    STARTING_STRENGTH_WORKOUT_A,
    STARTING_STRENGTH_WORKOUT_B,
    STARTING_STRENGTH_WORKOUT_A,
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: '3 consecutive failures on same weight',
    deload_strategy: 'Reset to 90% of failed weight',
  },
  source_url: 'https://startingstrength.com',
}

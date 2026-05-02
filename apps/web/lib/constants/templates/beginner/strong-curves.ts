import type { DayTemplate, ProgramTemplate } from '@/types/template'

function createStrongCurvesDay(
  label: string,
  lowerSecondaryKey: 'Bulgarian Split Squat' | 'Romanian Deadlift' | 'Leg Press',
  upperPullKey: 'Dumbbell Row' | 'Lat Pulldown' | 'Cable Row',
  upperPushKey: 'Dumbbell Shoulder Press' | 'Dumbbell Bench Press' | 'Incline Bench Press',
  coreKey: 'Hanging Leg Raise' | 'Ab Wheel Rollout',
): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'Hip Thrust',
        sets: [{ sets: 4, reps: '8-12', intensity: 0, intensity_type: 'fixed_weight' }],
        notes: 'Every session starts with the glute-dominant lift. Add load only when all sets stay crisp.',
      },
      {
        role: 'variation',
        exercise_key: lowerSecondaryKey,
        sets: [{ sets: 3, reps: '8-12', intensity: 0, intensity_type: 'fixed_weight' }],
      },
      {
        role: 'variation',
        exercise_key: upperPullKey,
        sets: [{ sets: 3, reps: '10-12', intensity: 0, intensity_type: 'fixed_weight' }],
      },
      {
        role: 'accessory',
        exercise_key: upperPushKey,
        sets: [{ sets: 3, reps: '10-12', intensity: 0, intensity_type: 'fixed_weight' }],
      },
      {
        role: 'accessory',
        exercise_key: coreKey,
        sets: [{ sets: 3, reps: '10-15', intensity: 0, intensity_type: 'bodyweight' }],
      },
    ],
  }
}

export const strongCurves: ProgramTemplate = {
  key: 'strong_curves',
  name: 'Strong Curves: Bootyful Beginnings',
  level: 'beginner',
  description:
    'Bret Contreras\'s Bootyful Beginnings entry block from Strong Curves. A 3-day A/B/C full-body split that opens every workout with a glute-dominant lift, then layers lower-body assistance, an upper-body pull, an upper-body push, and core work.',
  days_per_week: 3,
  cycle_length_weeks: 1,
  uses_training_max: false,
  required_exercises: [
    'Hip Thrust',
    'Bulgarian Split Squat',
    'Romanian Deadlift',
    'Leg Press',
    'Dumbbell Row',
    'Lat Pulldown',
    'Cable Row',
    'Dumbbell Shoulder Press',
    'Dumbbell Bench Press',
    'Incline Bench Press',
    'Hanging Leg Raise',
    'Ab Wheel Rollout',
  ],
  days: [
    createStrongCurvesDay('Workout A', 'Bulgarian Split Squat', 'Dumbbell Row', 'Dumbbell Shoulder Press', 'Hanging Leg Raise'),
    createStrongCurvesDay('Workout B', 'Romanian Deadlift', 'Lat Pulldown', 'Dumbbell Bench Press', 'Ab Wheel Rollout'),
    createStrongCurvesDay('Workout C', 'Leg Press', 'Cable Row', 'Incline Bench Press', 'Hanging Leg Raise'),
  ],
  progression: {
    style: 'linear_per_week',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Recovery stalls for 2+ weeks or hip thrust and secondary lower-body lifts regress together',
    deload_strategy: 'Reduce loads by 10-15% for one week, then resume progression with cleaner technique',
  },
  source_url: 'https://www.boostcamp.app/coaches/bret-contreras/strong-curves-bootyful-beginnings',
}
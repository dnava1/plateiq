import type { ProgramTemplate } from '@/types/template'

export const phul: ProgramTemplate = {
  key: 'phul',
  name: 'PHUL',
  level: 'intermediate',
  description:
    'Power Hypertrophy Upper Lower by Brandon Campbell. 4 days per week combining power (strength) and hypertrophy (size) training. Upper power + lower power days focus on compound movements with heavy loads; upper/lower hypertrophy days use moderate weights and higher reps.',
  days_per_week: 4,
  cycle_length_weeks: 1,
  uses_training_max: false,
  required_exercises: ['Squat', 'Bench Press', 'Overhead Press', 'Deadlift', 'Barbell Row', 'Incline Bench Press', 'Leg Press', 'Romanian Deadlift', 'Front Squat'],
  days: [
    {
      label: 'Day 1 — Upper Power',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Bench Press',
          sets: [{ sets: 4, reps: '3-5', intensity: 8.0, intensity_type: 'rpe' }],
          notes: 'Flat barbell bench — work up to heavy sets of 3-5',
        },
        {
          role: 'primary',
          exercise_key: 'Barbell Row',
          sets: [{ sets: 4, reps: '3-5', intensity: 8.0, intensity_type: 'rpe' }],
          notes: 'Bent-over barbell row — match bench intensity',
        },
        {
          role: 'variation',
          exercise_key: 'Incline Bench Press',
          sets: [{ sets: 3, reps: '5-8', intensity: 7.5, intensity_type: 'rpe' }],
          notes: 'Incline dumbbell or barbell press',
        },
        {
          role: 'accessory',
          exercise_key: 'Overhead Press',
          sets: [{ sets: 3, reps: '5-8', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Seated dumbbell OHP or barbell OHP',
        },
        {
          role: 'accessory',
          exercise_key: 'Lat Pulldown',
          sets: [{ sets: 3, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'Cable Row',
          sets: [{ sets: 3, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
    {
      label: 'Day 2 — Lower Power',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Squat',
          sets: [{ sets: 4, reps: '3-5', intensity: 8.0, intensity_type: 'rpe' }],
          notes: 'Back squat — primary lower power movement',
        },
        {
          role: 'primary',
          exercise_key: 'Deadlift',
          sets: [{ sets: 4, reps: '3-5', intensity: 8.0, intensity_type: 'rpe' }],
          notes: 'Conventional or sumo deadlift',
        },
        {
          role: 'variation',
          exercise_key: 'Leg Press',
          sets: [{ sets: 3, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'Leg Curl',
          sets: [{ sets: 3, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'Calf Raise',
          sets: [{ sets: 4, reps: '10-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
    {
      label: 'Day 3 — Upper Hypertrophy',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Incline Bench Press',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Incline barbell or dumbbell bench',
        },
        {
          role: 'primary',
          exercise_key: 'Cable Row',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'variation',
          exercise_key: 'Bench Press',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Flat dumbbell press',
        },
        {
          role: 'variation',
          exercise_key: 'Lat Pulldown',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'Tricep Pushdown',
          sets: [{ sets: 3, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'Dumbbell Curl',
          sets: [{ sets: 3, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
    {
      label: 'Day 4 — Lower Hypertrophy',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'Front Squat',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Front squat or hack squat for quad emphasis',
        },
        {
          role: 'primary',
          exercise_key: 'Romanian Deadlift',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Romanian deadlift for hamstring/glute development',
        },
        {
          role: 'variation',
          exercise_key: 'Leg Press',
          sets: [{ sets: 3, reps: '12-15', intensity: 6.5, intensity_type: 'rpe' }],
        },
        {
          role: 'variation',
          exercise_key: 'Leg Curl',
          sets: [{ sets: 3, reps: '12-15', intensity: 6.5, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'Lunge',
          sets: [{ sets: 3, reps: '12-15', intensity: 6.5, intensity_type: 'rpe' }],
          notes: 'Walking or reverse lunges',
        },
        {
          role: 'accessory',
          exercise_key: 'Calf Raise',
          sets: [{ sets: 4, reps: '12-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_week',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Plateaued progress for 2+ consecutive weeks',
    deload_strategy: 'Take a deload week at 60-70% of normal weights',
  },
  source_url: 'https://www.muscleandstrength.com/workouts/phul-workout',
}

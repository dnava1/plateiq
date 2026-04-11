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
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift', 'row', 'incline_bench', 'leg_press', 'rdl', 'front_squat'],
  days: [
    {
      label: 'Day 1 — Upper Power',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [{ sets: 4, reps: '3-5', intensity: 8.0, intensity_type: 'rpe' }],
          notes: 'Flat barbell bench — work up to heavy sets of 3-5',
        },
        {
          role: 'primary',
          exercise_key: 'row',
          sets: [{ sets: 4, reps: '3-5', intensity: 8.0, intensity_type: 'rpe' }],
          notes: 'Bent-over barbell row — match bench intensity',
        },
        {
          role: 'variation',
          exercise_key: 'incline_bench',
          sets: [{ sets: 3, reps: '5-8', intensity: 7.5, intensity_type: 'rpe' }],
          notes: 'Incline dumbbell or barbell press',
        },
        {
          role: 'accessory',
          exercise_key: 'ohp',
          sets: [{ sets: 3, reps: '5-8', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Seated dumbbell OHP or barbell OHP',
        },
        {
          role: 'accessory',
          exercise_key: 'lat_pulldown',
          sets: [{ sets: 3, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'cable_row',
          sets: [{ sets: 3, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
    {
      label: 'Day 2 — Lower Power',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [{ sets: 4, reps: '3-5', intensity: 8.0, intensity_type: 'rpe' }],
          notes: 'Back squat — primary lower power movement',
        },
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [{ sets: 4, reps: '3-5', intensity: 8.0, intensity_type: 'rpe' }],
          notes: 'Conventional or sumo deadlift',
        },
        {
          role: 'variation',
          exercise_key: 'leg_press',
          sets: [{ sets: 3, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'leg_curl',
          sets: [{ sets: 3, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'calf_raise',
          sets: [{ sets: 4, reps: '10-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
    {
      label: 'Day 3 — Upper Hypertrophy',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'incline_bench',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Incline barbell or dumbbell bench',
        },
        {
          role: 'primary',
          exercise_key: 'cable_row',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'variation',
          exercise_key: 'bench',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Flat dumbbell press',
        },
        {
          role: 'variation',
          exercise_key: 'lat_pulldown',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'tricep_pushdown',
          sets: [{ sets: 3, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'curl',
          sets: [{ sets: 3, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
    {
      label: 'Day 4 — Lower Hypertrophy',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'front_squat',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Front squat or hack squat for quad emphasis',
        },
        {
          role: 'primary',
          exercise_key: 'rdl',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Romanian deadlift for hamstring/glute development',
        },
        {
          role: 'variation',
          exercise_key: 'leg_press',
          sets: [{ sets: 3, reps: '12-15', intensity: 6.5, intensity_type: 'rpe' }],
        },
        {
          role: 'variation',
          exercise_key: 'leg_curl',
          sets: [{ sets: 3, reps: '12-15', intensity: 6.5, intensity_type: 'rpe' }],
        },
        {
          role: 'accessory',
          exercise_key: 'lunge',
          sets: [{ sets: 3, reps: '12-15', intensity: 6.5, intensity_type: 'rpe' }],
          notes: 'Walking or reverse lunges',
        },
        {
          role: 'accessory',
          exercise_key: 'calf_raise',
          sets: [{ sets: 4, reps: '12-15', intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_week',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Stalled progress for 2+ consecutive weeks',
    deload_strategy: 'Take a deload week at 60-70% of normal weights',
  },
  source_url: 'https://www.muscleandstrength.com/workouts/phul-workout',
}

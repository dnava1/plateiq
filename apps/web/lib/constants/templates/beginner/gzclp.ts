import type { ProgramTemplate } from '@/types/template'

export const gzclp: ProgramTemplate = {
  key: 'gzclp',
  name: 'GZCLP',
  level: 'beginner',
  description:
    'Cody Lefever\'s GZCLP (GZCL Linear Progression). Four days per week using a T1/T2/T3 tier system. T1 lifts are heavy low-rep work, T2 is moderate volume, T3 is higher rep accessory work.',
  days_per_week: 4,
  cycle_length_weeks: 1,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift', 'lat_pulldown', 'row'],
  days: [
    {
      label: 'Day 1 — T1 Squat',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [{ sets: 5, reps: 3, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T1 — 5 sets of 3 (last set AMRAP); if AMRAP >= 10 add weight next session',
        },
        {
          role: 'supplement',
          exercise_key: 'bench',
          sets: [{ sets: 3, reps: 10, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T2 — 3×10; add weight when all reps completed',
        },
        {
          role: 'accessory',
          exercise_key: 'lat_pulldown',
          sets: [{ sets: 3, reps: 15, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T3 — 3×15+',
        },
      ],
    },
    {
      label: 'Day 2 — T1 OHP',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'ohp',
          sets: [{ sets: 5, reps: 3, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T1 — 5×3 (last set AMRAP)',
        },
        {
          role: 'supplement',
          exercise_key: 'deadlift',
          sets: [{ sets: 3, reps: 10, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T2 — 3×10',
        },
        {
          role: 'accessory',
          exercise_key: 'row',
          sets: [{ sets: 3, reps: 15, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T3 — 3×15+',
        },
      ],
    },
    {
      label: 'Day 3 — T1 Bench',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [{ sets: 5, reps: 3, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T1 — 5×3 (last set AMRAP)',
        },
        {
          role: 'supplement',
          exercise_key: 'squat',
          sets: [{ sets: 3, reps: 10, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T2 — 3×10',
        },
        {
          role: 'accessory',
          exercise_key: 'lat_pulldown',
          sets: [{ sets: 3, reps: 15, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T3 — 3×15+',
        },
      ],
    },
    {
      label: 'Day 4 — T1 Deadlift',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [{ sets: 5, reps: 3, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T1 — 5×3 (last set AMRAP)',
        },
        {
          role: 'supplement',
          exercise_key: 'ohp',
          sets: [{ sets: 3, reps: 10, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T2 — 3×10',
        },
        {
          role: 'accessory',
          exercise_key: 'row',
          sets: [{ sets: 3, reps: 15, intensity: 0, intensity_type: 'fixed_weight' }],
          notes: 'T3 — 3×15+',
        },
      ],
    },
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Fail to complete prescribed reps',
    deload_strategy: 'T1: reset to 6×2 → 10×1. T2: drop to 3×8 → 3×6',
  },
  source_url: 'https://reddit.com/r/Fitness/wiki/gzclp',
}

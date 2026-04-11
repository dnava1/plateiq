import type { ProgramTemplate } from '@/types/template'

// Juggernaut Method — 4-phase mesocycle, each phase 4 weeks.
// Phase 1: 10s (sets of 10, AMRAP last set)
// Phase 2: 8s  (sets of 8,  AMRAP last set)
// Phase 3: 5s  (sets of 5,  AMRAP last set)
// Phase 4: 3s  (sets of 3,  AMRAP last set)
// Each phase: Accumulation(high vol) → Intensification → Realization(AMRAP) → Deload
// For the template engine: represent 1 standard "work week" within the current phase.
// Week schemes drive the rep/intensity changes.

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
  required_exercises: ['squat', 'bench', 'deadlift', 'ohp'],
  week_schemes: {
    1: { label: '10s Accumulation (60%×10×3)', intensity_modifier: 1.0 },
    2: { label: '10s Intensification (65%×10×2 + PR set)', intensity_modifier: 1.083 },
    3: { label: '10s Realization (70%×10+ AMRAP)' , intensity_modifier: 1.167 },
    4: { label: '10s Deload (50%×5×2)', intensity_modifier: 0.833 },
    5: { label: '8s Accumulation (65%×8×3)', intensity_modifier: 1.0 },
    6: { label: '8s Intensification (70%×8×2 + PR set)', intensity_modifier: 1.077 },
    7: { label: '8s Realization (75%×8+ AMRAP)', intensity_modifier: 1.154 },
    8: { label: '8s Deload (50%×5×2)', intensity_modifier: 0.769 },
    9:  { label: '5s Accumulation (70%×5×4)', intensity_modifier: 1.0 },
    10: { label: '5s Intensification (75%×5×3 + PR set)', intensity_modifier: 1.071 },
    11: { label: '5s Realization (80%×5+ AMRAP)', intensity_modifier: 1.143 },
    12: { label: '5s Deload (55%×5×3)', intensity_modifier: 0.786 },
    13: { label: '3s Accumulation (75%×3×5)', intensity_modifier: 1.0 },
    14: { label: '3s Intensification (80%×3×4 + PR set)', intensity_modifier: 1.067 },
    15: { label: '3s Realization (85%×3+ AMRAP)', intensity_modifier: 1.133 },
    16: { label: '3s Deload (60%×3×4)', intensity_modifier: 0.8 },
  },
  days: [
    {
      label: 'Day 1 — Squat',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'squat',
          sets: [
            { sets: 3, reps: 10, intensity: 0.6, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '10+', intensity: 0.6, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Base: 60% TM × 10. Week scheme modifies intensity for periodization phases.',
        },
        {
          role: 'supplement',
          exercise_key: 'leg_press',
          sets: [{ sets: 3, reps: 'varies', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Squat supplemental — leg press, front squat, or SSB squat',
        },
        {
          role: 'accessory',
          exercise_key: 'ab_work',
          sets: [{ sets: 3, reps: 10, intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Core accessory',
        },
      ],
    },
    {
      label: 'Day 2 — Bench',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [
            { sets: 3, reps: 10, intensity: 0.6, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '10+', intensity: 0.6, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Base: 60% TM × 10. See week scheme for phase-specific weights.',
        },
        {
          role: 'supplement',
          exercise_key: 'incline_bench',
          sets: [{ sets: 3, reps: 'varies', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Bench supplemental — incline, dumbbell press, close-grip',
        },
        {
          role: 'accessory',
          exercise_key: 'row',
          sets: [{ sets: 4, reps: 10, intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Back accessory — rows, lat pulldowns',
        },
      ],
    },
    {
      label: 'Day 3 — Deadlift',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'deadlift',
          sets: [
            { sets: 3, reps: 10, intensity: 0.6, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '10+', intensity: 0.6, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Base: 60% TM × 10.',
        },
        {
          role: 'supplement',
          exercise_key: 'rdl',
          sets: [{ sets: 3, reps: 'varies', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Deadlift supplemental — RDL, SLDL, trap bar',
        },
        {
          role: 'accessory',
          exercise_key: 'ab_work',
          sets: [{ sets: 3, reps: 10, intensity: 7.0, intensity_type: 'rpe' }],
        },
      ],
    },
    {
      label: 'Day 4 — OHP',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'ohp',
          sets: [
            { sets: 3, reps: 10, intensity: 0.6, intensity_type: 'percentage_tm' },
            { sets: 1, reps: '10+', intensity: 0.6, intensity_type: 'percentage_tm', is_amrap: true },
          ],
          notes: 'Base: 60% TM × 10.',
        },
        {
          role: 'supplement',
          exercise_key: 'incline_bench',
          sets: [{ sets: 3, reps: 'varies', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'OHP supplemental — push press, dumbbell OHP',
        },
        {
          role: 'accessory',
          exercise_key: 'row',
          sets: [{ sets: 4, reps: 10, intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Back volume',
        },
      ],
    },
  ],
  progression: {
    style: 'percentage_cycle',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Every 4th week of each wave',
    deload_strategy: 'Week 4 of each wave: reduce to 50-60%, 5 reps',
  },
  source_url: 'https://www.chadwesleysmith.com',
}

import type { DayTemplate, ProgramTemplate } from '@/types/template'

function createMaxEffortUpperDay(): DayTemplate {
  return {
    label: 'Max Effort Upper',
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'Board Press',
        sets: [
          { sets: 1, reps: 5, intensity: 6.0, intensity_type: 'rpe' },
          { sets: 1, reps: 3, intensity: 8.0, intensity_type: 'rpe' },
          { sets: 1, reps: 2, intensity: 9.0, intensity_type: 'rpe' },
          { sets: 1, reps: '1-3', intensity: 10.0, intensity_type: 'rpe' },
        ],
        notes: 'Max Effort — work to 1-3RM on rotating ME exercise (board press, floor press, close-grip, Slingshot, etc.). Rotate every 2-3 weeks.',
      },
      {
        role: 'variation',
        exercise_key: 'Barbell Row',
        sets: [{ sets: 4, reps: '8-12', intensity: 7.5, intensity_type: 'rpe' }],
        notes: 'Secondary upper back work — DB rows, cable rows, or face pulls',
      },
      {
        role: 'accessory',
        exercise_key: 'Tricep Extension',
        sets: [{ sets: 4, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        notes: 'Tricep accessory — JM press, extensions, pushdowns',
      },
      {
        role: 'accessory',
        exercise_key: 'Lateral Raise',
        sets: [{ sets: 3, reps: '15-20', intensity: 6.5, intensity_type: 'rpe' }],
        notes: 'Shoulder health work — raises, face pulls',
      },
    ],
  }
}

function createMaxEffortLowerDay(): DayTemplate {
  return {
    label: 'Max Effort Lower',
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'Good Morning',
        sets: [
          { sets: 1, reps: 5, intensity: 6.0, intensity_type: 'rpe' },
          { sets: 1, reps: 3, intensity: 8.0, intensity_type: 'rpe' },
          { sets: 1, reps: 2, intensity: 9.0, intensity_type: 'rpe' },
          { sets: 1, reps: '1-3', intensity: 10.0, intensity_type: 'rpe' },
        ],
        notes: 'Max Effort lower — rotate between SSB squat, box squat, good mornings, deadlift variations, trap bar DL. Work to a 1-3RM.',
      },
      {
        role: 'variation',
        exercise_key: 'Romanian Deadlift',
        sets: [{ sets: 4, reps: '6-10', intensity: 7.5, intensity_type: 'rpe' }],
        notes: 'Posterior chain accessory — RDLs, GHR, hyperextensions',
      },
      {
        role: 'accessory',
        exercise_key: 'Ab Wheel Rollout',
        sets: [{ sets: 4, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        notes: 'Core work — ab wheel, leg raises, reverse hypers',
      },
    ],
  }
}

function createDynamicEffortUpperDay(intensity: number, waveLabel: string): DayTemplate {
  return {
    label: 'Dynamic Effort Upper',
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'Bench Press',
        sets: [{ sets: 9, reps: 3, intensity, intensity_type: 'percentage_1rm' }],
        notes: `DE Bench — 9×3 @ ${Math.round(intensity * 100)}% 1RM + optional accommodating resistance (bands/chains). ${waveLabel}`,
      },
      {
        role: 'variation',
        exercise_key: 'Overhead Press',
        sets: [{ sets: 4, reps: '8-10', intensity: 7.0, intensity_type: 'rpe' }],
        notes: 'Overhead pressing accessory',
      },
      {
        role: 'accessory',
        exercise_key: 'Barbell Row',
        sets: [{ sets: 5, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        notes: 'Upper back volume — lat work, rows',
      },
      {
        role: 'accessory',
        exercise_key: 'Tricep Extension',
        sets: [{ sets: 4, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        notes: 'Tricep volume work',
      },
    ],
  }
}

function createDynamicEffortLowerDay(intensity: number, waveLabel: string): DayTemplate {
  return {
    label: 'Dynamic Effort Lower',
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'Box Squat',
        sets: [{ sets: 10, reps: 2, intensity, intensity_type: 'percentage_1rm' }],
        notes: `DE Box Squat — 10-12×2 @ ${Math.round(intensity * 100)}% 1RM + accommodating resistance. ${waveLabel}`,
      },
      {
        role: 'variation',
        exercise_key: 'Deadlift',
        sets: [{ sets: 6, reps: 1, intensity: 0.6, intensity_type: 'percentage_1rm' }],
        notes: 'DE Deadlifts — 6-10 singles from floor or elevated (rack pulls, blocks)',
      },
      {
        role: 'accessory',
        exercise_key: 'Romanian Deadlift',
        sets: [{ sets: 4, reps: '6-8', intensity: 7.5, intensity_type: 'rpe' }],
        notes: 'Posterior chain volume — RDL, GHR, or reverse hyper',
      },
      {
        role: 'accessory',
        exercise_key: 'Ab Wheel Rollout',
        sets: [{ sets: 4, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
        notes: 'Core strength work',
      },
    ],
  }
}

function createConjugateDays(dynamicIntensity: number, waveLabel: string): DayTemplate[] {
  return [
    createMaxEffortUpperDay(),
    createMaxEffortLowerDay(),
    createDynamicEffortUpperDay(dynamicIntensity, waveLabel),
    createDynamicEffortLowerDay(dynamicIntensity, waveLabel),
  ]
}

export const conjugate: ProgramTemplate = {
  key: 'conjugate',
  name: 'Conjugate (Westside)',
  level: 'advanced',
  description:
    'Westside Barbell\'s Conjugate method by Louie Simmons. 4 days per week: Max Effort Upper, Max Effort Lower, Dynamic Effort Upper, Dynamic Effort Lower. ME days build maximal strength through heavy singles/triples; DE days develop explosive speed strength with submaximal weight.',
  days_per_week: 4,
  cycle_length_weeks: 3,
  uses_training_max: false,
  required_exercises: ['Squat', 'Bench Press', 'Overhead Press', 'Deadlift', 'Barbell Row', 'Good Morning', 'Box Squat', 'Board Press'],
  week_schemes: {
    1: { label: 'Wave 1 — 50%' },
    2: {
      label: 'Wave 2 — 55%',
      days: createConjugateDays(0.55, 'Week 2 of the 3-week DE wave (50→55→60%).'),
    },
    3: {
      label: 'Wave 3 — 60%',
      days: createConjugateDays(0.6, 'Week 3 of the 3-week DE wave (50→55→60%).'),
    },
  },
  days: createConjugateDays(0.5, 'Week 1 of the 3-week DE wave (50→55→60%).'),
  progression: {
    style: 'wave',
    deload_trigger: 'Programmed — rotate ME exercises every 2-3 weeks',
    deload_strategy: '3-week wave on DE: 50→55→60%, then reset. ME: change exercise.',
  },
  source_url: 'https://www.westside-barbell.com',
}

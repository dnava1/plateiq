import type {
  DayTemplate,
  ExerciseBlock,
  ProgramTemplate,
  SetPrescription,
} from '@/types/template'

// Simplified 4-week preparatory Sheiko block based on the official
// "Universal appropriate program (for three lifts), part 1".
// Accessory work and lift variations without clear percentage prescriptions
// are intentionally omitted, but the week-by-week main lift structure is preserved.

interface SheikoTarget {
  intensity: number
  reps: SetPrescription['reps']
  sets: number
}

function createSheikoSets(targets: SheikoTarget[]): SetPrescription[] {
  return targets.map(({ intensity, reps, sets }) => ({
    sets,
    reps,
    intensity,
    intensity_type: 'percentage_1rm',
  }))
}

function createSheikoBlock(
  role: ExerciseBlock['role'],
  exerciseKey: 'Squat' | 'Bench Press' | 'Deadlift',
  targets: SheikoTarget[],
  notes: string,
): ExerciseBlock {
  return {
    role,
    exercise_key: exerciseKey,
    sets: createSheikoSets(targets),
    notes,
  }
}

const SHEIKO_WEEK_1_DAYS: DayTemplate[] = [
  {
    label: 'Monday - Squat + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Squat',
        [
          { intensity: 0.5, reps: 4, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 4, sets: 5 },
        ],
        'Competition squat volume wave from week 1 day 1.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 3, sets: 5 },
        ],
        'Competition bench volume wave from week 1 day 1.',
      ),
    ],
  },
  {
    label: 'Wednesday - Deadlift + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Deadlift',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 4 },
        ],
        'Deadlift with one pause, condensed to the deadlift slot.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 5 },
        ],
        'Bench variant work from week 1 day 2.',
      ),
      createSheikoBlock(
        'variation',
        'Deadlift',
        [
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 3, sets: 4 },
        ],
        'Deadlift off boxes, kept as a second deadlift exposure.',
      ),
    ],
  },
  {
    label: 'Friday - Squat + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Squat',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 3, sets: 4 },
        ],
        'Competition squat volume from week 1 day 3.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 3, sets: 2 },
          { intensity: 0.8, reps: 2, sets: 4 },
        ],
        'Bench wave from week 1 day 3.',
      ),
    ],
  },
  {
    label: 'Saturday - Deadlift + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Deadlift',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 2, sets: 4 },
        ],
        'Deadlift with two pauses, condensed to the deadlift slot.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 4, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 4, sets: 5 },
        ],
        'Competition bench volume from week 1 day 4.',
      ),
    ],
  },
]

const SHEIKO_WEEK_2_DAYS: DayTemplate[] = [
  {
    label: 'Monday - Bench + Squat + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 2, sets: 4 },
        ],
        'Competition bench wave from week 2 day 1.',
      ),
      createSheikoBlock(
        'primary',
        'Squat',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 2, sets: 4 },
        ],
        'Competition squat wave from week 2 day 1.',
      ),
      createSheikoBlock(
        'variation',
        'Bench Press',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 2, sets: 4 },
        ],
        'Bench variation slot from week 2 day 1.',
      ),
    ],
  },
  {
    label: 'Wednesday - Bench + Deadlift',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 3, sets: 2 },
          { intensity: 0.85, reps: 2, sets: 3 },
          { intensity: 0.8, reps: 3, sets: 2 },
          { intensity: 0.55, reps: 8, sets: 1 },
        ],
        'Bench peak-volume wave from week 2 day 2.',
      ),
      createSheikoBlock(
        'primary',
        'Deadlift',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 2, sets: 4 },
        ],
        'Paused deadlift wave from week 2 day 2.',
      ),
    ],
  },
  {
    label: 'Friday - Squat + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Squat',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 5, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 5, sets: 1 },
          { intensity: 0.7, reps: 2, sets: 1 },
          { intensity: 0.7, reps: 7, sets: 1 },
          { intensity: 0.7, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 6, sets: 1 },
        ],
        'Variable-rep squat wave from week 2 day 3.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 3, sets: 4 },
        ],
        'Bench volume work from week 2 day 3.',
      ),
    ],
  },
  {
    label: 'Saturday - Deadlift Variants',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Deadlift',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.65, reps: 2, sets: 4 },
        ],
        'Deficit deadlift wave from week 2 day 4.',
      ),
      createSheikoBlock(
        'variation',
        'Deadlift',
        [
          { intensity: 0.65, reps: 4, sets: 1 },
          { intensity: 0.75, reps: 4, sets: 1 },
          { intensity: 0.85, reps: 3, sets: 4 },
        ],
        'Deadlift off boxes from week 2 day 4.',
      ),
    ],
  },
]

const SHEIKO_WEEK_3_DAYS: DayTemplate[] = [
  {
    label: 'Monday - Squat + Bench + Squat',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Squat',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 3, sets: 4 },
        ],
        'Competition squat wave from week 3 day 1.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 2, sets: 5 },
        ],
        'Bench variation slot from week 3 day 1.',
      ),
      createSheikoBlock(
        'variation',
        'Squat',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 5, sets: 1 },
          { intensity: 0.7, reps: 4, sets: 4 },
        ],
        'Second squat wave from week 3 day 1.',
      ),
    ],
  },
  {
    label: 'Wednesday - Deadlift + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Deadlift',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 2, sets: 2 },
          { intensity: 0.8, reps: 1, sets: 3 },
        ],
        'Paused deadlift wave from week 3 day 2.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 3, sets: 2 },
          { intensity: 0.85, reps: 2, sets: 2 },
          { intensity: 0.8, reps: 3, sets: 2 },
          { intensity: 0.75, reps: 4, sets: 1 },
          { intensity: 0.65, reps: 6, sets: 1 },
        ],
        'Bench peak work from week 3 day 2.',
      ),
    ],
  },
  {
    label: 'Friday - Bench + Squat + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 2, sets: 4 },
        ],
        'Competition bench wave from week 3 day 3.',
      ),
      createSheikoBlock(
        'primary',
        'Squat',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 3, sets: 5 },
        ],
        'Competition squat wave from week 3 day 3.',
      ),
      createSheikoBlock(
        'variation',
        'Bench Press',
        [
          { intensity: 0.5, reps: 4, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 4, sets: 4 },
        ],
        'Second bench wave from week 3 day 3.',
      ),
    ],
  },
  {
    label: 'Saturday - Deadlift + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Deadlift',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 2, sets: 4 },
        ],
        'Deficit deadlift wave from week 3 day 4.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 6, sets: 1 },
          { intensity: 0.6, reps: 6, sets: 1 },
          { intensity: 0.65, reps: 6, sets: 5 },
        ],
        'Bench volume wave from week 3 day 4.',
      ),
      createSheikoBlock(
        'variation',
        'Deadlift',
        [
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 3, sets: 2 },
          { intensity: 0.85, reps: 2, sets: 3 },
        ],
        'Deadlift off boxes from week 3 day 4.',
      ),
    ],
  },
]

const SHEIKO_WEEK_4_DAYS: DayTemplate[] = [
  {
    label: 'Monday - Bench + Squat',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 2, sets: 2 },
          { intensity: 0.9, reps: 1, sets: 3 },
        ],
        'Competition bench intensification from week 4 day 1.',
      ),
      createSheikoBlock(
        'primary',
        'Squat',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 2, sets: 2 },
          { intensity: 0.85, reps: 1, sets: 1 },
          { intensity: 0.9, reps: 1, sets: 2 },
        ],
        'Competition squat intensification from week 4 day 1.',
      ),
    ],
  },
  {
    label: 'Wednesday - Deadlift + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Deadlift',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 2, sets: 1 },
          { intensity: 0.85, reps: 1, sets: 2 },
          { intensity: 0.9, reps: 1, sets: 3 },
        ],
        'Competition deadlift intensification from week 4 day 2.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 2, sets: 5 },
        ],
        'Bench volume work from week 4 day 2.',
      ),
      createSheikoBlock(
        'variation',
        'Deadlift',
        [
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 4, sets: 1 },
          { intensity: 0.8, reps: 4, sets: 4 },
        ],
        'Deadlift off boxes from week 4 day 2.',
      ),
    ],
  },
  {
    label: 'Friday - Squat + Bench + Squat',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Squat',
        [
          { intensity: 0.5, reps: 5, sets: 1 },
          { intensity: 0.6, reps: 4, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 1 },
          { intensity: 0.8, reps: 2, sets: 4 },
        ],
        'Competition squat wave from week 4 day 3.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.7, reps: 3, sets: 5 },
        ],
        'Bench variation slot from week 4 day 3.',
      ),
      createSheikoBlock(
        'variation',
        'Squat',
        [
          { intensity: 0.55, reps: 3, sets: 1 },
          { intensity: 0.65, reps: 3, sets: 1 },
          { intensity: 0.75, reps: 3, sets: 4 },
        ],
        'Second squat wave from week 4 day 3.',
      ),
    ],
  },
  {
    label: 'Saturday - Deadlift + Bench',
    exercise_blocks: [
      createSheikoBlock(
        'primary',
        'Deadlift',
        [
          { intensity: 0.5, reps: 3, sets: 1 },
          { intensity: 0.6, reps: 3, sets: 1 },
          { intensity: 0.65, reps: 2, sets: 4 },
        ],
        'Deficit deadlift wave from week 4 day 4.',
      ),
      createSheikoBlock(
        'primary',
        'Bench Press',
        [
          { intensity: 0.5, reps: 6, sets: 1 },
          { intensity: 0.6, reps: 6, sets: 1 },
          { intensity: 0.65, reps: 6, sets: 5 },
        ],
        'Bench volume wave from week 4 day 4.',
      ),
    ],
  },
]

export const sheiko: ProgramTemplate = {
  key: 'sheiko',
  name: 'Sheiko',
  level: 'advanced',
  description:
    'Simplified 4-week Sheiko preparatory block based on Boris Sheiko\'s official three-lift program. Four days per week with week-specific squat, bench, and deadlift exposures. Percentage-based main work is preserved; accessory lifts and non-percentage movements from the source sheet are intentionally omitted.',
  days_per_week: 4,
  cycle_length_weeks: 4,
  uses_training_max: false,
  required_exercises: ['Squat', 'Bench Press', 'Deadlift'],
  week_schemes: {
    1: { label: 'Week 1' },
    2: { label: 'Week 2', days: SHEIKO_WEEK_2_DAYS },
    3: { label: 'Week 3', days: SHEIKO_WEEK_3_DAYS },
    4: { label: 'Week 4', days: SHEIKO_WEEK_4_DAYS },
  },
  days: SHEIKO_WEEK_1_DAYS,
  progression: {
    style: 'percentage_cycle',
    deload_trigger: 'After completing the 4-week block',
    deload_strategy: 'Bridge to the next Sheiko block or take a lower-fatigue transition week.',
  },
  source_url: 'https://sheiko-program.ru/training-programs/universal-appropriate-program-for-three-lifts-part-1',
}

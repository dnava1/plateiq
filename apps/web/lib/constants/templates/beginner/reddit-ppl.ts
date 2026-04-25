import type { DayTemplate, ProgramTemplate } from '@/types/template'

const LINEAR_SET = { intensity: 0, intensity_type: 'fixed_weight' as const }

function createPushDay(label: string, mainPressKey: 'bench' | 'ohp', secondaryPressKey: 'bench' | 'ohp'): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: mainPressKey,
        sets: [
          { sets: 4, reps: 5, ...LINEAR_SET },
          { sets: 1, reps: '5+', is_amrap: true, ...LINEAR_SET },
        ],
        notes: 'Main press follows the Reddit PPL linear progression. Add weight when you beat the rep target cleanly.',
      },
      {
        role: 'variation',
        exercise_key: secondaryPressKey,
        sets: [{ sets: 3, reps: '8-12', ...LINEAR_SET }],
      },
      {
        role: 'variation',
        exercise_key: 'incline_bench',
        sets: [{ sets: 3, reps: '8-12', ...LINEAR_SET }],
      },
      {
        role: 'accessory',
        exercise_key: 'tricep_pushdown',
        sets: [{ sets: 3, reps: '10-15', ...LINEAR_SET }],
      },
      {
        role: 'accessory',
        exercise_key: 'lateral_raise',
        sets: [{ sets: 3, reps: '12-20', ...LINEAR_SET }],
      },
    ],
  }
}

function createPullDay(label: string, primaryKey: 'deadlift' | 'barbell_row', pullVariationKey: 'pull_up' | 'lat_pulldown', curlKey: 'dumbbell_curl' | 'barbell_curl'): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: primaryKey,
        sets: primaryKey === 'deadlift'
          ? [{ sets: 1, reps: '5+', is_amrap: true, ...LINEAR_SET }]
          : [
              { sets: 4, reps: 5, ...LINEAR_SET },
              { sets: 1, reps: '5+', is_amrap: true, ...LINEAR_SET },
            ],
        notes: primaryKey === 'deadlift'
          ? 'Pull A uses the single top-set deadlift progression from the canonical Reddit PPL.'
          : 'Pull B uses barbell rows as the main progressive pull.',
      },
      {
        role: 'variation',
        exercise_key: pullVariationKey,
        sets: [{ sets: 3, reps: '8-12', ...LINEAR_SET }],
      },
      {
        role: 'variation',
        exercise_key: 'cable_row',
        sets: [{ sets: 3, reps: '8-12', ...LINEAR_SET }],
      },
      {
        role: 'accessory',
        exercise_key: 'face_pull',
        sets: [{ sets: 3, reps: '15-20', ...LINEAR_SET }],
      },
      {
        role: 'accessory',
        exercise_key: curlKey,
        sets: [{ sets: 3, reps: '10-15', ...LINEAR_SET }],
      },
    ],
  }
}

function createLegDay(label: string): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'squat',
        sets: [
          { sets: 2, reps: 5, ...LINEAR_SET },
          { sets: 1, reps: '5+', is_amrap: true, ...LINEAR_SET },
        ],
        notes: 'Follow the standard Reddit PPL squat progression: two work sets, then a rep-out top set.',
      },
      {
        role: 'variation',
        exercise_key: 'rdl',
        sets: [{ sets: 3, reps: '8-10', ...LINEAR_SET }],
      },
      {
        role: 'variation',
        exercise_key: 'leg_press',
        sets: [{ sets: 3, reps: '10-15', ...LINEAR_SET }],
      },
      {
        role: 'accessory',
        exercise_key: 'leg_curl',
        sets: [{ sets: 3, reps: '10-15', ...LINEAR_SET }],
      },
      {
        role: 'accessory',
        exercise_key: 'calf_raise',
        sets: [{ sets: 5, reps: '8-12', ...LINEAR_SET }],
      },
    ],
  }
}

export const redditPpl: ProgramTemplate = {
  key: 'reddit_ppl',
  name: 'Reddit PPL',
  level: 'beginner',
  description:
    'The classic Reddit metallicadpa push/pull/legs linear progression. Six training days per week with two Push, two Pull, and two Legs sessions. Main lifts progress with 5-rep top sets and AMRAPs, while accessories stay in bodybuilding-style rep ranges.',
  days_per_week: 6,
  cycle_length_weeks: 1,
  uses_training_max: false,
  required_exercises: [
    'bench',
    'ohp',
    'deadlift',
    'barbell_row',
    'incline_bench',
    'tricep_pushdown',
    'lateral_raise',
    'pull_up',
    'lat_pulldown',
    'cable_row',
    'face_pull',
    'dumbbell_curl',
    'barbell_curl',
    'squat',
    'rdl',
    'leg_press',
    'leg_curl',
    'calf_raise',
  ],
  days: [
    createPushDay('Push A', 'bench', 'ohp'),
    createPullDay('Pull A', 'deadlift', 'pull_up', 'dumbbell_curl'),
    createLegDay('Legs A'),
    createPushDay('Push B', 'ohp', 'bench'),
    createPullDay('Pull B', 'barbell_row', 'lat_pulldown', 'barbell_curl'),
    createLegDay('Legs B'),
  ],
  progression: {
    style: 'linear_per_session',
    increment_lbs: { upper: 5, lower: 10 },
    deload_trigger: 'Miss the main-lift target on the same movement twice in close succession',
    deload_strategy: 'Reset that lift by 10% and rebuild with the same PPL rotation',
  },
  source_url: 'https://www.reddit.com/r/Fitness/comments/37ylk5/a_linear_progression_based_ppl_program_for/',
}
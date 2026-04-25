import type { DayTemplate, ProgramTemplate, SetPrescription } from '@/types/template'

function percentageSets(sets: number, reps: number | string, intensity: number): SetPrescription[] {
  return [{ sets, reps, intensity, intensity_type: 'percentage_1rm' }]
}

function createCanditoSquatBenchDay(
  label: string,
  squatSets: SetPrescription[],
  benchSets: SetPrescription[],
  notes: string,
): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'squat',
        sets: squatSets,
        notes,
      },
      {
        role: 'primary',
        exercise_key: 'bench',
        sets: benchSets,
        notes: 'Optional upper accessories are fine here if recovery stays strong: rows, pull-ups, OHP, curls, and lateral raises are common picks.',
      },
    ],
  }
}

function createCanditoDeadliftDay(label: string, deadliftSets: SetPrescription[], notes: string): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'deadlift',
        sets: deadliftSets,
        notes,
      },
    ],
  }
}

function createCanditoBenchDay(label: string, benchSets: SetPrescription[], notes: string): DayTemplate {
  return {
    label,
    exercise_blocks: [
      {
        role: 'primary',
        exercise_key: 'bench',
        sets: benchSets,
        notes,
      },
    ],
  }
}

const CANDITO_WEEK_1_DAYS = [
  createCanditoSquatBenchDay(
    'Day 1 — Muscular Conditioning A',
    percentageSets(6, 6, 0.8),
    percentageSets(5, 4, 0.775),
    'Volume-first opener. Keep bar speed honest and leave a little room on the final sets.',
  ),
  createCanditoDeadliftDay(
    'Day 2 — Muscular Conditioning Pull',
    percentageSets(6, 6, 0.8),
    'Deadlift-only volume day. Treat this as work-capacity building, not a grind.',
  ),
  createCanditoBenchDay(
    'Day 3 — Bench Assistance',
    percentageSets(6, 4, 0.725),
    'Optional rows, pull-ups, and dumbbell pressing fit best here if you want the full upper-body assistance day.',
  ),
  createCanditoSquatBenchDay(
    'Day 4 — Muscular Conditioning B',
    percentageSets(6, 6, 0.8),
    percentageSets(5, 4, 0.775),
    'Repeat the first session and focus on speed and consistency rather than turning it into an AMRAP test.',
  ),
]

const CANDITO_WEEK_2_DAYS = [
  createCanditoSquatBenchDay(
    'Day 1 — Hypertrophy A',
    percentageSets(6, 6, 0.85),
    percentageSets(5, 4, 0.825),
    'Slightly heavier than week 1 while keeping the same basic structure.',
  ),
  createCanditoDeadliftDay(
    'Day 2 — Hypertrophy Pull',
    percentageSets(6, 6, 0.85),
    'Heavy-but-still-controlled deadlift volume. Accessories should stay low impact if added at all.',
  ),
  createCanditoBenchDay(
    'Day 3 — Bench Assistance',
    percentageSets(6, 4, 0.775),
    'Push the bench volume a bit harder, but keep optional assistance submaximal.',
  ),
  createCanditoSquatBenchDay(
    'Day 4 — Hypertrophy B',
    percentageSets(6, 6, 0.85),
    percentageSets(5, 4, 0.825),
    'Final high-volume session before the strength-focused weeks.',
  ),
]

const CANDITO_WEEK_3_DAYS = [
  createCanditoSquatBenchDay(
    'Day 1 — Linear Max OT',
    percentageSets(4, 3, 0.85),
    percentageSets(3, 3, 0.85),
    'Volume drops here. Drive every rep fast and stay technical.',
  ),
  createCanditoDeadliftDay(
    'Day 2 — Pull Strength',
    percentageSets(4, 3, 0.85),
    'Strength-focused deadlift work. Skip extra hinge volume if your back is accumulating fatigue.',
  ),
  createCanditoBenchDay(
    'Day 3 — Bench Strength',
    percentageSets(3, 3, 0.85),
    'Short, heavy bench session. Minimal optional work only if recovery is excellent.',
  ),
]

const CANDITO_WEEK_4_DAYS = [
  createCanditoSquatBenchDay(
    'Day 1 — Heavy Weight / Explosiveness A',
    percentageSets(1, 2, 0.925),
    percentageSets(2, 3, 0.9),
    'Acclimation week. Treat these as sharp, aggressive reps, not grinders.',
  ),
  createCanditoDeadliftDay(
    'Day 2 — Heavy Pull',
    percentageSets(2, 2, 0.925),
    'A very small amount of high-quality deadlift work is the point here. Shut it down if bar speed dies.',
  ),
  createCanditoSquatBenchDay(
    'Day 3 — Heavy Weight / Explosiveness B',
    percentageSets(1, 2, 0.925),
    percentageSets(2, 3, 0.9),
    'Repeat the exposure and stay explosive.',
  ),
  createCanditoBenchDay(
    'Day 4 — Bench Heavy Exposure',
    percentageSets(1, 2, 0.925),
    'Short bench-only exposure day. Optional accessory work should stay very light or be skipped.',
  ),
]

const CANDITO_WEEK_5_DAYS = [
  createCanditoSquatBenchDay(
    'Day 1 — Intense Strength A',
    percentageSets(1, 2, 0.95),
    percentageSets(2, 3, 0.925),
    'This is the highest fatigue week. Respect recovery and keep the rest of your training simple.',
  ),
  createCanditoDeadliftDay(
    'Day 2 — Intense Pull',
    percentageSets(2, 2, 0.95),
    'Heavy doubles on the deadlift. Stop before form slips.',
  ),
  createCanditoSquatBenchDay(
    'Day 3 — Intense Strength B',
    percentageSets(1, 2, 0.95),
    percentageSets(2, 3, 0.925),
    'Final heavy squat and bench exposures before testing.',
  ),
  createCanditoBenchDay(
    'Day 4 — Bench Peaking Exposure',
    percentageSets(1, 2, 0.95),
    'Bench-only peak exposure. Shut down early if shoulders or elbows feel beat up.',
  ),
]

const CANDITO_WEEK_6_DAYS = [
  createCanditoSquatBenchDay(
    'Day 1 — Max Test A',
    percentageSets(1, 1, 1.0),
    percentageSets(1, 1, 1.0),
    'Use this as a max test or a conservative top single day if you prefer to estimate your next cycle instead of going all-out.',
  ),
  createCanditoDeadliftDay(
    'Day 2 — Max Test Pull',
    percentageSets(1, 1, 1.0),
    'Final deadlift test. If you are not testing, use a smooth single and roll into the next cycle.',
  ),
]

export const candito6WeekStrength: ProgramTemplate = {
  key: 'candito_6_week_strength',
  name: 'Candito 6 Week Strength',
  level: 'intermediate',
  description:
    'Jonnie Candito\'s 6-week strength cycle. A short periodized block that starts with volume and work capacity, shifts into lower-volume strength work, and finishes with heavy exposures and testing on the squat, bench press, and deadlift.',
  days_per_week: 4,
  cycle_length_weeks: 6,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'deadlift'],
  week_schemes: {
    1: { label: 'Week 1 — Muscular Conditioning' },
    2: { label: 'Week 2 — Hypertrophy', days: CANDITO_WEEK_2_DAYS },
    3: { label: 'Week 3 — Linear Max OT', days: CANDITO_WEEK_3_DAYS },
    4: { label: 'Week 4 — Heavy Weight / Explosiveness', days: CANDITO_WEEK_4_DAYS },
    5: { label: 'Week 5 — Intense Strength Training', days: CANDITO_WEEK_5_DAYS },
    6: { label: 'Week 6 — Deload / Testing', days: CANDITO_WEEK_6_DAYS },
  },
  days: CANDITO_WEEK_1_DAYS,
  progression: {
    style: 'percentage_cycle',
    deload_trigger: 'Missed reps before week 5 or clear recovery breakdown',
    deload_strategy: 'Cut optional accessories first; if fatigue persists, reduce the working percentages by 5% and complete the cycle cleanly',
  },
  source_url: 'https://liftvault.com/programs/powerlifting/jonnie-candito-6-week-strength-program-spreadsheet/',
}
import type { StrengthProfileSex } from '@/types/domain'

export type BenchmarkUnitSystem = 'Imperial' | 'Metric'
export type BenchmarkSex = 'Male' | 'Female'

type BenchmarkMuscleKey =
  | 'upperTraps'
  | 'middleTraps'
  | 'lowerTraps'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'rotatorCuff'
  | 'upperChest'
  | 'lowerChest'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'serratusAndObliques'
  | 'abdominals'
  | 'latsAndTeresMajor'
  | 'spinalErectors'
  | 'glutes'
  | 'hamstrings'
  | 'quads'
  | 'hipFlexors'
  | 'hipAdductors'
  | 'calves'

type BenchmarkDisplayLift =
  | 'Back Squat'
  | 'Front Squat'
  | 'Deadlift'
  | 'Sumo Deadlift'
  | 'Power Clean'
  | 'Bench Press'
  | 'Incline Bench Press'
  | 'Dip'
  | 'Overhead Press'
  | 'Push Press'
  | 'Snatch Press'
  | 'Chin-up'
  | 'Pull-up'
  | 'Pendlay Row'

const STRENGTH_LEVEL_THRESHOLDS = [
  { minimumScore: 125, label: 'World class' },
  { minimumScore: 112.5, label: 'Elite' },
  { minimumScore: 100, label: 'Exceptional' },
  { minimumScore: 87.5, label: 'Advanced' },
  { minimumScore: 75, label: 'Proficient' },
  { minimumScore: 60, label: 'Intermediate' },
  { minimumScore: 45, label: 'Novice' },
  { minimumScore: 30, label: 'Untrained' },
] as const

const EMPTY_LIFT_INVOLVEMENT: Record<BenchmarkMuscleKey, number> = {
  upperTraps: 0,
  middleTraps: 0,
  lowerTraps: 0,
  frontDelts: 0,
  sideDelts: 0,
  rearDelts: 0,
  rotatorCuff: 0,
  upperChest: 0,
  lowerChest: 0,
  biceps: 0,
  triceps: 0,
  forearms: 0,
  serratusAndObliques: 0,
  abdominals: 0,
  latsAndTeresMajor: 0,
  spinalErectors: 0,
  glutes: 0,
  hamstrings: 0,
  quads: 0,
  hipFlexors: 0,
  hipAdductors: 0,
  calves: 0,
}

const SPECIAL_LIFT_NAMES = new Set<BenchmarkDisplayLift>(['Dip', 'Chin-up', 'Pull-up'])

export const BENCHMARK_DISPLAY_NAME_BY_SLUG: Record<string, BenchmarkDisplayLift> = {
  back_squat: 'Back Squat',
  front_squat: 'Front Squat',
  deadlift: 'Deadlift',
  sumo_deadlift: 'Sumo Deadlift',
  power_clean: 'Power Clean',
  bench_press: 'Bench Press',
  incline_bench_press: 'Incline Bench Press',
  dip: 'Dip',
  overhead_press: 'Overhead Press',
  push_press: 'Push Press',
  snatch_press: 'Snatch Press',
  chin_up: 'Chin-up',
  pull_up: 'Pull-up',
  pendlay_row: 'Pendlay Row',
}

const BENCHMARK_CATEGORY_BY_SLUG: Record<string, { key: string; label: string }> = {
  back_squat: { key: 'squat', label: 'Squat' },
  front_squat: { key: 'squat', label: 'Squat' },
  deadlift: { key: 'floorPull', label: 'Floor Pull' },
  sumo_deadlift: { key: 'floorPull', label: 'Floor Pull' },
  power_clean: { key: 'floorPull', label: 'Floor Pull' },
  bench_press: { key: 'horizontalPress', label: 'Horizontal Press' },
  incline_bench_press: { key: 'horizontalPress', label: 'Horizontal Press' },
  dip: { key: 'horizontalPress', label: 'Horizontal Press' },
  overhead_press: { key: 'verticalPress', label: 'Vertical Press' },
  push_press: { key: 'verticalPress', label: 'Vertical Press' },
  snatch_press: { key: 'verticalPress', label: 'Vertical Press' },
  chin_up: { key: 'pullup', label: 'Pull-up / Row' },
  pull_up: { key: 'pullup', label: 'Pull-up / Row' },
  pendlay_row: { key: 'pullup', label: 'Pull-up / Row' },
}

const BENCHMARK_MUSCLE_GROUP_LABELS: Record<BenchmarkMuscleKey, string> = {
  upperTraps: 'Upper Traps',
  middleTraps: 'Middle Traps',
  lowerTraps: 'Lower Traps',
  frontDelts: 'Anterior Delts',
  sideDelts: 'Lateral Delts',
  rearDelts: 'Posterior Delts',
  rotatorCuff: 'Rotator Cuff',
  upperChest: 'Pecs (Clavicular Head)',
  lowerChest: 'Pecs (Sternal Head)',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  serratusAndObliques: 'Obliques & Serratus',
  abdominals: 'Abdominals',
  latsAndTeresMajor: 'Lats',
  spinalErectors: 'Spinal Erectors',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  quads: 'Quads',
  hipFlexors: 'Hip Flexors',
  hipAdductors: 'Hip Adductors',
  calves: 'Calves',
}

const BENCHMARK_LIFT_INVOLVEMENT: Record<BenchmarkDisplayLift, Record<BenchmarkMuscleKey, number>> = {
  'Back Squat': { upperTraps: 0, middleTraps: 0, lowerTraps: 0, frontDelts: 0, sideDelts: 0, rearDelts: 0, rotatorCuff: 0, upperChest: 0, lowerChest: 0, biceps: 0, triceps: 0, forearms: 0, serratusAndObliques: 2, abdominals: 6, latsAndTeresMajor: 2, spinalErectors: 6, glutes: 9, hamstrings: 6, quads: 8, hipFlexors: 4, hipAdductors: 6, calves: 2 },
  'Front Squat': { upperTraps: 2, middleTraps: 2, lowerTraps: 2, frontDelts: 0, sideDelts: 0, rearDelts: 0, rotatorCuff: 2, upperChest: 0, lowerChest: 0, biceps: 0, triceps: 0, forearms: 0, serratusAndObliques: 2, abdominals: 8, latsAndTeresMajor: 0, spinalErectors: 4, glutes: 7, hamstrings: 4, quads: 10, hipFlexors: 4, hipAdductors: 6, calves: 2 },
  Deadlift: { upperTraps: 8, middleTraps: 8, lowerTraps: 2, frontDelts: 0, sideDelts: 0, rearDelts: 0, rotatorCuff: 0, upperChest: 0, lowerChest: 0, biceps: 0, triceps: 0, forearms: 4, serratusAndObliques: 4, abdominals: 6, latsAndTeresMajor: 4, spinalErectors: 10, glutes: 7, hamstrings: 7, quads: 6, hipFlexors: 2, hipAdductors: 4, calves: 2 },
  'Sumo Deadlift': { upperTraps: 8, middleTraps: 8, lowerTraps: 2, frontDelts: 0, sideDelts: 0, rearDelts: 0, rotatorCuff: 0, upperChest: 0, lowerChest: 0, biceps: 0, triceps: 0, forearms: 4, serratusAndObliques: 4, abdominals: 6, latsAndTeresMajor: 4, spinalErectors: 6, glutes: 8, hamstrings: 8, quads: 8, hipFlexors: 4, hipAdductors: 6, calves: 2 },
  'Power Clean': { upperTraps: 8, middleTraps: 8, lowerTraps: 2, frontDelts: 0, sideDelts: 0, rearDelts: 0, rotatorCuff: 0, upperChest: 0, lowerChest: 0, biceps: 0, triceps: 0, forearms: 6, serratusAndObliques: 4, abdominals: 6, latsAndTeresMajor: 2, spinalErectors: 8, glutes: 6, hamstrings: 6, quads: 8, hipFlexors: 2, hipAdductors: 4, calves: 3 },
  'Bench Press': { upperTraps: 0, middleTraps: 0, lowerTraps: 0, frontDelts: 6, sideDelts: 0, rearDelts: 0, rotatorCuff: 2, upperChest: 8, lowerChest: 10, biceps: 2, triceps: 8, forearms: 2, serratusAndObliques: 0, abdominals: 2, latsAndTeresMajor: 4, spinalErectors: 2, glutes: 0, hamstrings: 0, quads: 2, hipFlexors: 0, hipAdductors: 0, calves: 0 },
  'Incline Bench Press': { upperTraps: 0, middleTraps: 0, lowerTraps: 0, frontDelts: 6, sideDelts: 0, rearDelts: 0, rotatorCuff: 2, upperChest: 10, lowerChest: 8, biceps: 2, triceps: 8, forearms: 2, serratusAndObliques: 0, abdominals: 2, latsAndTeresMajor: 4, spinalErectors: 2, glutes: 0, hamstrings: 0, quads: 2, hipFlexors: 0, hipAdductors: 0, calves: 0 },
  Dip: { upperTraps: 0, middleTraps: 0, lowerTraps: 6, frontDelts: 6, sideDelts: 2, rearDelts: 0, rotatorCuff: 2, upperChest: 6, lowerChest: 10, biceps: 0, triceps: 8, forearms: 2, serratusAndObliques: 2, abdominals: 0, latsAndTeresMajor: 2, spinalErectors: 0, glutes: 0, hamstrings: 0, quads: 0, hipFlexors: 0, hipAdductors: 0, calves: 0 },
  'Overhead Press': { upperTraps: 4, middleTraps: 4, lowerTraps: 4, frontDelts: 10, sideDelts: 6, rearDelts: 0, rotatorCuff: 2, upperChest: 4, lowerChest: 0, biceps: 2, triceps: 8, forearms: 2, serratusAndObliques: 2, abdominals: 4, latsAndTeresMajor: 0, spinalErectors: 2, glutes: 2, hamstrings: 0, quads: 0, hipFlexors: 0, hipAdductors: 0, calves: 0 },
  'Push Press': { upperTraps: 4, middleTraps: 4, lowerTraps: 4, frontDelts: 8, sideDelts: 6, rearDelts: 0, rotatorCuff: 2, upperChest: 2, lowerChest: 0, biceps: 2, triceps: 8, forearms: 2, serratusAndObliques: 2, abdominals: 4, latsAndTeresMajor: 0, spinalErectors: 2, glutes: 4, hamstrings: 2, quads: 4, hipFlexors: 2, hipAdductors: 6, calves: 3 },
  'Snatch Press': { upperTraps: 6, middleTraps: 6, lowerTraps: 6, frontDelts: 8, sideDelts: 8, rearDelts: 2, rotatorCuff: 2, upperChest: 0, lowerChest: 0, biceps: 2, triceps: 6, forearms: 2, serratusAndObliques: 2, abdominals: 4, latsAndTeresMajor: 0, spinalErectors: 2, glutes: 2, hamstrings: 0, quads: 0, hipFlexors: 0, hipAdductors: 0, calves: 0 },
  'Chin-up': { upperTraps: 0, middleTraps: 4, lowerTraps: 4, frontDelts: 0, sideDelts: 0, rearDelts: 6, rotatorCuff: 6, upperChest: 2, lowerChest: 2, biceps: 8, triceps: 0, forearms: 4, serratusAndObliques: 4, abdominals: 8, latsAndTeresMajor: 10, spinalErectors: 0, glutes: 0, hamstrings: 0, quads: 0, hipFlexors: 0, hipAdductors: 0, calves: 0 },
  'Pull-up': { upperTraps: 0, middleTraps: 6, lowerTraps: 6, frontDelts: 0, sideDelts: 0, rearDelts: 6, rotatorCuff: 6, upperChest: 0, lowerChest: 0, biceps: 6, triceps: 0, forearms: 6, serratusAndObliques: 4, abdominals: 6, latsAndTeresMajor: 10, spinalErectors: 0, glutes: 0, hamstrings: 0, quads: 0, hipFlexors: 0, hipAdductors: 0, calves: 0 },
  'Pendlay Row': { upperTraps: 2, middleTraps: 6, lowerTraps: 6, frontDelts: 0, sideDelts: 0, rearDelts: 8, rotatorCuff: 8, upperChest: 0, lowerChest: 2, biceps: 6, triceps: 0, forearms: 4, serratusAndObliques: 4, abdominals: 4, latsAndTeresMajor: 10, spinalErectors: 5, glutes: 3, hamstrings: 3, quads: 0, hipFlexors: 0, hipAdductors: 2, calves: 2 },
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function lbToKg(value: number) {
  return 0.453592 * value
}

function kgToLb(value: number) {
  return 2.20462 * value
}

function wilksCoefficient(sex: BenchmarkSex, bodyweight: number) {
  if (sex === 'Male') {
    return 500 / (
      -216.0475144
      + (16.2606339 * bodyweight)
      - (0.002388645 * (bodyweight ** 2))
      - (0.00113732 * (bodyweight ** 3))
      + (0.00000701863 * (bodyweight ** 4))
      - (0.00000001291 * (bodyweight ** 5))
    )
  }

  return 500 / (
    594.31747775582
    - (27.23842536447 * bodyweight)
    + (0.82112226871 * (bodyweight ** 2))
    - (0.00930733913 * (bodyweight ** 3))
    + (0.00004731582 * (bodyweight ** 4))
    - (0.00000009054 * (bodyweight ** 5))
  )
}

function wilks(unitSystem: BenchmarkUnitSystem, sex: BenchmarkSex, bodyweight: number, totalLifted: number) {
  if (unitSystem === 'Metric') {
    return totalLifted * wilksCoefficient(sex, bodyweight)
  }

  return lbToKg(totalLifted) * wilksCoefficient(sex, lbToKg(bodyweight))
}

function reverseWilks(unitSystem: BenchmarkUnitSystem, sex: BenchmarkSex, bodyweight: number, wilksScore: number): number {
  if (unitSystem === 'Metric') {
    return wilksScore / wilksCoefficient(sex, bodyweight)
  }

  return kgToLb(reverseWilks('Metric', sex, lbToKg(bodyweight), wilksScore))
}

function ageMultiplier(ageYears: number | null) {
  if (typeof ageYears === 'number' && ageYears < 23) {
    return (0.0038961 * (ageYears ** 2)) - (0.166926 * ageYears) + 2.80303
  }

  if (typeof ageYears === 'number' && ageYears > 40) {
    return (0.000467683 * (ageYears ** 2)) - (0.0299717 * ageYears) + 1.45454
  }

  return 1
}

function strengthScoreToWilks(strengthScore: number, ageYears: number | null) {
  return 4 * (strengthScore / ageMultiplier(ageYears))
}

function wilksToStrengthScore(wilksScore: number, ageYears: number | null) {
  return (wilksScore * ageMultiplier(ageYears)) / 4
}

function percentOfPLTotal(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  bodyweight: number,
  liftName: BenchmarkDisplayLift,
  totalLiftWeight: number,
): number {
  if (sex === 'Male' && liftName === 'Deadlift') return 0.396825
  if (sex === 'Female' && liftName === 'Deadlift') return 0.414938
  if (sex === 'Male' && liftName === 'Back Squat') return 0.87 * percentOfPLTotal(unitSystem, 'Male', bodyweight, 'Deadlift', totalLiftWeight)
  if (sex === 'Female' && liftName === 'Back Squat') return 0.84 * percentOfPLTotal(unitSystem, 'Female', bodyweight, 'Deadlift', totalLiftWeight)
  if (sex === 'Male' && liftName === 'Bench Press') return 0.65 * percentOfPLTotal(unitSystem, 'Male', bodyweight, 'Deadlift', totalLiftWeight)
  if (sex === 'Female' && liftName === 'Bench Press') return 0.57 * percentOfPLTotal(unitSystem, 'Female', bodyweight, 'Deadlift', totalLiftWeight)
  if (liftName === 'Sumo Deadlift') return percentOfPLTotal(unitSystem, sex, bodyweight, 'Deadlift', totalLiftWeight)
  if (liftName === 'Power Clean') return 0.56 * percentOfPLTotal(unitSystem, sex, bodyweight, 'Deadlift', totalLiftWeight)
  if (liftName === 'Front Squat') return 0.8 * percentOfPLTotal(unitSystem, sex, bodyweight, 'Back Squat', totalLiftWeight)
  if (liftName === 'Incline Bench Press') return 0.82 * percentOfPLTotal(unitSystem, sex, bodyweight, 'Bench Press', totalLiftWeight)

  if (sex === 'Male' && liftName === 'Dip') {
    const addedWeight = unitSystem === 'Imperial' ? totalLiftWeight - bodyweight : kgToLb(totalLiftWeight - bodyweight)
    return (0.000000000168064 * (addedWeight ** 4)) - (0.00000012946 * (addedWeight ** 3)) + (0.0000371905 * (addedWeight ** 2)) - (0.00499168 * addedWeight) + 0.566576
  }

  if (sex === 'Female' && liftName === 'Dip') {
    const addedWeight = unitSystem === 'Imperial' ? totalLiftWeight - bodyweight : kgToLb(totalLiftWeight - bodyweight)
    return (0.0000000008249 * (addedWeight ** 4)) - (0.000000401956 * (addedWeight ** 3)) + (0.0000622122 * (addedWeight ** 2)) - (0.00431442 * addedWeight) + 0.37562
  }

  if (liftName === 'Overhead Press') return 0.65 * percentOfPLTotal(unitSystem, sex, bodyweight, 'Bench Press', totalLiftWeight)
  if (liftName === 'Push Press') return 1.33 * percentOfPLTotal(unitSystem, sex, bodyweight, 'Overhead Press', totalLiftWeight)
  if (liftName === 'Snatch Press') return 0.8 * percentOfPLTotal(unitSystem, sex, bodyweight, 'Overhead Press', totalLiftWeight)

  if (sex === 'Male' && liftName === 'Chin-up') {
    const addedWeight = unitSystem === 'Imperial' ? totalLiftWeight - bodyweight : kgToLb(totalLiftWeight - bodyweight)
    return (0.000000000401897 * (addedWeight ** 4)) - (0.000000234536 * (addedWeight ** 3)) + (0.0000502252 * (addedWeight ** 2)) - (0.00502633 * addedWeight) + 0.459545
  }

  if (sex === 'Female' && liftName === 'Chin-up') {
    const addedWeight = unitSystem === 'Imperial' ? totalLiftWeight - bodyweight : kgToLb(totalLiftWeight - bodyweight)
    return (0.00000000166589 * (addedWeight ** 4)) - (0.00000051621 * (addedWeight ** 3)) + (0.000054088 * (addedWeight ** 2)) - (0.00281674 * addedWeight) + 0.302005
  }

  if (liftName === 'Pull-up') return 0.95 * percentOfPLTotal(unitSystem, sex, bodyweight, 'Chin-up', totalLiftWeight)
  if (liftName === 'Pendlay Row') return 0.53 * percentOfPLTotal(unitSystem, sex, bodyweight, 'Deadlift', totalLiftWeight)

  return 1
}

function expectedPLTotal(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  bodyweight: number,
  liftName: BenchmarkDisplayLift,
  totalLiftWeight: number,
) {
  return totalLiftWeight / percentOfPLTotal(unitSystem, sex, bodyweight, liftName, totalLiftWeight)
}

function expectedWilks(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  bodyweight: number,
  liftName: BenchmarkDisplayLift,
  totalLiftWeight: number,
) {
  return wilks(unitSystem, sex, bodyweight, expectedPLTotal(unitSystem, sex, bodyweight, liftName, totalLiftWeight))
}

function strengthScoreToPLTotal(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  ageYears: number | null,
  bodyweight: number,
  strengthScore: number,
) {
  return reverseWilks(unitSystem, sex, bodyweight, strengthScoreToWilks(strengthScore, ageYears))
}

function liftFromStrengthScoreSpecialHelper(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  ageYears: number | null,
  bodyweight: number,
  strengthScore: number,
  liftName: BenchmarkDisplayLift,
  guess: number,
  iteration: number,
): number {
  if (!isPositiveNumber(guess) || !isPositiveNumber(strengthScore)) {
    return 0
  }

  const guessScore = calculateSingleLiftStrengthScore(unitSystem, sex, ageYears, bodyweight, liftName, guess)
  const relativeDifference = Math.abs(guessScore - strengthScore) / strengthScore

  if (relativeDifference < 0.01) {
    const liftPercentage = percentOfPLTotal(unitSystem, sex, bodyweight, liftName, guess)
    const expectedPowerliftingTotal = strengthScoreToPLTotal(unitSystem, sex, ageYears, bodyweight, strengthScore)
    return liftPercentage * expectedPowerliftingTotal
  }

  if (relativeDifference > 0.98 || iteration >= 50) {
    return 0
  }

  const nextGuess = guessScore > strengthScore
    ? guess - (guess * (relativeDifference ** 1.5))
    : guess + (guess * (relativeDifference ** 1.5))

  return Number.isFinite(nextGuess)
    ? liftFromStrengthScoreSpecialHelper(unitSystem, sex, ageYears, bodyweight, strengthScore, liftName, nextGuess, iteration + 1)
    : 0
}

export function toBenchmarkSex(sex: StrengthProfileSex | null): BenchmarkSex | null {
  if (sex === 'male') return 'Male'
  if (sex === 'female') return 'Female'
  return null
}

export function getBenchmarkDisplayLift(liftSlug: string, fallbackDisplayName: string) {
  return BENCHMARK_DISPLAY_NAME_BY_SLUG[liftSlug] ?? fallbackDisplayName
}

export function getBenchmarkCategory(liftSlug: string) {
  return BENCHMARK_CATEGORY_BY_SLUG[liftSlug] ?? { key: liftSlug, label: liftSlug }
}

export function getBenchmarkLiftInvolvement(liftName: string) {
  return BENCHMARK_LIFT_INVOLVEMENT[liftName as BenchmarkDisplayLift] ?? EMPTY_LIFT_INVOLVEMENT
}

export function getBenchmarkMuscleGroupLabel(muscleKey: string) {
  return BENCHMARK_MUSCLE_GROUP_LABELS[muscleKey as BenchmarkMuscleKey] ?? muscleKey
}

export function estimateBenchmarkOneRepMax(weightLbs: number, reps: number) {
  if (!isPositiveNumber(weightLbs) || reps < 1 || reps > 10) {
    return null
  }

  if (reps === 1) {
    return weightLbs
  }

  return (100 * weightLbs) / (48.8 + (53.8 * Math.exp(-0.075 * reps)))
}

export function calculateBenchmarkMultiRepMax(reps: number, oneRepMaxLbs: number) {
  if (!isPositiveNumber(oneRepMaxLbs) || reps < 1 || reps > 10) {
    return null
  }

  if (reps === 1) {
    return oneRepMaxLbs
  }

  return oneRepMaxLbs * (48.8 + (53.8 * Math.exp(-0.075 * reps))) / 100
}

export function getBenchmarkStrengthLabel(score: number | null) {
  if (score === null || !Number.isFinite(score)) {
    return null
  }

  const threshold = STRENGTH_LEVEL_THRESHOLDS.find((entry) => score >= entry.minimumScore)
  return threshold?.label ?? 'Subpar'
}

const STRENGTH_LEVEL_COLORS: Record<string, string> = {
  'World class': 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
  'Elite': 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'Exceptional': 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  'Advanced': 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400',
  'Proficient': 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400',
  'Intermediate': 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'Novice': 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  'Untrained': 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'Subpar': 'border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400',
}

export function getBenchmarkStrengthColorClass(label: string | null) {
  if (!label) return STRENGTH_LEVEL_COLORS['Subpar']
  return STRENGTH_LEVEL_COLORS[label] ?? STRENGTH_LEVEL_COLORS['Subpar']
}

export function calculateSingleLiftStrengthScore(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  ageYears: number | null,
  bodyweight: number,
  liftName: string,
  oneRepMaxLbs: number,
) {
  if (!isPositiveNumber(bodyweight) || !isPositiveNumber(oneRepMaxLbs)) {
    return 0
  }

  return wilksToStrengthScore(expectedWilks(unitSystem, sex, bodyweight, liftName as BenchmarkDisplayLift, oneRepMaxLbs), ageYears)
}

function resolveBenchmarkScoreScale(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  ageYears: number | null,
  bodyweight: number,
  liftName: string,
  benchmarkOneRepMaxLbs: number,
) {
  if (!isPositiveNumber(benchmarkOneRepMaxLbs)) {
    return null
  }

  const benchmarkScore = calculateSingleLiftStrengthScore(
    unitSystem,
    sex,
    ageYears,
    bodyweight,
    liftName,
    benchmarkOneRepMaxLbs,
  )

  if (!isPositiveNumber(benchmarkScore)) {
    return null
  }

  return 100 / benchmarkScore
}

export function calculateSingleLiftStrengthScoreFromBenchmark(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  ageYears: number | null,
  bodyweight: number,
  liftName: string,
  oneRepMaxLbs: number,
  benchmarkOneRepMaxLbs: number,
) {
  if (!isPositiveNumber(bodyweight) || !isPositiveNumber(oneRepMaxLbs)) {
    return 0
  }

  const scoreScale = resolveBenchmarkScoreScale(
    unitSystem,
    sex,
    ageYears,
    bodyweight,
    liftName,
    benchmarkOneRepMaxLbs,
  )

  if (scoreScale === null) {
    return 0
  }

  return calculateSingleLiftStrengthScore(unitSystem, sex, ageYears, bodyweight, liftName, oneRepMaxLbs) * scoreScale
}

export function calculateLiftFromStrengthScore(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  ageYears: number | null,
  bodyweight: number,
  strengthScore: number,
  liftName: string,
) {
  if (!isPositiveNumber(bodyweight) || !isPositiveNumber(strengthScore)) {
    return null
  }

  const benchmarkLiftName = liftName as BenchmarkDisplayLift
  if (SPECIAL_LIFT_NAMES.has(benchmarkLiftName)) {
    return liftFromStrengthScoreSpecialHelper(unitSystem, sex, ageYears, bodyweight, strengthScore, benchmarkLiftName, bodyweight, 0)
  }

  const liftPercentage = percentOfPLTotal(unitSystem, sex, bodyweight, benchmarkLiftName, 0)
  const expectedPowerliftingTotal = strengthScoreToPLTotal(unitSystem, sex, ageYears, bodyweight, strengthScore)
  return liftPercentage * expectedPowerliftingTotal
}

export function calculateLiftFromStrengthScoreFromBenchmark(
  unitSystem: BenchmarkUnitSystem,
  sex: BenchmarkSex,
  ageYears: number | null,
  bodyweight: number,
  strengthScore: number,
  liftName: string,
  benchmarkOneRepMaxLbs: number,
) {
  if (!isPositiveNumber(bodyweight) || !isPositiveNumber(strengthScore)) {
    return null
  }

  const scoreScale = resolveBenchmarkScoreScale(
    unitSystem,
    sex,
    ageYears,
    bodyweight,
    liftName,
    benchmarkOneRepMaxLbs,
  )

  if (scoreScale === null) {
    return null
  }

  return calculateLiftFromStrengthScore(
    unitSystem,
    sex,
    ageYears,
    bodyweight,
    strengthScore / scoreScale,
    liftName,
  )
}

export function calculateWeightedMuscleGroupScore(entries: Array<[number, number]>) {
  let weightedScore = 0
  let weightedTotal = 0

  for (const [score, weight] of entries) {
    weightedScore += score * (weight ** 3)
    weightedTotal += weight ** 3
  }

  return weightedTotal >= 50 ? weightedScore / weightedTotal : 0
}

export function calculateBenchmarkSymmetryScore(scores: number[]) {
  if (scores.length === 0) {
    return null
  }

  const mean = scores.reduce((total, score) => total + score, 0) / scores.length
  const variance = scores.reduce((total, score) => total + ((score - mean) ** 2), 0) / scores.length
  return 100 - variance
}
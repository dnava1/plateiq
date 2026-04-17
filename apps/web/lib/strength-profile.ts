import type {
  StrengthProfileCategoryScore,
  StrengthProfileData,
  StrengthProfileHighlight,
  StrengthProfileLift,
  StrengthProfileMissingField,
  StrengthProfileMuscleGroup,
  StrengthProfileRawData,
  StrengthProfileRepMax,
} from '@/types/analytics'
import {
  calculateBenchmarkMultiRepMax,
  calculateBenchmarkSymmetryScore,
  calculateLiftFromStrengthScore,
  calculateSingleLiftStrengthScore,
  calculateWeightedMuscleGroupScore,
  estimateBenchmarkOneRepMax,
  getBenchmarkCategory,
  getBenchmarkDisplayLift,
  getBenchmarkLiftInvolvement,
  getBenchmarkMuscleGroupLabel,
  getBenchmarkStrengthLabel,
  toBenchmarkSex,
} from '@/lib/strength-benchmarks'
import { DEFAULT_WEIGHT_ROUNDING_LBS, roundToIncrement } from '@/lib/utils'

const MAX_STRENGTH_REPS = 10

const MISSING_FIELD_LABELS: Record<StrengthProfileMissingField, string> = {
  ageYears: 'Age',
  bodyweightLbs: 'Bodyweight',
  sex: 'Sex',
}

export const STRENGTH_REP_RANGE = Array.from({ length: MAX_STRENGTH_REPS }, (_, index) => index + 1)

export const SUPPORTED_STRENGTH_LIFT_NAMES = [
  'Back Squat',
  'Front Squat',
  'Deadlift',
  'Sumo Deadlift',
  'Power Clean',
  'Bench Press',
  'Incline Bench Press',
  'Dip',
  'Overhead Press',
  'Push Press',
  'Snatch Press',
  'Chin-Up',
  'Pull-Up',
  'Pendlay Row',
] as const

type ScoredStrengthProfileLift = {
  lift: StrengthProfileLift
  rawScore: number
}

type ScoredStrengthProfileCategory = StrengthProfileCategoryScore & {
  rawScore: number
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function roundStrengthProfileWeight(weightLbs: number, roundingLbs: number = DEFAULT_WEIGHT_ROUNDING_LBS) {
  if (!Number.isFinite(weightLbs)) {
    return weightLbs
  }

  return roundToIncrement(weightLbs, roundingLbs, 'down')
}

function resolveMissingFields(profile: StrengthProfileRawData['profile']): StrengthProfileMissingField[] {
  const missingFields: StrengthProfileMissingField[] = []

  if (profile.sex !== 'male' && profile.sex !== 'female') {
    missingFields.push('sex')
  }

  if (!Number.isInteger(profile.ageYears) || (profile.ageYears ?? 0) <= 0) {
    missingFields.push('ageYears')
  }

  if (!isPositiveNumber(profile.bodyweightLbs)) {
    missingFields.push('bodyweightLbs')
  }

  return missingFields
}

function buildStrengthRepMaxes(oneRepMaxLbs: number, roundingLbs: number) {
  if (!isPositiveNumber(oneRepMaxLbs)) {
    return []
  }

  return STRENGTH_REP_RANGE
    .map<StrengthProfileRepMax | null>((reps) => {
      const weightLbs = calculateBenchmarkMultiRepMax(reps, oneRepMaxLbs)
      return weightLbs === null ? null : { reps, weightLbs: roundStrengthProfileWeight(weightLbs, roundingLbs) }
    })
    .filter((entry): entry is StrengthProfileRepMax => entry !== null)
}

export function estimateStrengthOneRepMax(weightLbs: number, reps: number) {
  const oneRepMaxLbs = estimateBenchmarkOneRepMax(weightLbs, reps)
  return oneRepMaxLbs === null ? null : roundToSingleDecimal(oneRepMaxLbs)
}

export function calculateStrengthMultiRepMax(reps: number, oneRepMaxLbs: number) {
  const repMaxLbs = calculateBenchmarkMultiRepMax(reps, oneRepMaxLbs)
  return repMaxLbs === null ? null : roundToSingleDecimal(repMaxLbs)
}

export function calculateStrengthRepMax(targetReps: number, weightLbs: number, performedReps: number) {
  const oneRepMaxLbs = estimateStrengthOneRepMax(weightLbs, performedReps)

  if (oneRepMaxLbs === null) {
    return null
  }

  return calculateStrengthMultiRepMax(targetReps, oneRepMaxLbs)
}

export function getStrengthLevelLabel(score: number | null) {
  return getBenchmarkStrengthLabel(score)
}

export function calculateSymmetryScore(scores: number[]) {
  const symmetryScore = calculateBenchmarkSymmetryScore(scores)
  return symmetryScore === null ? null : roundToSingleDecimal(symmetryScore)
}

export function getStrengthRepMaxWeight(repMaxes: StrengthProfileRepMax[], reps: number) {
  return repMaxes.find((entry) => entry.reps === reps)?.weightLbs ?? null
}

export function formatStrengthProfileMissingField(field: StrengthProfileMissingField) {
  return MISSING_FIELD_LABELS[field]
}

export function createEmptyStrengthProfile(): StrengthProfileData {
  return {
    availableCategoryCount: 0,
    availableLiftCount: 0,
    categories: [],
    lifts: [],
    minimumCategoryCount: 2,
    minimumLiftCount: 3,
    missingFields: ['sex', 'ageYears', 'bodyweightLbs'],
    muscleGroups: [],
    profile: {
      ageYears: null,
      bodyweightLbs: null,
      sex: null,
    },
    status: 'missing_profile',
    strongestLift: null,
    symmetryScore: null,
    totalLabel: null,
    totalScore: null,
    weakestLift: null,
  }
}

export function buildStrengthProfile(
  rawStrengthProfile: StrengthProfileRawData,
  weightRoundingLbs: number = DEFAULT_WEIGHT_ROUNDING_LBS,
): StrengthProfileData {
  const missingFields = resolveMissingFields(rawStrengthProfile.profile)
  const benchmarkSex = toBenchmarkSex(rawStrengthProfile.profile.sex)
  const bodyweightLbs = rawStrengthProfile.profile.bodyweightLbs

  const liftsWithScores = rawStrengthProfile.lifts.map<ScoredStrengthProfileLift>((lift) => {
    const displayName = getBenchmarkDisplayLift(lift.liftSlug, lift.displayName)
    const category = getBenchmarkCategory(lift.liftSlug)
    const rawOneRepMaxLbs = estimateBenchmarkOneRepMax(lift.bestTotalLoadLbs, lift.bestReps) ?? lift.bestOneRepMaxLbs
    const bestOneRepMaxLbs = roundStrengthProfileWeight(rawOneRepMaxLbs, weightRoundingLbs)
    const rawScore = benchmarkSex && isPositiveNumber(bodyweightLbs)
      ? calculateSingleLiftStrengthScore('Imperial', benchmarkSex, rawStrengthProfile.profile.ageYears, bodyweightLbs, displayName, bestOneRepMaxLbs)
      : 0
    const score = roundToSingleDecimal(rawScore)

    return {
      lift: {
        ...lift,
        actualRepMaxes: buildStrengthRepMaxes(bestOneRepMaxLbs, weightRoundingLbs),
        bestOneRepMaxLbs,
        categoryKey: category.key,
        categoryLabel: category.label,
        deviationFromTotalPct: null,
        displayName,
        expectedAtTotalScoreLbs: null,
        expectedOneRepMaxLbs: null,
        expectedRepMaxes: [],
        score,
        strengthLabel: getStrengthLevelLabel(score) ?? 'Subpar',
      },
      rawScore,
    }
  })

  const categoriesByKey = new Map<string, ScoredStrengthProfileCategory>()

  for (const { lift, rawScore } of liftsWithScores) {
    const existing = categoriesByKey.get(lift.categoryKey)

    if (existing && existing.rawScore >= rawScore) {
      continue
    }

    categoriesByKey.set(lift.categoryKey, {
      categoryKey: lift.categoryKey,
      categoryLabel: lift.categoryLabel,
      liftName: lift.displayName,
      liftSlug: lift.liftSlug,
      rawScore,
      score: lift.score,
      strengthLabel: lift.strengthLabel,
    })
  }

  const categoryEntries = Array.from(categoriesByKey.values()).sort((left, right) => right.rawScore - left.rawScore)
  const categories = categoryEntries.map((category) => ({
    categoryKey: category.categoryKey,
    categoryLabel: category.categoryLabel,
    liftName: category.liftName,
    liftSlug: category.liftSlug,
    score: category.score,
    strengthLabel: category.strengthLabel,
  }))
  const availableLiftCount = liftsWithScores.length
  const availableCategoryCount = categories.length
  const hasRequiredCoverage = availableLiftCount >= rawStrengthProfile.minimumLiftCount
    && availableCategoryCount >= rawStrengthProfile.minimumCategoryCount
  const status = missingFields.length > 0
    ? 'missing_profile'
    : hasRequiredCoverage
      ? 'ready'
      : 'insufficient_data'
  const rawTotalScore = status === 'ready' && categoryEntries.length > 0
    ? categoryEntries.reduce((total, entry) => total + entry.rawScore, 0) / categoryEntries.length
    : null
  const totalScore = rawTotalScore === null ? null : roundToSingleDecimal(rawTotalScore)
  const totalLabel = status === 'ready' ? getStrengthLevelLabel(totalScore) : null

  const resolvedLifts = liftsWithScores.map<ScoredStrengthProfileLift>(({ lift, rawScore }) => {
    if (rawTotalScore === null || benchmarkSex === null || !isPositiveNumber(bodyweightLbs)) {
      return { lift, rawScore }
    }

    const expectedOneRepMax = calculateLiftFromStrengthScore(
      'Imperial',
      benchmarkSex,
      rawStrengthProfile.profile.ageYears,
      bodyweightLbs,
      rawTotalScore,
      lift.displayName,
    )
    const expectedOneRepMaxLbs = isPositiveNumber(expectedOneRepMax)
      ? roundStrengthProfileWeight(expectedOneRepMax, weightRoundingLbs)
      : null
    const deviationFromTotalPct = expectedOneRepMaxLbs !== null && expectedOneRepMaxLbs > 0
      ? roundToSingleDecimal(((lift.bestOneRepMaxLbs - expectedOneRepMaxLbs) * 100) / expectedOneRepMaxLbs)
      : null

    return {
      lift: {
        ...lift,
        deviationFromTotalPct,
        expectedAtTotalScoreLbs: expectedOneRepMaxLbs,
        expectedOneRepMaxLbs,
        expectedRepMaxes: expectedOneRepMaxLbs === null ? [] : buildStrengthRepMaxes(expectedOneRepMaxLbs, weightRoundingLbs),
      },
      rawScore,
    }
  })
  const lifts = resolvedLifts.map(({ lift }) => lift)

  const scoredHighlights = lifts.filter((lift): lift is StrengthProfileLift & { deviationFromTotalPct: number; expectedOneRepMaxLbs: number } => (
    typeof lift.deviationFromTotalPct === 'number'
    && Number.isFinite(lift.deviationFromTotalPct)
    && typeof lift.expectedOneRepMaxLbs === 'number'
    && Number.isFinite(lift.expectedOneRepMaxLbs)
  ))

  const strongestCandidate = [...scoredHighlights]
    .filter((lift) => lift.deviationFromTotalPct > 0)
    .sort((left, right) => right.deviationFromTotalPct - left.deviationFromTotalPct)[0]
  const strongestLift: StrengthProfileHighlight | null = strongestCandidate
    ? {
        actualOneRepMaxLbs: strongestCandidate.bestOneRepMaxLbs,
        deviationFromTotalPct: strongestCandidate.deviationFromTotalPct,
        displayName: strongestCandidate.displayName,
        expectedOneRepMaxLbs: strongestCandidate.expectedOneRepMaxLbs,
        liftSlug: strongestCandidate.liftSlug,
      }
    : null

  const weakestCandidate = [...scoredHighlights]
    .filter((lift) => lift.deviationFromTotalPct < 0)
    .sort((left, right) => left.deviationFromTotalPct - right.deviationFromTotalPct)[0]
  const weakestLift: StrengthProfileHighlight | null = weakestCandidate
    ? {
        actualOneRepMaxLbs: weakestCandidate.bestOneRepMaxLbs,
        deviationFromTotalPct: weakestCandidate.deviationFromTotalPct,
        displayName: weakestCandidate.displayName,
        expectedOneRepMaxLbs: weakestCandidate.expectedOneRepMaxLbs,
        liftSlug: weakestCandidate.liftSlug,
      }
    : null

  const muscleGroupEntries = new Map<string, Array<[number, number]>>()
  for (const { lift, rawScore } of resolvedLifts) {
    if (rawScore <= 0) {
      continue
    }

    for (const [muscleKey, muscleWeight] of Object.entries(getBenchmarkLiftInvolvement(lift.displayName))) {
      if (!isPositiveNumber(muscleWeight)) {
        continue
      }

      const entries = muscleGroupEntries.get(muscleKey) ?? []
      entries.push([rawScore, muscleWeight])
      muscleGroupEntries.set(muscleKey, entries)
    }
  }

  const muscleGroups = Array.from(muscleGroupEntries.entries())
    .map<StrengthProfileMuscleGroup>(([muscleKey, entries]) => {
      const score = roundToSingleDecimal(calculateWeightedMuscleGroupScore(entries))

      return {
        muscleKey,
        score,
        strengthLabel: getStrengthLevelLabel(score) ?? 'Subpar',
        title: getBenchmarkMuscleGroupLabel(muscleKey),
      }
    })
    .filter((muscleGroup) => muscleGroup.score > 0)
    .sort((left, right) => right.score - left.score)

  const liftScores = resolvedLifts.map(({ rawScore }) => rawScore).filter((score) => score > 0)
  const symmetryScore = status === 'ready' && liftScores.length > 1
    ? calculateSymmetryScore(liftScores)
    : null

  return {
    availableCategoryCount,
    availableLiftCount,
    categories,
    lifts,
    minimumCategoryCount: rawStrengthProfile.minimumCategoryCount,
    minimumLiftCount: rawStrengthProfile.minimumLiftCount,
    missingFields,
    muscleGroups,
    profile: rawStrengthProfile.profile,
    status,
    strongestLift,
    symmetryScore,
    totalLabel,
    totalScore,
    weakestLift,
  }
}
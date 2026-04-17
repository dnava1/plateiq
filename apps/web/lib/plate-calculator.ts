import type { AnalyticsData } from '@/types/analytics'
import type { PreferredUnit } from '@/types/domain'
import { displayToLbs, roundToIncrement, type RoundingMode } from '@/lib/utils'

export const DEFAULT_BARBELL_WEIGHT_LBS = 45
export const DEFAULT_ROUNDING_LBS = 5
export const STANDARD_PLATE_OPTIONS_LBS = [45, 35, 25, 10, 5, 2.5, 1.25] as const
export const STANDARD_PLATE_OPTIONS_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5] as const
export const STANDARD_PLATE_OPTIONS_KG_LBS: readonly number[] = STANDARD_PLATE_OPTIONS_KG.map((weightKg) => displayToLbs(weightKg, 'kg'))

const EPSILON_LBS = 0.001

export function getStandardPlateOptionsLbs(unit: PreferredUnit): readonly number[] {
  return unit === 'kg' ? STANDARD_PLATE_OPTIONS_KG_LBS : STANDARD_PLATE_OPTIONS_LBS
}

export interface PlateBreakdownLine {
  countPerSide: number
  weightLbs: number
}

export interface PlateBreakdownResult {
  achievedWeightLbs: number
  barbellWeightLbs: number
  perSideLoadLbs: number
  platesPerSide: PlateBreakdownLine[]
  remainderLbs: number
  roundedTargetWeightLbs: number
  targetWeightLbs: number
}

export interface PlateCalculatorSuggestion {
  exerciseId: number | null
  exerciseName: string | null
  latestEstimatedOneRepMaxLbs: number | null
  latestLoggedWeightLbs: number | null
  suggestedWorkingWeightLbs: number | null
}

function normalizeLoadLbs(value: number) {
  return Math.round(value * 100000) / 100000
}

function buildBestPlateStack(
  remainingPerSideLbs: number,
  plateOptionsLbs: readonly number[],
) {
  const sortedPlateOptionsLbs = [...plateOptionsLbs]
    .filter((plateWeightLbs) => plateWeightLbs > 0)
    .sort((left, right) => right - left)
  const memo = new Map<string, { counts: number[]; remainderPerSideLbs: number; totalPlates: number }>()

  function search(index: number, remainingLbs: number): { counts: number[]; remainderPerSideLbs: number; totalPlates: number } {
    const normalizedRemainingLbs = normalizeLoadLbs(Math.max(0, remainingLbs))

    if (index >= sortedPlateOptionsLbs.length) {
      return {
        counts: [],
        remainderPerSideLbs: normalizedRemainingLbs <= EPSILON_LBS ? 0 : normalizedRemainingLbs,
        totalPlates: 0,
      }
    }

    const memoKey = `${index}:${normalizedRemainingLbs.toFixed(5)}`
    const cachedResult = memo.get(memoKey)

    if (cachedResult) {
      return cachedResult
    }

    const plateWeightLbs = sortedPlateOptionsLbs[index]!
    const maxCount = Math.floor((normalizedRemainingLbs + EPSILON_LBS) / plateWeightLbs)
    let bestResult: { counts: number[]; remainderPerSideLbs: number; totalPlates: number } | null = null

    for (let count = maxCount; count >= 0; count -= 1) {
      const nextRemainingLbs = normalizeLoadLbs(normalizedRemainingLbs - count * plateWeightLbs)
      const childResult = search(index + 1, nextRemainingLbs)
      const candidateResult = {
        counts: [count, ...childResult.counts],
        remainderPerSideLbs: childResult.remainderPerSideLbs,
        totalPlates: childResult.totalPlates + count,
      }

      if (!bestResult) {
        bestResult = candidateResult
        continue
      }

      if (candidateResult.remainderPerSideLbs + EPSILON_LBS < bestResult.remainderPerSideLbs) {
        bestResult = candidateResult
        continue
      }

      const sameRemainder = Math.abs(candidateResult.remainderPerSideLbs - bestResult.remainderPerSideLbs) <= EPSILON_LBS
      if (sameRemainder && candidateResult.totalPlates < bestResult.totalPlates) {
        bestResult = candidateResult
      }
    }

    const resolvedResult = bestResult ?? {
      counts: new Array(sortedPlateOptionsLbs.length - index).fill(0),
      remainderPerSideLbs: normalizedRemainingLbs,
      totalPlates: 0,
    }

    memo.set(memoKey, resolvedResult)
    return resolvedResult
  }

  const result = search(0, remainingPerSideLbs)

  return {
    platesPerSide: sortedPlateOptionsLbs.flatMap((plateWeightLbs, index) => {
      const countPerSide = result.counts[index] ?? 0
      return countPerSide > 0 ? [{ countPerSide, weightLbs: plateWeightLbs }] : []
    }),
    remainderPerSideLbs: result.remainderPerSideLbs,
  }
}

export function calculatePlateBreakdown(
  targetWeightLbs: number,
  {
    barbellWeightLbs = DEFAULT_BARBELL_WEIGHT_LBS,
    plateOptionsLbs = STANDARD_PLATE_OPTIONS_LBS,
    roundingLbs = DEFAULT_ROUNDING_LBS,
    roundingMode = 'down',
  }: {
    barbellWeightLbs?: number
    plateOptionsLbs?: readonly number[]
    roundingLbs?: number
    roundingMode?: RoundingMode
  } = {},
): PlateBreakdownResult {
  const roundedTargetWeightLbs = Math.max(barbellWeightLbs, roundToIncrement(targetWeightLbs, roundingLbs, roundingMode))
  const loadableWeightLbs = Math.max(0, roundedTargetWeightLbs - barbellWeightLbs)
  const { platesPerSide, remainderPerSideLbs } = buildBestPlateStack(loadableWeightLbs / 2, plateOptionsLbs)
  const rawRemainderLbs = Math.max(0, remainderPerSideLbs * 2)
  const remainderLbs = rawRemainderLbs <= EPSILON_LBS ? 0 : rawRemainderLbs
  const achievedWeightLbs = roundedTargetWeightLbs - remainderLbs

  return {
    achievedWeightLbs,
    barbellWeightLbs,
    perSideLoadLbs: loadableWeightLbs / 2,
    platesPerSide,
    remainderLbs,
    roundedTargetWeightLbs,
    targetWeightLbs,
  }
}

export function buildPlateCalculatorSuggestion(
  analytics: AnalyticsData,
  exerciseId?: number | null,
  roundingLbs: number = DEFAULT_ROUNDING_LBS,
  roundingMode: RoundingMode = 'down',
): PlateCalculatorSuggestion {
  const relevantE1rmPoints = exerciseId
    ? analytics.e1rmTrend.filter((point) => point.exerciseId === exerciseId)
    : analytics.e1rmTrend
  const relevantPrPoints = exerciseId
    ? analytics.prHistory.filter((point) => point.exerciseId === exerciseId)
    : analytics.prHistory
  const latestE1rmPoint = [...relevantE1rmPoints].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null
  const latestPrPoint = [...relevantPrPoints].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null
  const referencePoint = latestE1rmPoint ?? latestPrPoint
  const suggestedWorkingWeightLbs = latestE1rmPoint
    ? roundToIncrement(latestE1rmPoint.e1rm * 0.7, roundingLbs, roundingMode)
    : latestPrPoint?.weight ?? null

  return {
    exerciseId: referencePoint?.exerciseId ?? null,
    exerciseName: referencePoint?.exerciseName ?? null,
    latestEstimatedOneRepMaxLbs: latestE1rmPoint?.e1rm ?? latestPrPoint?.e1rm ?? null,
    latestLoggedWeightLbs: latestPrPoint?.weight ?? latestE1rmPoint?.weight ?? null,
    suggestedWorkingWeightLbs,
  }
}

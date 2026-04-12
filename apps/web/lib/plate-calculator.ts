import type { AnalyticsData } from '@/types/analytics'
import { roundToIncrement, type RoundingMode } from '@/lib/utils'

export const DEFAULT_BARBELL_WEIGHT_LBS = 45
export const DEFAULT_ROUNDING_LBS = 5
export const STANDARD_PLATE_OPTIONS_LBS = [45, 35, 25, 10, 5, 2.5] as const

const EPSILON_LBS = 0.001

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

export function calculatePlateBreakdown(
  targetWeightLbs: number,
  {
    barbellWeightLbs = DEFAULT_BARBELL_WEIGHT_LBS,
    plateOptionsLbs = STANDARD_PLATE_OPTIONS_LBS,
    roundingLbs = DEFAULT_ROUNDING_LBS,
    roundingMode = 'nearest',
  }: {
    barbellWeightLbs?: number
    plateOptionsLbs?: readonly number[]
    roundingLbs?: number
    roundingMode?: RoundingMode
  } = {},
): PlateBreakdownResult {
  const roundedTargetWeightLbs = Math.max(barbellWeightLbs, roundToIncrement(targetWeightLbs, roundingLbs, roundingMode))
  const loadableWeightLbs = Math.max(0, roundedTargetWeightLbs - barbellWeightLbs)
  let remainingPerSideLbs = loadableWeightLbs / 2
  const platesPerSide: PlateBreakdownLine[] = []

  for (const plateWeightLbs of plateOptionsLbs) {
    if (plateWeightLbs <= 0) {
      continue
    }

    const countPerSide = Math.floor((remainingPerSideLbs + EPSILON_LBS) / plateWeightLbs)
    if (countPerSide <= 0) {
      continue
    }

    platesPerSide.push({ countPerSide, weightLbs: plateWeightLbs })
    remainingPerSideLbs -= countPerSide * plateWeightLbs
  }

  const remainderLbs = Math.max(0, remainingPerSideLbs * 2)
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
  roundingMode: RoundingMode = 'nearest',
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

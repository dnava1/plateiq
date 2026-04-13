import type { GeneratedSet } from '@/types/template'
import { estimateBenchmarkOneRepMax } from '@/lib/strength-benchmarks'

export const ESTIMATED_ONE_REP_MAX_PR_EPSILON_LBS = 0.5

export interface WorkoutDisplaySet extends GeneratedSet {
  exerciseId: number | null
  exerciseName: string
  loggedAt: string | null
  prescribedWeightLbs: number
  repsActual: number | null
  workoutId: number | null
}

export function formatRepTarget(
  repsPrescribed: number,
  repsPrescribedMax?: number,
  isAmrap?: boolean,
) {
  if (isAmrap) {
    return `${repsPrescribed}+`
  }

  if (typeof repsPrescribedMax === 'number') {
    return `${repsPrescribed}-${repsPrescribedMax}`
  }

  return String(repsPrescribed)
}

export function formatSetTypeLabel(setType: WorkoutDisplaySet['set_type']) {
  switch (setType) {
    case 'main':
      return 'Main'
    case 'amrap':
      return 'AMRAP'
    case 'variation':
      return 'Variation'
    case 'accessory':
      return 'Accessory'
    case 'warmup':
      return 'Warmup'
    default:
      return 'Set'
  }
}

export function estimateOneRepMax(weightLbs: number, reps: number) {
  return estimateBenchmarkOneRepMax(weightLbs, reps) ?? weightLbs
}

export function isEstimatedOneRepMaxPr(
  nextEstimateLbs: number,
  historicalEstimatesLbs: number[],
  epsilonLbs: number = ESTIMATED_ONE_REP_MAX_PR_EPSILON_LBS,
) {
  const bestHistoricalEstimate = historicalEstimatesLbs.reduce(
    (best, current) => (Number.isFinite(current) ? Math.max(best, current) : best),
    Number.NEGATIVE_INFINITY,
  )

  if (!Number.isFinite(bestHistoricalEstimate)) {
    return Number.isFinite(nextEstimateLbs)
  }

  return nextEstimateLbs > bestHistoricalEstimate + epsilonLbs
}
export type EffortInputMode = 'rpe' | 'rir'

const HALF_STEP_MULTIPLIER = 2

export const MIN_RPE = 1
export const MAX_RPE = 10
export const MIN_RIR = 0
export const MAX_RIR = 9

function roundToNearestHalf(value: number) {
  return Math.round(value * HALF_STEP_MULTIPLIER) / HALF_STEP_MULTIPLIER
}

export function formatEffortValue(value: number) {
  const normalizedValue = roundToNearestHalf(value)

  return Number.isInteger(normalizedValue)
    ? String(normalizedValue)
    : normalizedValue.toFixed(1)
}

export function isValidRpe(value: number) {
  return Number.isFinite(value) && value >= MIN_RPE && value <= MAX_RPE
}

export function isValidRir(value: number) {
  return Number.isFinite(value) && value >= MIN_RIR && value <= MAX_RIR
}

export function normalizeRpe(value: number) {
  return roundToNearestHalf(value)
}

export function normalizeRir(value: number) {
  return roundToNearestHalf(value)
}

export function convertRirToRpe(rir: number) {
  return normalizeRpe(MAX_RPE - rir)
}

export function convertRpeToRir(rpe: number) {
  return normalizeRir(MAX_RPE - rpe)
}

export function normalizeEffortToRpe(value: number, mode: EffortInputMode) {
  if (!Number.isFinite(value)) {
    return null
  }

  if (mode === 'rpe') {
    const normalizedValue = normalizeRpe(value)
    return isValidRpe(normalizedValue) ? normalizedValue : null
  }

  const normalizedValue = normalizeRir(value)
  return isValidRir(normalizedValue) ? convertRirToRpe(normalizedValue) : null
}

export function formatCanonicalEffort(rpe: number) {
  return `RPE ${formatEffortValue(rpe)} (${formatEffortValue(convertRpeToRir(rpe))} RIR)`
}

export function formatTargetEffort(rpe: number) {
  return `Target RPE ${formatEffortValue(rpe)}`
}
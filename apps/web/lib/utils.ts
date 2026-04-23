import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PreferredUnit, WeightRoundingLbs } from '@/types/domain'

const KG_PER_LB = 0.453592
const WEIGHT_ROUNDING_PRECISION = 5
const ROUNDING_OPTIONS_LBS = [2.5, 5, 10] as const
const ROUNDING_OPTIONS_KG = [1, 2.5, 5] as const
const ROUNDING_EPSILON = 1e-9
const WEIGHT_ROUNDING_EPSILON = 1e-6
const ISO_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const EXERCISE_KEY_ACRONYMS = new Set(['ohp', 'rdl'])
const EXERCISE_KEY_LABELS: Record<string, string> = {
  bench: 'Bench Press',
  barbell_row: 'Barbell Row',
  chin_up: 'Chin-Up',
  close_grip_bench: 'Close-Grip Bench Press',
  incline_bench: 'Incline Bench Press',
  lat_pulldown: 'Lat Pulldown',
  ohp: 'Overhead Press',
  power_clean: 'Power Clean',
  rdl: 'Romanian Deadlift',
  sumo_deadlift: 'Sumo Deadlift',
}
const ROUNDING_OPTIONS_KG_LBS = ROUNDING_OPTIONS_KG.map((value) => normalizeWeightRoundingLbs(value / KG_PER_LB))
const SUPPORTED_WEIGHT_ROUNDING_LBS = [...ROUNDING_OPTIONS_LBS, ...ROUNDING_OPTIONS_KG_LBS]

function normalizeWeightRoundingLbs(value: number) {
  return Math.round(value * 10 ** WEIGHT_ROUNDING_PRECISION) / 10 ** WEIGHT_ROUNDING_PRECISION
}

function areWeightRoundingValuesEqual(left: number, right: number) {
  return Math.abs(left - right) <= WEIGHT_ROUNDING_EPSILON
}

function roundToDecimalPlaces(value: number, fractionDigits: number) {
  const precision = 10 ** Math.max(0, fractionDigits)
  return Math.round(value * precision) / precision
}

function normalizeRoundedValue(value: number) {
  return Math.round(value * 1000) / 1000
}

export type RoundingMode = 'nearest' | 'down' | 'up'
export const DEFAULT_WEIGHT_ROUNDING_LBS: WeightRoundingLbs = 5
export const DEFAULT_WEIGHT_ROUNDING_KG_LBS: WeightRoundingLbs = ROUNDING_OPTIONS_KG_LBS[1]!

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isWeightRoundingLbs(value: unknown): value is WeightRoundingLbs {
  return typeof value === 'number'
    && Number.isFinite(value)
    && SUPPORTED_WEIGHT_ROUNDING_LBS.some((supportedValue) => areWeightRoundingValuesEqual(supportedValue, value))
}

export function resolveWeightRoundingLbs(value: unknown): WeightRoundingLbs {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_WEIGHT_ROUNDING_LBS
  }

  const normalizedValue = normalizeWeightRoundingLbs(value)
  return isWeightRoundingLbs(normalizedValue) ? normalizedValue : DEFAULT_WEIGHT_ROUNDING_LBS
}

export function parseWeightRoundingLbs(value: string): WeightRoundingLbs | null {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return null
  }

  const normalizedValue = normalizeWeightRoundingLbs(parsedValue)
  return isWeightRoundingLbs(normalizedValue) ? normalizedValue : null
}

export function getDefaultWeightRoundingLbs(unit: PreferredUnit): WeightRoundingLbs {
  return unit === 'kg' ? DEFAULT_WEIGHT_ROUNDING_KG_LBS : DEFAULT_WEIGHT_ROUNDING_LBS
}

export function roundWeightForDisplay(lbs: number, roundingLbs?: number | null): number {
  return roundToIncrement(lbs, resolveWeightRoundingLbs(roundingLbs), 'down')
}

export function formatDisplayNumber(value: number, maximumFractionDigits: number = 1): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatWeight(lbs: number, unit: PreferredUnit, roundingLbs?: number | null): string {
  const resolvedLbs = roundingLbs == null ? lbs : roundWeightForDisplay(lbs, roundingLbs)
  return `${formatDisplayNumber(lbsToDisplay(resolvedLbs, unit), 1)} ${formatUnit(unit)}`
}

export function lbsToDisplay(lbs: number, unit: PreferredUnit, fractionDigits: number = 1): number {
  if (unit === 'kg') {
    return roundToDecimalPlaces(lbs * KG_PER_LB, fractionDigits)
  }
  return roundToDecimalPlaces(lbs, fractionDigits)
}

export function displayToLbs(value: number, unit: PreferredUnit): number {
  if (unit === 'kg') {
    return value / KG_PER_LB
  }
  return value
}

export function formatUnit(unit: PreferredUnit): string {
  return unit
}

export function formatRounding(roundingLbs: number, unit: PreferredUnit): string {
  return `${lbsToDisplay(roundingLbs, unit)} ${formatUnit(unit)}`
}

export function formatDaysPerWeek(days: number): string {
  return `${days} day${days === 1 ? '' : 's'} per week`
}

export function formatWeekCycle(weeks: number): string {
  return `${weeks}-week cycle`
}

function getBaseRoundingOptionsLbs(unit: PreferredUnit) {
  return unit === 'kg' ? ROUNDING_OPTIONS_KG_LBS : ROUNDING_OPTIONS_LBS
}

export function normalizeCadenceCopy(text: string): string {
  return text
    .replace(/\b(\d+)d\/wk\b/gi, (_, value: string) => formatDaysPerWeek(Number(value)))
    .replace(/\b(\d+)\s+days?\/week\b/gi, (_, value: string) => formatDaysPerWeek(Number(value)))
}

export function snapWeightRoundingLbsToUnit(roundingLbs: unknown, unit: PreferredUnit): WeightRoundingLbs {
  const resolvedRounding = resolveWeightRoundingLbs(roundingLbs)
  const candidates = getBaseRoundingOptionsLbs(unit)

  return candidates.reduce((closestValue, candidateValue) => {
    const closestDistance = Math.abs(closestValue - resolvedRounding)
    const candidateDistance = Math.abs(candidateValue - resolvedRounding)

    if (candidateDistance + WEIGHT_ROUNDING_EPSILON < closestDistance) {
      return candidateValue
    }

    const isTie = Math.abs(candidateDistance - closestDistance) <= WEIGHT_ROUNDING_EPSILON
    if (isTie && candidateValue < closestValue) {
      return candidateValue
    }

    return closestValue
  })
}

export function getRoundingOptions(unit: PreferredUnit, currentRoundingLbs?: number | null) {
  const baseValues = getBaseRoundingOptionsLbs(unit)
  const optionValues = [...baseValues]

  if (currentRoundingLbs != null) {
    const resolvedCurrentValue = resolveWeightRoundingLbs(currentRoundingLbs)
    const hasCurrentValue = optionValues.some((value) => areWeightRoundingValuesEqual(value, resolvedCurrentValue))

    if (!hasCurrentValue) {
      optionValues.push(resolvedCurrentValue)
    }
  }

  return optionValues
    .sort((left, right) => lbsToDisplay(left, unit) - lbsToDisplay(right, unit))
    .map((value) => ({
      value,
      label: formatRounding(value, unit),
    }))
}

export function formatExerciseKey(exerciseKey: string): string {
  const normalizedKey = exerciseKey.trim().toLowerCase()

  if (normalizedKey.length === 0) {
    return ''
  }

  const knownLabel = EXERCISE_KEY_LABELS[normalizedKey]
  if (knownLabel) {
    return knownLabel
  }

  return normalizedKey
    .split('_')
    .map((part) => {
      if (EXERCISE_KEY_ACRONYMS.has(part)) {
        return part.toUpperCase()
      }

      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`
    })
    .join(' ')
}

export function formatDate(date: string | Date): string {
  const normalizedDate = typeof date === 'string'
    ? (() => {
      const match = ISO_DATE_ONLY_PATTERN.exec(date)

      if (!match) {
        return new Date(date)
      }

      const [, year, month, day] = match
      return new Date(Number(year), Number(month) - 1, Number(day))
    })()
    : new Date(date)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(normalizedDate)
}

export function formatDateAsLocalIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function roundToIncrement(value: number, increment: number, mode: RoundingMode = 'nearest'): number {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) {
    return value
  }

  const scaled = value / increment

  switch (mode) {
    case 'down':
      return normalizeRoundedValue(Math.floor(scaled + ROUNDING_EPSILON) * increment)
    case 'up':
      return normalizeRoundedValue(Math.ceil(scaled - ROUNDING_EPSILON) * increment)
    default:
      return normalizeRoundedValue(Math.round(scaled) * increment)
  }
}

export function roundToNearest(value: number, nearest: number): number {
  return roundToIncrement(value, nearest, 'nearest')
}

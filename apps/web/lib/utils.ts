import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PreferredUnit } from '@/types/domain'

const KG_PER_LB = 0.453592
const ROUNDING_OPTIONS_LBS = [2.5, 5, 10] as const
const ROUNDING_EPSILON = 1e-9
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

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function normalizeRoundedValue(value: number) {
  return Math.round(value * 1000) / 1000
}

export type RoundingMode = 'nearest' | 'down' | 'up'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWeight(lbs: number, unit: PreferredUnit): string {
  return `${lbsToDisplay(lbs, unit)} ${formatUnit(unit)}`
}

export function lbsToDisplay(lbs: number, unit: PreferredUnit): number {
  if (unit === 'kg') {
    return roundToSingleDecimal(lbs * KG_PER_LB)
  }
  return roundToSingleDecimal(lbs)
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

export function normalizeCadenceCopy(text: string): string {
  return text
    .replace(/\b(\d+)d\/wk\b/gi, (_, value: string) => formatDaysPerWeek(Number(value)))
    .replace(/\b(\d+)\s+days?\/week\b/gi, (_, value: string) => formatDaysPerWeek(Number(value)))
}

export function getRoundingOptions(unit: PreferredUnit) {
  return ROUNDING_OPTIONS_LBS.map((value) => ({
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
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
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

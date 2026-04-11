import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PreferredUnit } from '@/types/domain'

const KG_PER_LB = 0.453592
const ROUNDING_OPTIONS_LBS = [2.5, 5, 10] as const

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

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

export function getRoundingOptions(unit: PreferredUnit) {
  return ROUNDING_OPTIONS_LBS.map((value) => ({
    value,
    label: formatRounding(value, unit),
  }))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest
}

import { formatUnit, lbsToDisplay, roundWeightForDisplay } from '@/lib/utils'
import type { PreferredUnit } from '@/types/domain'

export const CHART_COLORS = ['#f97316', '#38bdf8', '#22c55e', '#facc15', '#fb7185'] as const

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

export function formatCompactNumber(value: number) {
  return COMPACT_NUMBER_FORMATTER.format(value)
}

export function formatCompactDisplayLoad(valueLbs: number, unit: PreferredUnit) {
  return formatCompactNumber(lbsToDisplay(valueLbs, unit, 1))
}

export function formatCompactRoundedWeight(valueLbs: number, unit: PreferredUnit, roundingLbs?: number | null) {
  return formatCompactNumber(lbsToDisplay(roundWeightForDisplay(valueLbs, roundingLbs), unit, 1))
}

export function formatDisplayLoad(valueLbs: number, unit: PreferredUnit, fractionDigits: number = unit === 'kg' ? 1 : 0) {
  return `${lbsToDisplay(valueLbs, unit, fractionDigits)} ${formatUnit(unit)}`
}

export function formatShortDate(value: string | number | Date) {
  return SHORT_DATE_FORMATTER.format(new Date(value))
}

export function formatMovementPattern(value: string) {
  return value
    .split('_')
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ')
}

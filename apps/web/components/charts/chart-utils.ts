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

export function formatShortDate(value: string | number | Date) {
  return SHORT_DATE_FORMATTER.format(new Date(value))
}

export function formatMovementPattern(value: string) {
  return value
    .split('_')
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ')
}

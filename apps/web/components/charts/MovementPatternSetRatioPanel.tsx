'use client'

import { Badge } from '@/components/ui/badge'
import type { MovementPatternSetRatio, MovementPatternSetRatioStatus } from '@/types/analytics'

interface MovementPatternSetRatioPanelProps {
  ratios: MovementPatternSetRatio[]
}

function formatSetCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatRatio(value: number | null) {
  return value === null ? 'No ratio' : value.toFixed(value % 1 === 0 ? 0 : 2)
}

function getStatusLabel(status: MovementPatternSetRatioStatus, ratio: MovementPatternSetRatio) {
  switch (status) {
    case 'balanced':
      return 'Balanced'
    case 'left_dominant':
      return `${ratio.leftLabel} dominant`
    case 'right_dominant':
      return `${ratio.rightLabel} dominant`
    default:
      return 'Insufficient'
  }
}

function getStatusClassName(status: MovementPatternSetRatioStatus) {
  switch (status) {
    case 'balanced':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'left_dominant':
    case 'right_dominant':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200'
    default:
      return 'border-border/70 bg-background/40 text-muted-foreground'
  }
}

export function MovementPatternSetRatioPanel({ ratios }: MovementPatternSetRatioPanelProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {ratios.map((ratio) => (
        <div key={ratio.key} className="min-w-0 rounded-[20px] border border-border/70 bg-background/45 p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="eyebrow">{ratio.label}</span>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {formatSetCount(ratio.leftSets)} : {formatSetCount(ratio.rightSets)}
              </p>
            </div>
            <Badge variant="outline" className={`${getStatusClassName(ratio.status)} shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium leading-4`}>
              {getStatusLabel(ratio.status, ratio)}
            </Badge>
          </div>
          <div className="mt-3 flex min-w-0 items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="min-w-0">Ratio</span>
            <span className="font-medium text-foreground">{formatRatio(ratio.ratio)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

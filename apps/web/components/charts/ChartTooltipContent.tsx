'use client'

import type { CSSProperties } from 'react'

interface ChartTooltipRow {
  color?: string
  label: string
  value: string
}

interface ChartTooltipContentProps {
  id?: string
  label: string
  maxWidth?: number
  rows: ChartTooltipRow[]
}

export function ChartTooltipContent({ id, label, maxWidth, rows }: ChartTooltipContentProps) {
  if (rows.length === 0) {
    return null
  }

  const constrainedMaxWidth = typeof maxWidth === 'number' && Number.isFinite(maxWidth)
    ? Math.max(maxWidth, 1)
    : undefined
  const constrainedMinWidth = constrainedMaxWidth !== undefined
    ? Math.min(176, constrainedMaxWidth)
    : undefined
  const tooltipStyle: CSSProperties = constrainedMaxWidth !== undefined
    ? {
        maxWidth: constrainedMaxWidth,
        minWidth: constrainedMinWidth,
      }
    : {
        maxWidth: 'var(--chart-tooltip-max-width, min(20rem, calc(100vw - 1rem)))',
        minWidth: 'var(--chart-tooltip-min-width, 11rem)',
      }

  return (
    <div
      id={id}
      role="tooltip"
      className="shadow-app-tooltip pointer-events-none w-max max-w-[min(20rem,calc(100vw-1rem))] min-w-44 rounded-[18px] border border-border/70 bg-background/95 px-3 py-2 backdrop-blur-sm"
      style={tooltipStyle}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs text-foreground">
            <div className="flex min-w-0 grow items-center gap-2">
              {row.color ? (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              ) : null}
              <span className="break-words text-muted-foreground">{row.label}</span>
            </div>
            <span className="max-w-full break-words text-right font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

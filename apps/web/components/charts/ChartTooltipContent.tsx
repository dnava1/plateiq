'use client'

interface ChartTooltipRow {
  color?: string
  label: string
  value: string
}

interface ChartTooltipContentProps {
  id?: string
  label: string
  rows: ChartTooltipRow[]
}

export function ChartTooltipContent({ id, label, rows }: ChartTooltipContentProps) {
  if (rows.length === 0) {
    return null
  }

  return (
    <div id={id} role="tooltip" className="pointer-events-none min-w-44 rounded-[18px] border border-border/70 bg-background/95 px-3 py-2 shadow-[0_16px_40px_-18px_rgba(15,23,42,0.5)] backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="flex items-center justify-between gap-3 text-xs text-foreground">
            <div className="flex min-w-0 items-center gap-2">
              {row.color ? (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              ) : null}
              <span className="truncate text-muted-foreground">{row.label}</span>
            </div>
            <span className="shrink-0 font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
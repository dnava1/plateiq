'use client'

import type { SupplementOption } from '@/types/template'
import { cn } from '@/lib/utils'

interface SupplementSelectorProps {
  options: SupplementOption[]
  selectedKey: string | null
  onSelect: (key: string | null) => void
}

export function SupplementSelector({ options, selectedKey, onSelect }: SupplementSelectorProps) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This program does not include alternate variations, so the base template stays as-is.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">Choose a variation</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Keep the base template or add a variation that changes the main workload.
        </p>
      </div>

      {/* None option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'w-full rounded-[22px] border border-border/70 bg-card/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-muted/50',
          selectedKey === null && 'border-primary bg-primary/5 ring-1 ring-primary/30'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Base template only</span>
          {selectedKey === null && <div className="size-3 rounded-full bg-primary" />}
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Keep the standard version with no extra variation blocks.</p>
      </button>

      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onSelect(option.key)}
          className={cn(
            'w-full rounded-[22px] border border-border/70 bg-card/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-muted/50',
            selectedKey === option.key && 'border-primary bg-primary/5 ring-1 ring-primary/30'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{option.name}</span>
            {selectedKey === option.key && <div className="size-3 rounded-full bg-primary" />}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  )
}

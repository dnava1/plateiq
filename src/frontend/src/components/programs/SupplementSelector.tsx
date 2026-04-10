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
        This program has no supplement options — the base template is fixed.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {/* None option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
          selectedKey === null && 'border-foreground bg-muted'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Base program only</span>
          {selectedKey === null && <div className="h-3 w-3 rounded-full bg-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">No supplement work added</p>
      </button>

      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onSelect(option.key)}
          className={cn(
            'w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
            selectedKey === option.key && 'border-foreground bg-muted'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{option.name}</span>
            {selectedKey === option.key && <div className="h-3 w-3 rounded-full bg-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
        </button>
      ))}
    </div>
  )
}

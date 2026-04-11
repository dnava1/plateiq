'use client'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import type { VariationOption } from '@/types/template'

interface VariationSelectorProps {
  options: VariationOption[]
  selectedKey: string | null
  onSelect: (key: string | null) => void
}

export function VariationSelector({ options, selectedKey, onSelect }: VariationSelectorProps) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This program does not include alternate variations, so the base template stays as-is.
      </p>
    )
  }

  return (
    <RadioGroup
      value={selectedKey ?? '__base__'}
      aria-label="Program variations"
      onValueChange={(value) => onSelect(value === '__base__' ? null : value)}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">Choose a variation</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Keep the base template or add a variation that changes the main workload.
        </p>
      </div>

      <Radio.Root
        value="__base__"
        nativeButton
        render={<button />}
        className="card-hover w-full rounded-[22px] border border-border/70 bg-card/70 p-4 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:ring-1 aria-checked:ring-primary/30"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Base template only</span>
          <Radio.Indicator className="size-3 rounded-full bg-primary" />
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Keep the standard version with no extra variation blocks.</p>
      </Radio.Root>

      {options.map((option) => (
        <Radio.Root
          key={option.key}
          value={option.key}
          nativeButton
          render={<button />}
          className="card-hover w-full rounded-[22px] border border-border/70 bg-card/70 p-4 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:ring-1 aria-checked:ring-primary/30"
        >
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">{option.name}</span>
            <Radio.Indicator className="size-3 rounded-full bg-primary" />
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</p>
        </Radio.Root>
      ))}
    </RadioGroup>
  )
}
'use client'

import { useState } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatUnit, getRoundingOptions } from '@/lib/utils'
import { validateCustomProgramBasicsStep } from '@/lib/validations/program'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((value) => ({
  value: String(value),
  label: String(value),
}))

const CYCLE_LENGTH_OPTIONS = Array.from({ length: 16 }, (_, index) => {
  const value = index + 1

  return {
    value: String(value),
    label: `${value} week${value > 1 ? 's' : ''}`,
  }
})

const TM_PERCENTAGE_OPTIONS = [
  { value: '0.85', label: '85%' },
  { value: '0.875', label: '87.5%' },
  { value: '0.9', label: '90%' },
  { value: '0.925', label: '92.5%' },
  { value: '0.95', label: '95%' },
]

export function BasicsStep() {
  const { draft, patchDraft, setStep } = useBuilderDraftStore()
  const [error, setError] = useState<string | null>(null)
  const preferredUnit = usePreferredUnit()
  const roundingOptions = getRoundingOptions(preferredUnit)
  const roundingSelectItems = roundingOptions.map((option) => ({
    value: String(option.value),
    label: option.label,
  }))

  const handleNext = () => {
    const validationError = validateCustomProgramBasicsStep(draft.name)

    if (validationError) {
      setError(validationError)
      return
    }

    // Initialize day labels if needed
    if (draft.days.length !== draft.days_per_week) {
      const days = Array.from({ length: draft.days_per_week }, (_, i) => ({
        label: draft.days[i]?.label ?? `Day ${i + 1}`,
        exercise_blocks: draft.days[i]?.exercise_blocks ?? [],
      }))
      patchDraft({ days })
    }
    setStep('days')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Program Name</Label>
        <Input
          id="name"
          placeholder="My Four-Day Split"
          value={draft.name}
          onChange={(e) => {
            patchDraft({ name: e.target.value })
            setError(null)
          }}
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? 'builder-basics-error' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dpw">Days per Week</Label>
          <Select
            value={String(draft.days_per_week)}
            onValueChange={(value) => {
              patchDraft({ days_per_week: Number(value) })
              setError(null)
            }}
            items={DAYS_PER_WEEK_OPTIONS}
          >
            <SelectTrigger id="dpw" className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DAYS_PER_WEEK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="clw">Cycle Length</Label>
          <Select
            value={String(draft.cycle_length_weeks)}
            onValueChange={(value) => {
              patchDraft({ cycle_length_weeks: Number(value) })
              setError(null)
            }}
            items={CYCLE_LENGTH_OPTIONS}
          >
            <SelectTrigger id="clw" className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CYCLE_LENGTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border/70 bg-card/70 p-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="uses-training-max">Use Training Maxes</Label>
            <p className="text-sm text-muted-foreground">
              Prescribe main lift loads from percentages and rounding rules.
            </p>
          </div>
          <Toggle
            id="uses-training-max"
            aria-label="Use training maxes"
            variant="outline"
            size="sm"
            pressed={draft.uses_training_max}
            onPressedChange={(pressed) => patchDraft({ uses_training_max: pressed })}
            className="min-w-16 justify-center rounded-full px-3 text-[0.7rem] uppercase tracking-[0.18em] data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {draft.uses_training_max ? 'On' : 'Off'}
          </Toggle>
        </div>

        {draft.uses_training_max && (
          <div className="grid grid-cols-2 gap-4 animate-slide-up motion-reduce:animate-none">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tmp">Training Max Percentage</Label>
              <Select
                value={String(draft.tm_percentage)}
                onValueChange={(value) => {
                  patchDraft({ tm_percentage: Number(value) })
                  setError(null)
                }}
                items={TM_PERCENTAGE_OPTIONS}
              >
                <SelectTrigger id="tmp" className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TM_PERCENTAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rnd">Rounding ({formatUnit(preferredUnit)})</Label>
              <Select
                value={String(draft.rounding)}
                onValueChange={(value) => {
                  patchDraft({ rounding: Number(value) })
                  setError(null)
                }}
                items={roundingSelectItems}
              >
                <SelectTrigger id="rnd" className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {roundingSelectItems.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p id="builder-basics-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button onClick={handleNext} className="w-full">
        Next
      </Button>
    </div>
  )
}

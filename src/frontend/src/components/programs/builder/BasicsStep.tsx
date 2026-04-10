'use client'

import { useState } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatUnit, getRoundingOptions } from '@/lib/utils'
import { validateCustomProgramBasicsStep } from '@/lib/validations/program'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'

export function BasicsStep() {
  const { draft, patchDraft, setStep } = useBuilderDraftStore()
  const [error, setError] = useState<string | null>(null)
  const preferredUnit = usePreferredUnit()
  const roundingOptions = getRoundingOptions(preferredUnit)

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
    <div className="space-y-5">
      <div className="space-y-2">
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
        <div className="space-y-2">
          <Label htmlFor="dpw">Days per Week</Label>
          <NativeSelect
            id="dpw"
            className="h-9"
            value={draft.days_per_week}
            onChange={(e) => {
              patchDraft({ days_per_week: Number(e.target.value) })
              setError(null)
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clw">Cycle Length (weeks)</Label>
          <NativeSelect
            id="clw"
            className="h-9"
            value={draft.cycle_length_weeks}
            onChange={(e) => {
              patchDraft({ cycle_length_weeks: Number(e.target.value) })
              setError(null)
            }}
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} week{n > 1 ? 's' : ''}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={draft.uses_training_max}
            onClick={() => patchDraft({ uses_training_max: !draft.uses_training_max })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${draft.uses_training_max ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${draft.uses_training_max ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <Label className="cursor-pointer" onClick={() => patchDraft({ uses_training_max: !draft.uses_training_max })}>
            Use Training Maxes
          </Label>
        </div>

        {draft.uses_training_max && (
          <div className="grid grid-cols-2 gap-4 animate-slide-up">
            <div className="space-y-2">
              <Label htmlFor="tmp">TM Percentage</Label>
              <NativeSelect
                id="tmp"
                className="h-9"
                value={draft.tm_percentage}
                onChange={(e) => {
                  patchDraft({ tm_percentage: Number(e.target.value) })
                  setError(null)
                }}
              >
                <option value={0.85}>85%</option>
                <option value={0.875}>87.5%</option>
                <option value={0.9}>90%</option>
                <option value={0.925}>92.5%</option>
                <option value={0.95}>95%</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rnd">Rounding ({formatUnit(preferredUnit)})</Label>
              <NativeSelect
                id="rnd"
                className="h-9"
                value={draft.rounding}
                onChange={(e) => {
                  patchDraft({ rounding: Number(e.target.value) })
                  setError(null)
                }}
              >
                {roundingOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p id="builder-basics-error" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button onClick={handleNext} className="w-full">
        Next
      </Button>
    </div>
  )
}

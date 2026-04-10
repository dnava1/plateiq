'use client'

import { useState } from 'react'
import { validateCustomProgramDaysStep } from '@/lib/validations/program'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DaysStep() {
  const { draft, patchDraft, setStep } = useBuilderDraftStore()
  const [error, setError] = useState<string | null>(null)

  const handleLabelChange = (index: number, label: string) => {
    const days = [...draft.days]
    days[index] = { ...days[index], label }
    patchDraft({ days })
    setError(null)
  }

  const handleNext = () => {
    const validationError = validateCustomProgramDaysStep(draft.days)

    if (validationError) {
      setError(validationError)
      return
    }

    setStep('exercises')
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Name each training day so the rest of the build stays easy to scan.
        </p>
      </div>

      <div className="space-y-3">
        {draft.days.map((day, i) => (
          <div key={i} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <div className="flex-1 space-y-1">
              <Label htmlFor={`day-${i}`} className="sr-only">Day {i + 1} label</Label>
              <Input
                id={`day-${i}`}
                placeholder={`Day ${i + 1}`}
                value={day.label}
                onChange={(e) => handleLabelChange(i, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('basics')} className="flex-1">
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1">
          Next
        </Button>
      </div>
    </div>
  )
}

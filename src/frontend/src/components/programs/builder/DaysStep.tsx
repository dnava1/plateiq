'use client'

import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DaysStep() {
  const { draft, patchDraft, setStep } = useBuilderDraftStore()

  const handleLabelChange = (index: number, label: string) => {
    const days = [...draft.days]
    days[index] = { ...days[index], label }
    patchDraft({ days })
  }

  const handleNext = () => {
    // Ensure all days have at least a label
    const valid = draft.days.every((d) => d.label.trim())
    if (!valid) return
    setStep('exercises')
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Name each training day. You&apos;ll add exercises in the next step.
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

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('basics')} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!draft.days.every((d) => d.label.trim())}
          className="flex-1"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

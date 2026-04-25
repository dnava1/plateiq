'use client'

import { resolveEditableProgramDaySlots, updateProgramDay } from '@/lib/programs/week'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBuilderStepNavigation } from './useBuilderStepNavigation'

export function DaysStep() {
  const { draft, patchDraft } = useBuilderDraftStore()
  const { clearStepError, goToStep, stepError } = useBuilderStepNavigation()
  const editableDaySlots = resolveEditableProgramDaySlots(draft)
  const showWeekHeaders = editableDaySlots.some((slot) => slot.weekNumber > 1)

  const handleLabelChange = (slotIndex: number, label: string) => {
    const slot = editableDaySlots[slotIndex]

    if (!slot) {
      return
    }

    patchDraft(updateProgramDay(draft, slot, { ...slot.day, label }))
    clearStepError()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Name each training day so the rest of the build stays easy to scan.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {editableDaySlots.map((slot, slotIndex) => (
          <div key={`${slot.weekNumber}-${slot.dayIndex}-${slotIndex}`} className="flex flex-col gap-3">
            {showWeekHeaders && (slot.dayIndex === 0 || editableDaySlots[slotIndex - 1]?.weekNumber !== slot.weekNumber) ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Week {slot.weekNumber}
                </span>
                <span className="text-sm font-medium text-foreground">{slot.weekLabel}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-3 animate-slide-up motion-reduce:animate-none" style={{ animationDelay: `${slotIndex * 50}ms` }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                {slotIndex + 1}
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor={`day-${slotIndex}`} className="sr-only">Day {slotIndex + 1} label</Label>
                <Input
                  id={`day-${slotIndex}`}
                  placeholder={showWeekHeaders ? `Week ${slot.weekNumber} Day ${slot.dayIndex + 1}` : `Day ${slot.dayIndex + 1}`}
                  value={slot.day.label}
                  onChange={(e) => handleLabelChange(slotIndex, e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {stepError && (
        <p role="alert" className="text-sm text-destructive">{stepError}</p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => goToStep('basics')} className="flex-1">
          Back
        </Button>
        <Button onClick={() => goToStep('exercises')} className="flex-1">
          Next
        </Button>
      </div>
    </div>
  )
}

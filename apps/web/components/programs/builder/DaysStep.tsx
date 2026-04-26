'use client'

import {
  collapseProgramWeekSpecificDays,
  hasProgramWeekSpecificDays,
  materializeProgramWeekSpecificDays,
  resolveEditableProgramDaySlots,
  updateProgramDay,
  updateProgramWeekLabel,
} from '@/lib/programs/week'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBuilderStepNavigation } from './useBuilderStepNavigation'

export function DaysStep() {
  const { draft, patchDraft } = useBuilderDraftStore()
  const { clearStepError, goToStep, stepError } = useBuilderStepNavigation()
  const hasWeekOverrides = hasProgramWeekSpecificDays(draft)
  const canEnableWeekOverrides = draft.cycle_length_weeks > 1 && !hasWeekOverrides
  const canDisableWeekOverrides = draft.cycle_length_weeks > 1 && hasWeekOverrides
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

  const handleWeekLabelChange = (weekNumber: number, label: string) => {
    patchDraft(updateProgramWeekLabel(draft, weekNumber, label))
    clearStepError()
  }

  const enableWeekOverrides = () => {
    patchDraft(materializeProgramWeekSpecificDays({
      ...draft,
      days_per_week: draft.days_per_week,
    }))
    clearStepError()
  }

  const disableWeekOverrides = () => {
    patchDraft(collapseProgramWeekSpecificDays({
      ...draft,
      days_per_week: draft.days_per_week,
    }))
    clearStepError()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Name each training day so the rest of the build stays easy to scan.
        </p>

        {canEnableWeekOverrides ? (
          <div className="rounded-[24px] border border-border/70 bg-card/70 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Weekly overrides are available</p>
                  <Badge variant="outline" className="text-xs">
                    {draft.cycle_length_weeks} weeks
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Right now the same {draft.days_per_week}-day structure repeats every week. Enable overrides if this cycle changes by week, like 5/3/1 waves or Sheiko-style session swaps.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={enableWeekOverrides} className="sm:self-center">
                Customize Weeks
              </Button>
            </div>
          </div>
        ) : null}

        {hasWeekOverrides ? (
          <div className="rounded-[24px] border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Weekly overrides are on</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Each week now carries its own day labels and exercise edits. The exercise step will move through the full cycle week by week.
                </p>
              </div>
              {canDisableWeekOverrides ? (
                <Button type="button" variant="ghost" onClick={disableWeekOverrides} className="sm:self-center">
                  Use Shared Week Layout
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {editableDaySlots.map((slot, slotIndex) => (
          <div key={`${slot.weekNumber}-${slot.dayIndex}-${slotIndex}`} className="flex flex-col gap-3">
            {showWeekHeaders && (slot.dayIndex === 0 || editableDaySlots[slotIndex - 1]?.weekNumber !== slot.weekNumber) ? (
              <div className="rounded-[20px] border border-border/60 bg-background/65 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Week {slot.weekNumber}
                  </span>
                </div>
                {hasWeekOverrides ? (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <Label htmlFor={`week-label-${slot.weekNumber}`} className="text-xs text-muted-foreground">
                      Week Label
                    </Label>
                    <Input
                      id={`week-label-${slot.weekNumber}`}
                      value={slot.weekLabel}
                      onChange={(event) => handleWeekLabelChange(slot.weekNumber, event.target.value)}
                    />
                  </div>
                ) : (
                  <span className="mt-1 block text-sm font-medium text-foreground">{slot.weekLabel}</span>
                )}
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

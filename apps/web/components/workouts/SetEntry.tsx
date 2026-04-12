'use client'

import { useState } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { displayToLbs, formatUnit, formatWeight, lbsToDisplay } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SetEntryProps {
  allowZeroWeight?: boolean
  defaultReps?: number | null
  defaultWeightLbs: number
  isPending?: boolean
  onCancel: () => void
  onSubmit: (values: { reps: number; weightLbs: number }) => void
  suggestedWeightLbs: number
}

function parseLoggedReps(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseLoggedWeight(value: string, allowZeroWeight: boolean) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  if (allowZeroWeight) {
    return parsed >= 0 ? parsed : null
  }

  return parsed > 0 ? parsed : null
}

export function SetEntry({
  allowZeroWeight = false,
  defaultReps,
  defaultWeightLbs,
  isPending,
  onCancel,
  onSubmit,
  suggestedWeightLbs,
}: SetEntryProps) {
  const preferredUnit = usePreferredUnit()
  const [weightValue, setWeightValue] = useState(() => String(lbsToDisplay(defaultWeightLbs, preferredUnit)))
  const [repsValue, setRepsValue] = useState(() => String(defaultReps ?? ''))

  const enteredWeight = parseLoggedWeight(weightValue, allowZeroWeight)
  const enteredReps = parseLoggedReps(repsValue)
  const weightLbs = enteredWeight !== null ? displayToLbs(enteredWeight, preferredUnit) : null

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-border/70 bg-background/55 p-3 animate-fade-in motion-reduce:animate-none">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="set-entry-weight">Load ({formatUnit(preferredUnit)})</Label>
          <Input
            id="set-entry-weight"
            type="number"
            min={allowZeroWeight ? 0 : 0.5}
            step={preferredUnit === 'kg' ? '0.5' : '2.5'}
            inputMode="decimal"
            value={weightValue}
            onChange={(event) => setWeightValue(event.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="set-entry-reps">Reps achieved</Label>
          <Input
            id="set-entry-reps"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={repsValue}
            onChange={(event) => setRepsValue(event.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Suggested load: <span className="font-medium text-foreground">{formatWeight(suggestedWeightLbs, preferredUnit)}</span>
      </p>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={isPending || enteredReps === null || weightLbs === null}
          onClick={() => {
            if (enteredReps === null || weightLbs === null) {
              return
            }

            onSubmit({ reps: enteredReps, weightLbs })
          }}
        >
          {isPending ? 'Saving…' : 'Save set'}
        </Button>
      </div>
    </div>
  )
}

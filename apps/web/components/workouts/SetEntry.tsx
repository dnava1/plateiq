'use client'

import { useState } from 'react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import {
  MAX_RIR,
  MAX_RPE,
  MIN_RIR,
  MIN_RPE,
  convertRpeToRir,
  formatEffortValue,
  formatTargetEffort,
  normalizeEffortToRpe,
  type EffortInputMode,
} from '@/lib/effort'
import { displayToLbs, formatUnit, formatWeight, lbsToDisplay, roundWeightForDisplay } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { estimateOneRepMax } from './types'

interface SetEntryProps {
  allowZeroWeight?: boolean
  defaultActualRpe?: number | null
  defaultReps?: number | null
  defaultWeightLbs: number
  isPending?: boolean
  onCancel: () => void
  onSubmit: (values: { actualRpe: number | null; reps: number; weightLbs: number }) => void
  prescribedRpe?: number | null
  showEstimatedOneRepMax?: boolean
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

function parseLoggedEffort(value: string, mode: EffortInputMode) {
  if (!value.trim()) {
    return null
  }

  return normalizeEffortToRpe(Number(value), mode)
}

export function SetEntry({
  allowZeroWeight = false,
  defaultActualRpe = null,
  defaultReps,
  defaultWeightLbs,
  isPending,
  onCancel,
  onSubmit,
  prescribedRpe = null,
  showEstimatedOneRepMax = false,
}: SetEntryProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const [weightValue, setWeightValue] = useState(() => String(lbsToDisplay(roundWeightForDisplay(defaultWeightLbs, weightRoundingLbs), preferredUnit)))
  const [repsValue, setRepsValue] = useState(() => String(defaultReps ?? ''))
  const [effortMode, setEffortMode] = useState<EffortInputMode>('rpe')
  const [effortValue, setEffortValue] = useState(() =>
    defaultActualRpe !== null ? formatEffortValue(defaultActualRpe) : '',
  )

  const enteredWeight = parseLoggedWeight(weightValue, allowZeroWeight)
  const enteredReps = parseLoggedReps(repsValue)
  const weightLbs = enteredWeight !== null ? displayToLbs(enteredWeight, preferredUnit) : null
  const hasEffortInput = effortValue.trim().length > 0
  const actualRpe = parseLoggedEffort(effortValue, effortMode)
  const estimatedOneRepMax = showEstimatedOneRepMax && enteredReps !== null && weightLbs !== null
    ? estimateOneRepMax(weightLbs, enteredReps)
    : null

  const handleEffortModeChange = (value: string[]) => {
    const nextMode = value[0]
    if (nextMode !== 'rpe' && nextMode !== 'rir') {
      return
    }

    if (nextMode === effortMode) {
      return
    }

    const normalizedCurrentRpe = parseLoggedEffort(effortValue, effortMode)

    setEffortMode(nextMode)
    if (normalizedCurrentRpe === null) {
      setEffortValue('')
      return
    }

    setEffortValue(
      nextMode === 'rpe'
        ? formatEffortValue(normalizedCurrentRpe)
        : formatEffortValue(convertRpeToRir(normalizedCurrentRpe)),
    )
  }

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

      <div className="flex flex-col gap-2 rounded-[18px] border border-border/60 bg-background/65 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="set-entry-effort">Actual effort</Label>
          {prescribedRpe !== null ? (
            <p className="text-xs text-muted-foreground">{formatTargetEffort(prescribedRpe)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Optional</p>
          )}
        </div>

        <ToggleGroup
          value={[effortMode]}
          role="radiogroup"
          aria-label="Effort input mode"
          onValueChange={handleEffortModeChange}
          variant="outline"
          spacing={2}
          className="w-full"
        >
          <ToggleGroupItem value="rpe" role="radio" aria-checked={effortMode === 'rpe'} className="flex-1 justify-center">
            RPE
          </ToggleGroupItem>
          <ToggleGroupItem value="rir" role="radio" aria-checked={effortMode === 'rir'} className="flex-1 justify-center">
            RIR
          </ToggleGroupItem>
        </ToggleGroup>

        <Input
          id="set-entry-effort"
          type="number"
          min={effortMode === 'rpe' ? MIN_RPE : MIN_RIR}
          max={effortMode === 'rpe' ? MAX_RPE : MAX_RIR}
          step="0.5"
          inputMode="decimal"
          placeholder={effortMode === 'rpe' ? '7.5' : '2'}
          value={effortValue}
          onChange={(event) => setEffortValue(event.target.value)}
          className="h-9 text-sm"
        />

        <p className="text-xs text-muted-foreground">
          {hasEffortInput && actualRpe === null
            ? effortMode === 'rpe'
              ? 'Enter an RPE between 1 and 10.'
              : 'Enter an RIR between 0 and 9.'
            : 'Leave this blank when effort capture is not useful for the set.'}
        </p>
      </div>

      {estimatedOneRepMax ? (
        <p className="text-sm text-muted-foreground">
          Estimated 1RM: <span className="font-medium text-foreground">{formatWeight(estimatedOneRepMax, preferredUnit, weightRoundingLbs)}</span>
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={isPending || enteredReps === null || weightLbs === null || (hasEffortInput && actualRpe === null)}
          onClick={() => {
            if (enteredReps === null || weightLbs === null || (hasEffortInput && actualRpe === null)) {
              return
            }

            onSubmit({ actualRpe, reps: enteredReps, weightLbs })
          }}
        >
          {isPending ? 'Saving…' : 'Save set'}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatWeight } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { estimateOneRepMax } from './types'

interface AmrapEntryProps {
  defaultValue?: number | null
  isPending?: boolean
  onCancel: () => void
  onSubmit: (reps: number) => void
  prescribedReps: number
  weightLbs: number
}

function parsePositiveWholeNumber(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function AmrapEntry({
  defaultValue,
  isPending,
  onCancel,
  onSubmit,
  prescribedReps,
  weightLbs,
}: AmrapEntryProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const [value, setValue] = useState(() => String(defaultValue ?? prescribedReps))

  const reps = parsePositiveWholeNumber(value)
  const estimatedOneRepMax = reps !== null
    ? estimateOneRepMax(weightLbs, reps)
    : null

  const handleSubmit = () => {
    if (reps === null) {
      return
    }

    onSubmit(reps)
  }

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-border/70 bg-background/55 p-3 animate-fade-in motion-reduce:animate-none">
      <div className="flex flex-col gap-2">
        <Label htmlFor="amrap-reps">Reps achieved</Label>
        <Input
          id="amrap-reps"
          type="number"
          min={1}
          step={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="numeric"
          className="h-9 text-sm"
        />
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
        <Button type="button" size="sm" className="flex-1" onClick={handleSubmit} disabled={isPending || reps === null}>
          {isPending ? 'Saving…' : 'Save reps'}
        </Button>
      </div>
    </div>
  )
}
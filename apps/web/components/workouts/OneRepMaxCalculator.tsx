'use client'

import { useState } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { displayToLbs, formatUnit, formatWeight } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { estimateOneRepMax } from './types'

function parsePositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parsePositiveWholeNumber(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function OneRepMaxCalculator() {
  const preferredUnit = usePreferredUnit()
  const [weightInput, setWeightInput] = useState('')
  const [repsInput, setRepsInput] = useState('')

  const enteredWeight = parsePositiveNumber(weightInput)
  const enteredReps = parsePositiveWholeNumber(repsInput)
  const weightLbs = enteredWeight !== null ? displayToLbs(enteredWeight, preferredUnit) : null
  const estimatedOneRepMax = weightLbs !== null && enteredReps !== null
    ? estimateOneRepMax(weightLbs, enteredReps)
    : null

  return (
    <Card className="surface-panel">
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">1RM Calculator</CardTitle>
        <CardDescription>
          Enter a completed set and PlateIQ will estimate your current max.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="one-rep-max-weight">Weight ({formatUnit(preferredUnit)})</Label>
            <Input
              id="one-rep-max-weight"
              type="number"
              inputMode="decimal"
              min={0}
              step={preferredUnit === 'kg' ? '0.5' : '2.5'}
              placeholder={preferredUnit === 'kg' ? 'e.g. 100' : 'e.g. 225'}
              value={weightInput}
              onChange={(event) => setWeightInput(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="one-rep-max-reps">Reps</Label>
            <Input
              id="one-rep-max-reps"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="e.g. 5"
              value={repsInput}
              onChange={(event) => setRepsInput(event.target.value)}
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-primary/20 bg-primary/6 p-5">
          <span className="eyebrow">Estimated 1RM</span>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.08em] text-foreground">
            {estimatedOneRepMax !== null ? formatWeight(estimatedOneRepMax, preferredUnit) : 'Enter weight and reps'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {estimatedOneRepMax !== null
              ? 'Based on the work set you entered.'
              : 'Use a completed work set for the best estimate.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
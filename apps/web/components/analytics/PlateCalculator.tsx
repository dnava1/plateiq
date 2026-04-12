'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import {
  buildPlateCalculatorSuggestion,
  calculatePlateBreakdown,
  DEFAULT_BARBELL_WEIGHT_LBS,
  DEFAULT_ROUNDING_LBS,
} from '@/lib/plate-calculator'
import {
  displayToLbs,
  formatRounding,
  formatUnit,
  formatWeight,
  getRoundingOptions,
  lbsToDisplay,
  type RoundingMode,
} from '@/lib/utils'
import type { AnalyticsData } from '@/types/analytics'

interface PlateCalculatorProps {
  analytics: AnalyticsData
  exerciseId?: number | null
  exerciseName?: string | null
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const ROUNDING_MODE_OPTIONS: Array<{ value: RoundingMode; label: string }> = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'down', label: 'Round Down' },
  { value: 'up', label: 'Round Up' },
]

const ROUNDING_MODE_COPY: Record<RoundingMode, string> = {
  nearest: 'Rounding to the nearest loadable target',
  down: 'Rounding down to the next lower loadable target',
  up: 'Rounding up to the next higher loadable target',
}

export function PlateCalculator({ analytics, exerciseId, exerciseName }: PlateCalculatorProps) {
  const preferredUnit = usePreferredUnit()
  const [roundingLbs, setRoundingLbs] = useState(DEFAULT_ROUNDING_LBS)
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('nearest')
  const [targetWeightInput, setTargetWeightInput] = useState('')
  const [barbellWeightInput, setBarbellWeightInput] = useState(() => String(preferredUnit === 'kg' ? 20 : DEFAULT_BARBELL_WEIGHT_LBS))

  const targetWeight = parsePositiveNumber(targetWeightInput)
  const barbellWeight = parsePositiveNumber(barbellWeightInput)
  const targetWeightLbs = targetWeight !== null ? displayToLbs(targetWeight, preferredUnit) : null
  const barbellWeightLbs = barbellWeight !== null ? displayToLbs(barbellWeight, preferredUnit) : null
  const suggestion = useMemo(
    () => buildPlateCalculatorSuggestion(analytics, exerciseId, roundingLbs, roundingMode),
    [analytics, exerciseId, roundingLbs, roundingMode],
  )
  const breakdown = targetWeightLbs !== null && barbellWeightLbs !== null
    ? calculatePlateBreakdown(targetWeightLbs, { barbellWeightLbs, roundingLbs, roundingMode })
    : null
  const suggestionExerciseName = exerciseName ?? suggestion.exerciseName
  const roundingOptions = getRoundingOptions(preferredUnit)

  return (
    <Card className="surface-panel xl:sticky xl:top-24">
      <CardHeader className="gap-2">
        <CardTitle className="text-lg">Plate Calculator</CardTitle>
        <CardDescription>
          Load the bar from a target weight, then save the combination that matches your current working set.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
            <span className="eyebrow">Latest E1RM</span>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.07em] text-foreground">
              {suggestion.latestEstimatedOneRepMaxLbs !== null
                ? formatWeight(suggestion.latestEstimatedOneRepMaxLbs, preferredUnit)
                : 'No estimate yet'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {suggestionExerciseName ?? 'Choose an exercise filter to use exercise-specific context.'}
            </p>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
            <span className="eyebrow">Latest Top Set</span>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.07em] text-foreground">
              {suggestion.latestLoggedWeightLbs !== null
                ? formatWeight(suggestion.latestLoggedWeightLbs, preferredUnit)
                : 'No logged set yet'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pull a recent working weight straight from analytics when you need a quick reference.
            </p>
          </div>
        </div>

        {(suggestion.latestLoggedWeightLbs !== null || suggestion.suggestedWorkingWeightLbs !== null) ? (
          <div className="flex flex-wrap gap-2">
            {suggestion.latestLoggedWeightLbs !== null ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTargetWeightInput(String(lbsToDisplay(suggestion.latestLoggedWeightLbs!, preferredUnit)))}
              >
                Use latest top set
              </Button>
            ) : null}

            {suggestion.suggestedWorkingWeightLbs !== null ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setTargetWeightInput(String(lbsToDisplay(suggestion.suggestedWorkingWeightLbs!, preferredUnit)))}
              >
                Use 70% E1RM
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="plate-target-weight">Target Weight ({formatUnit(preferredUnit)})</Label>
            <Input
              id="plate-target-weight"
              type="number"
              min={0}
              step={preferredUnit === 'kg' ? '0.5' : '2.5'}
              inputMode="decimal"
              value={targetWeightInput}
              onChange={(event) => setTargetWeightInput(event.target.value)}
              placeholder={preferredUnit === 'kg' ? 'e.g. 100' : 'e.g. 225'}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plate-barbell-weight">Bar Weight ({formatUnit(preferredUnit)})</Label>
              <Input
                id="plate-barbell-weight"
                type="number"
                min={0}
                step={preferredUnit === 'kg' ? '0.5' : '2.5'}
                inputMode="decimal"
                value={barbellWeightInput}
                onChange={(event) => setBarbellWeightInput(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="plate-rounding">Rounding</Label>
              <Select value={String(roundingLbs)} onValueChange={(value) => setRoundingLbs(Number(value))}>
                <SelectTrigger id="plate-rounding" className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {roundingOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="plate-rounding-mode">Round Mode</Label>
              <Select
                value={roundingMode}
                onValueChange={(value) => {
                  if (value === 'nearest' || value === 'down' || value === 'up') {
                    setRoundingMode(value)
                  }
                }}
              >
                <SelectTrigger id="plate-rounding-mode" className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ROUNDING_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-primary/20 bg-primary/6 p-4">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Rounded Target</span>
            <p className="text-3xl font-semibold tracking-[-0.08em] text-foreground">
              {breakdown ? formatWeight(breakdown.roundedTargetWeightLbs, preferredUnit) : 'Enter a target weight'}
            </p>
            <p className="text-sm text-muted-foreground">
              {ROUNDING_MODE_COPY[roundingMode]} using {formatRounding(roundingLbs, preferredUnit)} increments.
            </p>
          </div>

          {breakdown ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {breakdown.platesPerSide.length > 0 ? breakdown.platesPerSide.map((entry) => (
                  <Badge key={entry.weightLbs} variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {entry.countPerSide} × {lbsToDisplay(entry.weightLbs, preferredUnit)} {formatUnit(preferredUnit)} / side
                  </Badge>
                )) : (
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">Empty bar only</Badge>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Per Side</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatWeight(breakdown.perSideLoadLbs, preferredUnit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Achieved</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatWeight(breakdown.achievedWeightLbs, preferredUnit)}
                  </p>
                </div>
              </div>

              {breakdown.remainderLbs > 0.01 ? (
                <p className="text-sm text-muted-foreground">
                  Standard plates leave {formatWeight(breakdown.remainderLbs, preferredUnit)} unaccounted for, so the closest loadable setup is shown.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
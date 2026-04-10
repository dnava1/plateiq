'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { setTrainingMaxSchema, type SetTrainingMaxInput } from '@/lib/validations/trainingMax'
import { useSetTrainingMax } from '@/hooks/useTrainingMaxes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { displayToLbs, formatUnit, formatWeight, lbsToDisplay, roundToNearest } from '@/lib/utils'
import { toast } from 'sonner'
import type { PreferredUnit } from '@/types/domain'

interface TrainingMaxFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseId: number
  exerciseName: string
  currentTm?: number
  unit: PreferredUnit
}

export function TrainingMaxForm({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
  currentTm,
  unit,
}: TrainingMaxFormProps) {
  const [inputType, setInputType] = useState<'tm' | '1rm'>('tm')
  const setTrainingMax = useSetTrainingMax()

  const {
    clearErrors,
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SetTrainingMaxInput>({
    resolver: zodResolver(setTrainingMaxSchema),
    defaultValues: {
      exerciseId,
      weightLbs: lbsToDisplay(currentTm ?? 0, unit),
      tmPercentage: 0.90,
    },
  })

  useEffect(() => {
    reset({
      exerciseId,
      weightLbs: lbsToDisplay(currentTm ?? 0, unit),
      tmPercentage: 0.90,
    })
  }, [currentTm, exerciseId, reset, unit])

  const weight = useWatch({ control, name: 'weightLbs' })
  const tmPercentage = useWatch({ control, name: 'tmPercentage' })
  const enteredWeightLbs = displayToLbs(weight || 0, unit)
  const initialDisplayWeight = lbsToDisplay(currentTm ?? 0, unit)
  const calculatedTmLbs = inputType === '1rm' && weight
    ? roundToNearest(enteredWeightLbs * (tmPercentage ?? 0.9), 5)
    : enteredWeightLbs

  const onSubmit = (data: SetTrainingMaxInput) => {
    const weightLbs = displayToLbs(data.weightLbs, unit)
    const unchangedCurrentTm = inputType === 'tm'
      && typeof currentTm === 'number'
      && data.weightLbs === initialDisplayWeight

    const finalWeight = unchangedCurrentTm
      ? currentTm
      : inputType === '1rm'
        ? roundToNearest(weightLbs * (data.tmPercentage ?? 0.9), 5)
        : weightLbs

    if (finalWeight > 2000) {
      setError('weightLbs', {
        type: 'manual',
        message: unit === 'kg'
          ? `Training max cannot exceed ${lbsToDisplay(2000, 'kg')} kg (2000 lbs)`
          : 'Training max cannot exceed 2000 lbs',
      })
      return
    }

    clearErrors('weightLbs')

    setTrainingMax.mutate(
      { ...data, weightLbs: finalWeight },
      {
        onSuccess: () => {
          toast.success(`Training max set to ${formatWeight(finalWeight, unit)}`)
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Training Max — {exerciseName}</DialogTitle>
          <DialogDescription>
            {currentTm
              ? `Current TM: ${formatWeight(currentTm, unit)}`
              : 'No training max set yet'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
          <input type="hidden" {...register('exerciseId', { valueAsNumber: true })} />

          <div className="flex flex-col gap-2">
            <Label>Input Type</Label>
            <ToggleGroup
              value={[inputType]}
              role="radiogroup"
              aria-label="Training max input type"
              onValueChange={(value) => {
                const nextValue = value[0]
                if (nextValue === 'tm' || nextValue === '1rm') {
                  setInputType(nextValue)
                }
              }}
              variant="outline"
              spacing={2}
              className="w-full"
            >
              <ToggleGroupItem value="tm" role="radio" aria-checked={inputType === 'tm'} className="flex-1 justify-center">
                Training Max
              </ToggleGroupItem>
              <ToggleGroupItem value="1rm" role="radio" aria-checked={inputType === '1rm'} className="flex-1 justify-center">
                Estimated 1RM
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="weight">
              {inputType === 'tm'
                ? `Training Max (${formatUnit(unit)})`
                : `Estimated 1RM (${formatUnit(unit)})`}
            </Label>
            <Input
              id="weight"
              type="number"
              step={unit === 'kg' ? '0.5' : '2.5'}
              placeholder={unit === 'kg' ? 'e.g., 100' : 'e.g., 225'}
              aria-invalid={!!errors.weightLbs}
              aria-describedby={errors.weightLbs ? 'training-max-weight-error' : undefined}
              {...register('weightLbs', { valueAsNumber: true })}
            />
            {errors.weightLbs && (
              <p id="training-max-weight-error" className="text-sm text-destructive">{errors.weightLbs.message}</p>
            )}
          </div>

          {inputType === '1rm' && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tmPercentage">TM Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tmPercentage"
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="1.0"
                    className="w-24"
                    {...register('tmPercentage', { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">
                    ({Math.round((tmPercentage ?? 0.9) * 100)}%)
                  </span>
                </div>
              </div>
              {weight > 0 && (
                <Card className="border-border/70 bg-card/70">
                  <CardContent className="flex flex-col gap-1.5 pt-4">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Calculated TM:</span>{' '}
                      <span className="font-bold text-foreground">{formatWeight(calculatedTmLbs, unit)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {weight} {formatUnit(unit)} × {Math.round((tmPercentage ?? 0.9) * 100)}% = {formatWeight(calculatedTmLbs, unit)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={setTrainingMax.isPending}
          >
            {setTrainingMax.isPending ? 'Saving...' : 'Save Training Max'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

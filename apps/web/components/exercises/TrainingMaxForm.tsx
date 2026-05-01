'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { useSetTrainingMax } from '@/hooks/useTrainingMaxes'
import type { ExecutionMaxInputMode } from '@/lib/programs/trainingMax'
import {
  resolveTrainingMaxPercentageRatio,
  setTrainingMaxSchema,
  type SetTrainingMaxInput,
} from '@/lib/validations/trainingMax'
import { displayToLbs, formatUnit, formatWeight, lbsToDisplay, roundToIncrement } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toast } from 'sonner'
import type { PreferredUnit } from '@/types/domain'

interface TrainingMaxFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseId: number
  exerciseName: string
  currentTm?: number
  mode?: ExecutionMaxInputMode
  unit: PreferredUnit
}

type ResolveTrainingMaxWeightParams = {
  currentTm?: number
  initialDisplayWeight: number
  inputType: 'tm' | '1rm'
  submittedDisplayWeight: number
  submittedWeightLbs: number
  tmPercentage?: number
  weightRoundingLbs: number
}

function resolveDialogCopy(mode: ExecutionMaxInputMode) {
  switch (mode) {
    case '1rm':
      return {
        currentValueLabel: 'Current saved max',
        defaultInputType: '1rm' as const,
        saveButtonLabel: 'Save 1RM',
        title: 'Set 1RM',
      }
    case 'mixed':
      return {
        currentValueLabel: 'Current saved max',
        defaultInputType: 'tm' as const,
        saveButtonLabel: 'Save Max',
        title: 'Set Max',
      }
    default:
      return {
        currentValueLabel: 'Current TM',
        defaultInputType: 'tm' as const,
        saveButtonLabel: 'Save Training Max',
        title: 'Set Training Max',
      }
  }
}

export function resolveTrainingMaxWeightLbs({
  currentTm,
  initialDisplayWeight,
  inputType,
  submittedDisplayWeight,
  submittedWeightLbs,
  tmPercentage,
  weightRoundingLbs,
}: ResolveTrainingMaxWeightParams) {
  const roundTrainingMaxLbs = (valueLbs: number) => roundToIncrement(valueLbs, weightRoundingLbs, 'down')
  const unchangedCurrentTm = inputType === 'tm'
    && typeof currentTm === 'number'
    && submittedDisplayWeight === initialDisplayWeight

  if (unchangedCurrentTm) {
    return currentTm
  }

  return inputType === '1rm'
    ? roundTrainingMaxLbs(submittedWeightLbs * (tmPercentage ?? 0.9))
    : roundTrainingMaxLbs(submittedWeightLbs)
}

export function TrainingMaxForm({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
  currentTm,
  mode = 'tm',
  unit,
}: TrainingMaxFormProps) {
  const dialogCopy = resolveDialogCopy(mode)
  const [inputType, setInputType] = useState<'tm' | '1rm'>(() => resolveDialogCopy(mode).defaultInputType)
  const setTrainingMax = useSetTrainingMax()
  const weightRoundingLbs = usePreferredWeightRounding()
  const roundTrainingMaxLbs = (valueLbs: number) => roundToIncrement(valueLbs, weightRoundingLbs, 'down')
  const limitErrorMessage = unit === 'kg'
    ? `Saved max cannot exceed ${lbsToDisplay(2000, 'kg')} kg (2000 lbs)`
    : 'Saved max cannot exceed 2000 lbs'

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
      tmPercentage: 90,
    },
  })

  useEffect(() => {
    reset({
      exerciseId,
      weightLbs: lbsToDisplay(currentTm ?? 0, unit),
      tmPercentage: 90,
    })
  }, [currentTm, exerciseId, reset, unit])

  const weight = useWatch({ control, name: 'weightLbs' })
  const tmPercentage = useWatch({ control, name: 'tmPercentage' })
  const tmPercentageRatio = resolveTrainingMaxPercentageRatio(tmPercentage)
  const tmPercentageLabel = tmPercentageRatio === null ? null : `${Math.round(tmPercentageRatio * 100)}%`
  const enteredWeightLbs = displayToLbs(weight || 0, unit)
  const initialDisplayWeight = lbsToDisplay(currentTm ?? 0, unit)
  const calculatedTmLbs = inputType === '1rm' && weight > 0 && tmPercentageRatio !== null
    ? roundTrainingMaxLbs(enteredWeightLbs * tmPercentageRatio)
    : enteredWeightLbs

  const onSubmit = (data: SetTrainingMaxInput) => {
    const weightLbs = displayToLbs(data.weightLbs, unit)
    const finalWeight = resolveTrainingMaxWeightLbs({
      currentTm,
      initialDisplayWeight,
      inputType,
      submittedDisplayWeight: data.weightLbs,
      submittedWeightLbs: weightLbs,
      tmPercentage: data.tmPercentage,
      weightRoundingLbs,
    })

    if (finalWeight > 2000) {
      setError('weightLbs', {
        type: 'manual',
        message: limitErrorMessage,
      })
      return
    }

    clearErrors('weightLbs')

    setTrainingMax.mutate(
      { ...data, weightLbs: finalWeight },
      {
        onSuccess: () => {
          toast.success(
            mode === 'tm'
              ? `Training max set to ${formatWeight(finalWeight, unit, weightRoundingLbs)}`
              : `${exerciseName} max input saved.`,
          )
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogCopy.title} - {exerciseName}</DialogTitle>
          <DialogDescription>
            {currentTm
              ? `${dialogCopy.currentValueLabel}: ${formatWeight(currentTm, unit, weightRoundingLbs)}`
              : 'No saved max input yet'}
            {' '}
            Choose Training Max or Estimated 1RM below.
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
                    step="1"
                    min="50"
                    max="100"
                    className="w-24"
                    aria-invalid={!!errors.tmPercentage}
                    aria-describedby={errors.tmPercentage ? 'training-max-percentage-error' : undefined}
                    {...register('tmPercentage', { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {tmPercentageLabel ? `(${tmPercentageLabel})` : 'Enter 50-100%'}
                  </span>
                </div>
              </div>
              {errors.tmPercentage && (
                <p id="training-max-percentage-error" className="text-sm text-destructive">{errors.tmPercentage.message}</p>
              )}
              {weight > 0 && tmPercentageRatio !== null && (
                <Card className="border-border/70 bg-card/70">
                  <CardContent className="flex flex-col gap-1.5 pt-4">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Calculated TM:</span>{' '}
                      <span className="font-bold text-foreground">{formatWeight(calculatedTmLbs, unit, weightRoundingLbs)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {weight} {formatUnit(unit)} x {tmPercentageLabel} = {formatWeight(calculatedTmLbs, unit, weightRoundingLbs)}
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
            {setTrainingMax.isPending ? 'Saving...' : dialogCopy.saveButtonLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

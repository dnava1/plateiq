'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { roundToNearest } from '@/lib/utils'
import { toast } from 'sonner'

interface TrainingMaxFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseId: number
  exerciseName: string
  currentTm?: number
}

export function TrainingMaxForm({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
  currentTm,
}: TrainingMaxFormProps) {
  const [inputType, setInputType] = useState<'tm' | '1rm'>('tm')
  const setTrainingMax = useSetTrainingMax()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetTrainingMaxInput>({
    resolver: zodResolver(setTrainingMaxSchema),
    defaultValues: {
      exerciseId,
      weightLbs: currentTm ?? 0,
      tmPercentage: 0.90,
    },
  })

  const weight = watch('weightLbs')
  const tmPercentage = watch('tmPercentage')
  const calculatedTm = inputType === '1rm' && weight
    ? roundToNearest(weight * (tmPercentage ?? 0.9), 5)
    : weight

  const onSubmit = (data: SetTrainingMaxInput) => {
    const finalWeight = inputType === '1rm'
      ? roundToNearest(data.weightLbs * (data.tmPercentage ?? 0.9), 5)
      : data.weightLbs

    setTrainingMax.mutate(
      { ...data, weightLbs: finalWeight },
      {
        onSuccess: () => {
          toast.success(`Training max set to ${finalWeight} lbs`)
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
              ? `Current TM: ${currentTm} lbs`
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
              {inputType === 'tm' ? 'Training Max (lbs)' : 'Estimated 1RM (lbs)'}
            </Label>
            <Input
              id="weight"
              type="number"
              step="2.5"
              placeholder="e.g., 225"
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
                      <span className="font-bold text-foreground">{calculatedTm} lbs</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {weight} × {Math.round((tmPercentage ?? 0.9) * 100)}% = {calculatedTm} lbs (rounded to nearest 5)
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

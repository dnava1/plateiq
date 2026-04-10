'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { setTrainingMaxSchema, type SetTrainingMaxInput } from '@/lib/validations/trainingMax'
import { useSetTrainingMax } from '@/hooks/useTrainingMaxes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Set Training Max — {exerciseName}</SheetTitle>
          <SheetDescription>
            {currentTm
              ? `Current TM: ${currentTm} lbs`
              : 'No training max set yet'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <input type="hidden" {...register('exerciseId', { valueAsNumber: true })} />

          <div className="space-y-2">
            <Label>Input Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={inputType === 'tm' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setInputType('tm')}
              >
                Training Max
              </Button>
              <Button
                type="button"
                variant={inputType === '1rm' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setInputType('1rm')}
              >
                Estimated 1RM
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">
              {inputType === 'tm' ? 'Training Max (lbs)' : 'Estimated 1RM (lbs)'}
            </Label>
            <Input
              id="weight"
              type="number"
              step="2.5"
              placeholder="e.g., 225"
              {...register('weightLbs', { valueAsNumber: true })}
            />
            {errors.weightLbs && (
              <p className="text-sm text-destructive">{errors.weightLbs.message}</p>
            )}
          </div>

          {inputType === '1rm' && (
            <>
              <div className="space-y-2">
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
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Calculated TM:</span>{' '}
                    <span className="font-bold">{calculatedTm} lbs</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {weight} × {Math.round((tmPercentage ?? 0.9) * 100)}% = {calculatedTm} lbs (rounded to nearest 5)
                  </p>
                </div>
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
      </SheetContent>
    </Sheet>
  )
}

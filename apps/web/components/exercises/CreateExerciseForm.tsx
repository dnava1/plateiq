'use client'

import { useEffect } from 'react'
import { useForm, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createExerciseSchema, type CreateExerciseInput } from '@/lib/validations/exercise'
import { useCreateExercise, useUpdateExercise } from '@/hooks/useExercises'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type Exercise = Tables<'exercises'>

interface CreateExerciseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<CreateExerciseInput>
  existingExercise?: Exercise | null
  title?: string
  description?: string
  submitLabel?: string
  onCreated?: (exercise: Exercise) => void
  onUpdated?: (exercise: Exercise) => void
}

const MOVEMENT_PATTERNS = [
  { value: 'horizontal_push', label: 'Horizontal Push' },
  { value: 'vertical_push', label: 'Vertical Push' },
  { value: 'horizontal_pull', label: 'Horizontal Pull' },
  { value: 'vertical_pull', label: 'Vertical Pull' },
  { value: 'hinge', label: 'Hinge' },
  { value: 'squat', label: 'Squat' },
  { value: 'lunge', label: 'Lunge' },
  { value: 'core', label: 'Core' },
  { value: 'other', label: 'Other' },
] as const

const ANALYTICS_TRACK_OPTIONS = [
  {
    value: 'standard',
    label: 'Standard Load-Based Exercise',
    description: 'Use this for exercises that should appear in regular strength and volume analytics, including weighted pull-ups and weighted dips.',
  },
  {
    value: 'bodyweight_review',
    label: 'Bodyweight Exercise Review',
    description: 'Use this for strict bodyweight movements that should be tracked with reps-focused bodyweight review charts.',
  },
] as const

function getDefaultValues(existingExercise?: Exercise | null, initialValues?: Partial<CreateExerciseInput>): CreateExerciseInput {
  return {
    name: initialValues?.name ?? existingExercise?.name ?? '',
    category: initialValues?.category ?? (existingExercise?.category as CreateExerciseInput['category'] | undefined) ?? 'accessory',
    movement_pattern: initialValues?.movement_pattern ?? (existingExercise?.movement_pattern as CreateExerciseInput['movement_pattern'] | undefined) ?? 'other',
    analytics_track: initialValues?.analytics_track ?? (existingExercise?.analytics_track as CreateExerciseInput['analytics_track'] | undefined) ?? 'standard',
  }
}

export function CreateExerciseForm({
  open,
  onOpenChange,
  initialValues,
  existingExercise,
  title,
  description,
  submitLabel,
  onCreated,
  onUpdated,
}: CreateExerciseFormProps) {
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const isEditing = Boolean(existingExercise)
  const resolvedTitle = title ?? (isEditing ? 'Edit Exercise' : 'Add Exercise')
  const resolvedDescription = description ?? (isEditing
    ? 'Update this custom exercise in your shared library.'
    : 'Create a new exercise to use in your programs.')

  const {
    control,
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<CreateExerciseInput>({
    resolver: zodResolver(createExerciseSchema),
    defaultValues: getDefaultValues(existingExercise, initialValues),
  })

  useEffect(() => {
    if (open) {
      reset(getDefaultValues(existingExercise, initialValues))
    }
  }, [existingExercise, initialValues, open, reset])

  const onSubmit = (data: CreateExerciseInput) => {
    const onSuccess = (exercise: Exercise) => {
      toast.success(isEditing ? 'Exercise updated' : onCreated ? 'Exercise created and selected' : 'Exercise created')

      if (isEditing) {
        onUpdated?.(exercise)
      } else {
        onCreated?.(exercise)
      }

      reset(getDefaultValues(existingExercise, initialValues))
      onOpenChange(false)
    }

    const onError = (error: Error) => {
      toast.error(error.message)
    }

    if (existingExercise) {
      updateExercise.mutate({ exerciseId: existingExercise.id, exercise: data }, { onError, onSuccess })
      return
    }

    createExercise.mutate(data, { onError, onSuccess })
  }

  const handleInvalidSubmit = (formErrors: FieldErrors<CreateExerciseInput>) => {
    const firstField = (['name', 'movement_pattern', 'analytics_track'] as const).find((field) => formErrors[field])
    if (firstField) {
      setFocus(firstField)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(getDefaultValues(existingExercise, initialValues))
    }

    onOpenChange(nextOpen)
  }

  const submitButtonLabel = submitLabel ?? (isEditing ? 'Save Exercise' : onCreated ? 'Create and Select Exercise' : 'Create Exercise')
  const isSubmitting = createExercise.isPending || updateExercise.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Exercise Name</Label>
            <Input
              id="name"
              placeholder="e.g., Barbell Row"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'exercise-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="exercise-name-error" className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="analytics_track">Tracked As</Label>
            <Controller
              control={control}
              name="analytics_track"
              render={({ field }) => {
                const selectedTrack = ANALYTICS_TRACK_OPTIONS.find((option) => option.value === field.value)

                return (
                  <>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={ANALYTICS_TRACK_OPTIONS}
                    >
                      <SelectTrigger
                        id="analytics_track"
                        className="w-full h-9"
                        aria-invalid={!!errors.analytics_track}
                        aria-describedby={errors.analytics_track ? 'exercise-analytics-track-error' : 'exercise-analytics-track-help'}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ANALYTICS_TRACK_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {errors.analytics_track ? (
                      <p id="exercise-analytics-track-error" className="text-sm text-destructive">{errors.analytics_track.message}</p>
                    ) : (
                      <p id="exercise-analytics-track-help" className="text-xs leading-5 text-muted-foreground">
                        {selectedTrack?.description}
                      </p>
                    )}
                  </>
                )
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="movement_pattern">Movement Pattern</Label>
            <Controller
              control={control}
              name="movement_pattern"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={MOVEMENT_PATTERNS}
                >
                  <SelectTrigger
                    id="movement_pattern"
                    className="w-full h-9"
                    aria-invalid={!!errors.movement_pattern}
                    aria-describedby={errors.movement_pattern ? 'exercise-pattern-error' : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {MOVEMENT_PATTERNS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.movement_pattern && (
              <p id="exercise-pattern-error" className="text-sm text-destructive">{errors.movement_pattern.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (isEditing ? 'Saving…' : 'Creating…') : submitButtonLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

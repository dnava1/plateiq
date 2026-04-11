'use client'

import { useEffect } from 'react'
import { useForm, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createExerciseSchema, type CreateExerciseInput } from '@/lib/validations/exercise'
import { useCreateExercise } from '@/hooks/useExercises'
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
  title?: string
  description?: string
  submitLabel?: string
  onCreated?: (exercise: Exercise) => void
}

const CATEGORY_OPTIONS = [
  { value: 'main', label: 'Main Lift' },
  { value: 'accessory', label: 'Accessory' },
] as const

const MOVEMENT_PATTERNS = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'hinge', label: 'Hinge' },
  { value: 'squat', label: 'Squat' },
  { value: 'single_leg', label: 'Single Leg' },
  { value: 'core', label: 'Core' },
  { value: 'other', label: 'Other' },
] as const

function getDefaultValues(initialValues?: Partial<CreateExerciseInput>): CreateExerciseInput {
  return {
    name: initialValues?.name ?? '',
    category: initialValues?.category ?? 'accessory',
    movement_pattern: initialValues?.movement_pattern ?? 'other',
  }
}

export function CreateExerciseForm({
  open,
  onOpenChange,
  initialValues,
  title = 'Add Custom Exercise',
  description = 'Create a new exercise to use in your programs.',
  submitLabel,
  onCreated,
}: CreateExerciseFormProps) {
  const createExercise = useCreateExercise()

  const {
    control,
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<CreateExerciseInput>({
    resolver: zodResolver(createExerciseSchema),
    defaultValues: getDefaultValues(initialValues),
  })

  useEffect(() => {
    if (open) {
      reset(getDefaultValues(initialValues))
    }
  }, [initialValues, open, reset])

  const onSubmit = (data: CreateExerciseInput) => {
    createExercise.mutate(data, {
      onSuccess: (exercise) => {
        toast.success(onCreated ? 'Exercise created and selected' : 'Exercise created')
        onCreated?.(exercise)
        reset(getDefaultValues(initialValues))
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const handleInvalidSubmit = (formErrors: FieldErrors<CreateExerciseInput>) => {
    const firstField = (['name', 'category', 'movement_pattern'] as const).find((field) => formErrors[field])
    if (firstField) {
      setFocus(firstField)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(getDefaultValues(initialValues))
    }

    onOpenChange(nextOpen)
  }

  const submitButtonLabel = submitLabel ?? (onCreated ? 'Create and Select Exercise' : 'Create Exercise')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
            <Label htmlFor="category">Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={CATEGORY_OPTIONS}
                >
                  <SelectTrigger
                    id="category"
                    className="w-full h-9"
                    aria-invalid={!!errors.category}
                    aria-describedby={errors.category ? 'exercise-category-error' : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p id="exercise-category-error" className="text-sm text-destructive">{errors.category.message}</p>
            )}
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
            disabled={createExercise.isPending}
          >
            {createExercise.isPending ? 'Creating…' : submitButtonLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

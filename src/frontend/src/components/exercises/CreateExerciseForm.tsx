'use client'

import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createExerciseSchema, type CreateExerciseInput } from '@/lib/validations/exercise'
import { useCreateExercise } from '@/hooks/useExercises'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface CreateExerciseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MOVEMENT_PATTERNS = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'hinge', label: 'Hinge' },
  { value: 'squat', label: 'Squat' },
  { value: 'single_leg', label: 'Single Leg' },
  { value: 'core', label: 'Core' },
  { value: 'other', label: 'Other' },
] as const

export function CreateExerciseForm({ open, onOpenChange }: CreateExerciseFormProps) {
  const createExercise = useCreateExercise()

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<CreateExerciseInput>({
    resolver: zodResolver(createExerciseSchema),
    defaultValues: {
      category: 'accessory',
      movement_pattern: 'other',
    },
  })

  const onSubmit = (data: CreateExerciseInput) => {
    createExercise.mutate(data, {
      onSuccess: () => {
        toast.success('Exercise created')
        reset()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Exercise</DialogTitle>
          <DialogDescription>
            Create a new exercise to use in your programs.
          </DialogDescription>
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
            <NativeSelect
              id="category"
              className="h-9"
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'exercise-category-error' : undefined}
              {...register('category')}
            >
              <option value="main">Main Lift</option>
              <option value="accessory">Accessory</option>
            </NativeSelect>
            {errors.category && (
              <p id="exercise-category-error" className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="movement_pattern">Movement Pattern</Label>
            <NativeSelect
              id="movement_pattern"
              className="h-9"
              aria-invalid={!!errors.movement_pattern}
              aria-describedby={errors.movement_pattern ? 'exercise-pattern-error' : undefined}
              {...register('movement_pattern')}
            >
              {MOVEMENT_PATTERNS.map((mp) => (
                <option key={mp.value} value={mp.value}>
                  {mp.label}
                </option>
              ))}
            </NativeSelect>
            {errors.movement_pattern && (
              <p id="exercise-pattern-error" className="text-sm text-destructive">{errors.movement_pattern.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createExercise.isPending}
          >
            {createExercise.isPending ? 'Creating...' : 'Create Exercise'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createExerciseSchema, type CreateExerciseInput } from '@/lib/validations/exercise'
import { useCreateExercise } from '@/hooks/useExercises'
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Custom Exercise</SheetTitle>
          <SheetDescription>
            Create a new exercise to use in your programs.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Exercise Name</Label>
            <Input
              id="name"
              placeholder="e.g., Barbell Row"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('category')}
            >
              <option value="main">Main Lift</option>
              <option value="accessory">Accessory</option>
            </select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement_pattern">Movement Pattern</Label>
            <select
              id="movement_pattern"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('movement_pattern')}
            >
              {MOVEMENT_PATTERNS.map((mp) => (
                <option key={mp.value} value={mp.value}>
                  {mp.label}
                </option>
              ))}
            </select>
            {errors.movement_pattern && (
              <p className="text-sm text-destructive">{errors.movement_pattern.message}</p>
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
      </SheetContent>
    </Sheet>
  )
}

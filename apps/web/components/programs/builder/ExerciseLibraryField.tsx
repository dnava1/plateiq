'use client'

import { useEffect, useId, useState } from 'react'
import { matchesExerciseSearch, resolveExerciseFromList, useExercises } from '@/hooks/useExercises'
import { cn } from '@/lib/utils'
import { CreateExerciseForm } from '@/components/exercises/CreateExerciseForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckIcon, Pencil, PlusIcon, Search, SearchX } from 'lucide-react'
import type { Tables } from '@/types/database'
import type { MovementPattern } from '@/types/domain'
import { formatMovementPattern } from '@/components/charts/chart-utils'

type Exercise = Tables<'exercises'>

interface ExerciseSelection {
  exerciseId?: number
  exerciseName?: string
}

const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  horizontal_push: 'Horizontal push',
  vertical_push: 'Vertical push',
  horizontal_pull: 'Horizontal pull',
  vertical_pull: 'Vertical pull',
  hinge: 'Hinge',
  squat: 'Squat',
  lunge: 'Lunge',
  core: 'Core',
  other: 'Other',
}

interface ExerciseLibraryFieldProps {
  selectedExerciseId?: number
  value?: string
  onSelect: (selection: ExerciseSelection) => void
}

export function ExerciseLibraryField({
  selectedExerciseId,
  value,
  onSelect,
}: ExerciseLibraryFieldProps) {
  const fieldId = useId()
  const { data: exercises = [], isLoading } = useExercises()
  const [query, setQuery] = useState(value ?? '')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const normalizedValue = value?.trim().toLowerCase() ?? ''
  const selectedExercise = resolveExerciseFromList(exercises, {
    exerciseId: selectedExerciseId,
    exerciseKey: value,
  })
  const queryResolvedExercise = resolveExerciseFromList(exercises, { exerciseKey: query })
  const displayedQuery = selectedExercise && (
    normalizedQuery.length === 0
    || normalizedQuery === normalizedValue
    || queryResolvedExercise?.id === selectedExercise.id
  )
    ? selectedExercise.name
    : query

  useEffect(() => {
    if (!value || typeof selectedExerciseId === 'number' || !selectedExercise) {
      return
    }

    onSelect({ exerciseId: selectedExercise.id, exerciseName: selectedExercise.name })
  }, [onSelect, selectedExercise, selectedExerciseId, value])

  const filteredExercises = exercises
    .filter((exercise) => matchesExerciseSearch(exercise, query))

  const handleSelect = (exercise: Exercise) => {
    onSelect({ exerciseId: exercise.id, exerciseName: exercise.name })
    setQuery(exercise.name)
  }

  const handleClearSelection = () => {
    onSelect({})
    setQuery('')
  }

  const handleToggleSelection = (exercise: Exercise) => {
    if (selectedExercise?.id === exercise.id) {
      handleClearSelection()
      return
    }

    handleSelect(exercise)
  }

  const handleEditSaved = (exercise: Exercise) => {
    handleSelect(exercise)
    setEditingExercise(null)
  }

  const handleQueryChange = (nextQuery: string) => {
    const normalizedSelectedName = (selectedExercise?.name ?? value ?? '').trim().toLowerCase()

    if (normalizedSelectedName.length > 0 && nextQuery.trim().toLowerCase() !== normalizedSelectedName) {
      onSelect({})
    }

    setQuery(nextQuery)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${fieldId}-search`}>Exercise</Label>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${fieldId}-search`}
          value={displayedQuery}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Search your exercise library"
          aria-describedby={`${fieldId}-help`}
          className="pl-9"
        />
      </div>

      <p id={`${fieldId}-help`} className="text-xs leading-5 text-muted-foreground">
        Search your existing exercise library, or create a new custom exercise and add it to this block immediately.
      </p>

      <div className="rounded-[20px] border border-border/70 bg-background/60 p-2">
        {isLoading ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">Loading exercises…</p>
        ) : filteredExercises.length > 0 ? (
          <div aria-label="Exercise search results" className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {filteredExercises.map((exercise) => {
              const isSelected = selectedExercise?.id === exercise.id
              const movementLabel = MOVEMENT_PATTERN_LABELS[exercise.movement_pattern as MovementPattern] ?? formatMovementPattern(exercise.movement_pattern)
              return (
                <div
                  key={exercise.id}
                  className={cn(
                    'group relative flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border/80 hover:bg-muted/55 has-focus-visible:border-foreground/20 has-focus-visible:ring-2 has-focus-visible:ring-foreground/10',
                    isSelected && 'border-border bg-muted/70 shadow-sm',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSelection(exercise)}
                    aria-label={`${isSelected ? 'Unselect' : 'Choose'} ${exercise.name} ${exercise.created_by_user_id ? 'custom exercise' : 'system exercise'} ${movementLabel}`}
                    aria-pressed={isSelected}
                    className="absolute inset-0 rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:outline-none"
                  />

                  <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="min-w-0 truncate text-sm font-semibold leading-5 text-foreground">
                      {exercise.name}
                    </span>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <Badge
                        variant={exercise.created_by_user_id ? 'secondary' : 'outline'}
                        className={cn(
                          'rounded-full px-2 py-0 text-[0.68rem] leading-5',
                          !exercise.created_by_user_id && 'bg-background/70',
                        )}
                      >
                        {exercise.created_by_user_id ? 'Custom' : 'System'}
                      </Badge>
                      <Badge variant="outline" className="rounded-full bg-background/70 px-2 py-0 text-[0.68rem] leading-5 capitalize">
                        {movementLabel}
                      </Badge>
                    </div>
                  </div>

                  <div className="pointer-events-none relative z-10 flex shrink-0 items-center gap-2">
                    {exercise.created_by_user_id ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="pointer-events-auto h-8 px-2 text-muted-foreground"
                        aria-label={`Edit ${exercise.name}`}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setEditingExercise(exercise)
                        }}
                      >
                        <Pencil data-icon="inline-start" />
                        Edit
                      </Button>
                    ) : null}

                    <span
                      className={cn(
                        'pointer-events-none flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                        isSelected
                          ? 'border-border bg-background/80 text-primary'
                          : 'border-transparent text-muted-foreground/50 group-hover:border-border group-hover:bg-background/60',
                      )}
                    >
                      {isSelected ? <CheckIcon className="text-primary" /> : null}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 px-3 py-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <SearchX className="text-muted-foreground" />
              <span className="font-medium">No matching exercise found</span>
            </div>
            <p className="leading-6">
              Create a custom exercise to save it to your shared library and select it for this block.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] border border-dashed border-border/80 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Need a custom movement?</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Add it once here and it will show up across the exercise library and future program builds.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <PlusIcon data-icon="inline-start" />
          Create Exercise
        </Button>
      </div>

      <CreateExerciseForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValues={{
          name: query.trim(),
          analytics_track: 'standard',
          category: 'accessory',
          movement_pattern: 'other',
        }}
        title="Create and Add Exercise"
        description="Add a custom exercise to your shared library and select it for this program block immediately."
        submitLabel="Create and Select Exercise"
        onCreated={handleSelect}
      />

      <CreateExerciseForm
        open={Boolean(editingExercise)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingExercise(null)
          }
        }}
        existingExercise={editingExercise}
        title="Edit Exercise"
        description="Update your custom exercise and keep using it in this program block."
        submitLabel="Save Exercise"
        onUpdated={handleEditSaved}
      />
    </div>
  )
}

'use client'

import { useId, useState } from 'react'
import { useExercises } from '@/hooks/useExercises'
import { cn } from '@/lib/utils'
import { CreateExerciseForm } from '@/components/exercises/CreateExerciseForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckIcon, PlusIcon, Search, SearchX } from 'lucide-react'
import type { Tables } from '@/types/database'
import type { ExerciseCategory, MovementPattern } from '@/types/domain'

type Exercise = Tables<'exercises'>

interface ExerciseSelection {
  exerciseId?: number
  exerciseName?: string
}

const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  push: 'Push',
  pull: 'Pull',
  hinge: 'Hinge',
  squat: 'Squat',
  single_leg: 'Single leg',
  core: 'Core',
  other: 'Other',
}

interface ExerciseLibraryFieldProps {
  selectedExerciseId?: number
  value?: string
  defaultCategory?: ExerciseCategory
  onSelect: (selection: ExerciseSelection) => void
}

export function ExerciseLibraryField({
  selectedExerciseId,
  value,
  defaultCategory = 'accessory',
  onSelect,
}: ExerciseLibraryFieldProps) {
  const fieldId = useId()
  const { data: exercises = [], isLoading } = useExercises()
  const [query, setQuery] = useState(value ?? '')
  const [createOpen, setCreateOpen] = useState(false)

  const normalizedQuery = query.trim().toLowerCase()
  const normalizedValue = (value ?? '').trim().toLowerCase()
  const selectedExercise = typeof selectedExerciseId === 'number'
    ? exercises.find((exercise) => exercise.id === selectedExerciseId)
      ?? exercises.find((exercise) => exercise.name.toLowerCase() === normalizedValue)
    : exercises.find((exercise) => exercise.name.toLowerCase() === normalizedValue)
  const filteredExercises = exercises
    .filter((exercise) => {
      if (normalizedQuery.length === 0) {
        return true
      }

      return exercise.name.toLowerCase().includes(normalizedQuery)
    })
    .slice(0, 8)

  const handleSelect = (exercise: Exercise) => {
    onSelect({ exerciseId: exercise.id, exerciseName: exercise.name })
    setQuery(exercise.name)
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
        {selectedExercise && (
          <Badge variant="outline" className="rounded-full px-2.5">
            Selected
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${fieldId}-search`}
          value={query}
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
          <div role="listbox" aria-label="Exercise search results" className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {filteredExercises.map((exercise) => {
              const isSelected = selectedExercise?.id === exercise.id
              const movementLabel = MOVEMENT_PATTERN_LABELS[exercise.movement_pattern as MovementPattern] ?? exercise.movement_pattern
              return (
                <button
                  key={exercise.id}
                  type="button"
                  role="option"
                  aria-label={`${exercise.name} ${exercise.is_main_lift ? 'main lift' : 'accessory'} ${movementLabel}`}
                  aria-selected={isSelected}
                  onClick={() => handleSelect(exercise)}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    isSelected && 'bg-primary/6 ring-1 ring-primary/20',
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{exercise.name}</span>
                      <Badge variant={exercise.is_main_lift ? 'default' : 'secondary'}>
                        {exercise.is_main_lift ? 'Main lift' : 'Accessory'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {movementLabel}
                      </Badge>
                    </div>
                  </div>

                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    {isSelected ? <CheckIcon className="text-primary" /> : null}
                  </span>
                </button>
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
          category: defaultCategory,
          movement_pattern: 'other',
        }}
        title="Create and Add Exercise"
        description="Add a custom exercise to your shared library and select it for this program block immediately."
        submitLabel="Create and Select Exercise"
        onCreated={handleSelect}
      />
    </div>
  )
}
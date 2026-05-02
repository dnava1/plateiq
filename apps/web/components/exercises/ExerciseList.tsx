'use client'

import { useId, useState } from 'react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { CreateExerciseForm } from './CreateExerciseForm'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Pencil, Search, SearchX } from 'lucide-react'
import { formatMovementPattern } from '@/components/charts/chart-utils'
import { formatWeight } from '@/lib/utils'
import type { Tables } from '@/types/database'
import type { PreferredUnit } from '@/types/domain'

type Exercise = Tables<'exercises'>

interface ExerciseListProps {
  exercises: Exercise[]
  trainingMaxes?: Map<number, number>
  unit: PreferredUnit
  onSetTm?: (exercise: Exercise) => void
}

export function ExerciseList({ exercises, trainingMaxes, unit, onSetTm }: ExerciseListProps) {
  const [search, setSearch] = useState('')
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const searchFieldId = useId()
  const weightRoundingLbs = usePreferredWeightRounding()

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md">
          <Label htmlFor={searchFieldId} className="sr-only">Search exercises</Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={searchFieldId}
            type="search"
            placeholder="Filter by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Empty className="border-border/70 bg-card/60 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No exercises found</EmptyTitle>
                <EmptyDescription>
                  Try a different search or add a new exercise to your library.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {filtered.map((exercise) => {
            const trainingMax = trainingMaxes?.get(exercise.id)
            const hasTrainingMax = typeof trainingMax === 'number'
            const canSetTrainingMax = exercise.is_main_lift || hasTrainingMax

            return (
              <Card
                key={exercise.id}
                size="sm"
                className="border-border/70 bg-card/78"
              >
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{exercise.name}</span>
                      <Badge variant={exercise.created_by_user_id ? 'secondary' : 'outline'}>
                        {exercise.created_by_user_id ? 'Custom' : 'System'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {formatMovementPattern(exercise.movement_pattern)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {hasTrainingMax && (
                      <Badge variant="secondary">TM {formatWeight(trainingMax, unit, weightRoundingLbs)}</Badge>
                    )}
                    {exercise.created_by_user_id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${exercise.name}`}
                        onClick={() => setEditingExercise(exercise)}
                      >
                        <Pencil data-icon="inline-start" />
                        Edit
                      </Button>
                    ) : null}
                    {canSetTrainingMax && onSetTm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSetTm(exercise)}
                      >
                        {hasTrainingMax ? 'Update TM' : 'Set TM'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <CreateExerciseForm
        open={Boolean(editingExercise)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingExercise(null)
          }
        }}
        existingExercise={editingExercise}
        title="Edit Exercise"
        description="Update your custom exercise in the shared library."
        submitLabel="Save Exercise"
        onUpdated={() => setEditingExercise(null)}
      />
    </>
  )
}

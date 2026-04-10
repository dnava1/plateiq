'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Tables } from '@/types/database'

type Exercise = Tables<'exercises'>

interface ExerciseListProps {
  exercises: Exercise[]
  trainingMaxes?: Map<number, number>
  onSetTm?: (exercise: Exercise) => void
}

export function ExerciseList({ exercises, trainingMaxes, onSetTm }: ExerciseListProps) {
  const [search, setSearch] = useState('')

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No exercises found.
          </p>
        )}
        {filtered.map((exercise) => (
          <div
            key={exercise.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{exercise.name}</span>
                <Badge variant={exercise.is_main_lift ? 'default' : 'secondary'}>
                  {exercise.is_main_lift ? 'Main' : 'Accessory'}
                </Badge>
                {exercise.created_by_user_id ? (
                  <Badge variant="outline">Custom</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">System</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                {exercise.movement_pattern.replace('_', ' ')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {exercise.is_main_lift && trainingMaxes?.has(exercise.id) && (
                <span className="text-sm font-mono">
                  TM: {trainingMaxes.get(exercise.id)} lbs
                </span>
              )}
              {exercise.is_main_lift && onSetTm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSetTm(exercise)}
                >
                  {trainingMaxes?.has(exercise.id) ? 'Update TM' : 'Set TM'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

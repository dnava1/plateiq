'use client'

import { useState } from 'react'
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
import { Search, SearchX } from 'lucide-react'
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

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        {filtered.map((exercise) => (
          <Card
            key={exercise.id}
            size="sm"
            className="border-border/70 bg-card/78"
          >
            <CardContent className="flex items-center justify-between gap-4 pt-3">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{exercise.name}</span>
                  <Badge variant={exercise.is_main_lift ? 'default' : 'secondary'}>
                    {exercise.is_main_lift ? 'Main' : 'Accessory'}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {exercise.movement_pattern.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {exercise.is_main_lift && trainingMaxes?.has(exercise.id) && (
                  <Badge variant="secondary">TM {formatWeight(trainingMaxes.get(exercise.id) ?? 0, unit)}</Badge>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

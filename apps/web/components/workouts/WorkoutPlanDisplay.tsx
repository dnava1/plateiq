'use client'

import { useMemo } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatWeight } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRepTarget, formatSetTypeLabel, type WorkoutDisplaySet } from './types'

interface WorkoutPlanDisplayProps {
  sets: WorkoutDisplaySet[]
}

export function WorkoutPlanDisplay({ sets }: WorkoutPlanDisplayProps) {
  const preferredUnit = usePreferredUnit()
  const groupedSets = useMemo(() => {
    const groups = new Map<string, WorkoutDisplaySet[]>()

    for (const set of sets) {
      const current = groups.get(set.exerciseName) ?? []
      current.push(set)
      groups.set(set.exerciseName, current)
    }

    return Array.from(groups.entries())
  }, [sets])

  if (sets.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groupedSets.map(([exerciseName, exerciseSets]) => (
        <Card key={exerciseName} className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">{exerciseName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            {exerciseSets.map((set) => (
              <div key={set.set_order} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Set {set.set_order}</span>
                  <Badge variant={set.set_type === 'main' ? 'secondary' : set.is_amrap ? 'default' : 'outline'}>
                    {formatSetTypeLabel(set.set_type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatWeight(set.weight_lbs, preferredUnit)} × {formatRepTarget(set.reps_prescribed, set.reps_prescribed_max, set.is_amrap)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
'use client'

import { useMemo, useState } from 'react'
import {
  buildExerciseKeyMap,
  resolveExerciseIdFromMap,
  useExercises,
  type Exercise,
} from '@/hooks/useExercises'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell } from 'lucide-react'
import { CurrentTmDisplay } from './CurrentTmDisplay'
import { TrainingMaxHistoryDialog } from './TrainingMaxHistoryDialog'
import { TrainingMaxForm } from './TrainingMaxForm'
import type { ExecutionMaxInputMode } from '@/lib/programs/trainingMax'

interface TrainingMaxPanelProps {
  title?: string
  description: string
  className?: string
  emptyStateHint?: string
  badgeLabel?: string
  inputMode?: ExecutionMaxInputMode
  targetExerciseIds?: number[]
  targetExerciseKeys?: string[]
}

function resolvePanelActionCopy(inputMode: ExecutionMaxInputMode) {
  switch (inputMode) {
    case '1rm':
      return {
        createActionLabel: 'Set 1RM',
        emptyStateHint: 'Add a 1RM-backed exercise block in Programs before setting an estimated 1RM here.',
        updateActionLabel: 'Update 1RM',
      }
    case 'mixed':
      return {
        createActionLabel: 'Set Max',
        emptyStateHint: 'Add a TM or 1RM-backed exercise block in Programs before setting a max input here.',
        updateActionLabel: 'Update Max',
      }
    default:
      return {
        createActionLabel: 'Set TM',
        emptyStateHint: 'Add a TM-backed exercise block in Programs before setting a training max here.',
        updateActionLabel: 'Update TM',
      }
  }
}

export function TrainingMaxPanel({
  title = 'Training Maxes',
  description,
  className,
  emptyStateHint,
  badgeLabel = 'Max inputs',
  inputMode = 'tm',
  targetExerciseIds,
  targetExerciseKeys,
}: TrainingMaxPanelProps) {
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null)
  const [tmExercise, setTmExercise] = useState<Exercise | null>(null)
  const preferredUnit = usePreferredUnit()
  const { data: exercises = [], isLoading: isExercisesLoading } = useExercises()
  const { data: trainingMaxes = [], isLoading: isTrainingMaxesLoading } = useCurrentTrainingMaxes()
  const panelActionCopy = resolvePanelActionCopy(inputMode)
  const resolvedEmptyStateHint = emptyStateHint ?? panelActionCopy.emptyStateHint

  const tmMap = useMemo(() => new Map(trainingMaxes.map((tm) => [tm.exercise_id, tm.weight_lbs])), [trainingMaxes])
  const tmDateMap = useMemo(() => new Map(trainingMaxes.map((tm) => [tm.exercise_id, tm.effective_date])), [trainingMaxes])
  const scopedExerciseIds = useMemo(() => {
    const hasTargetScope = (targetExerciseIds?.length ?? 0) > 0 || (targetExerciseKeys?.length ?? 0) > 0

    if (!hasTargetScope) {
      return null
    }

    const resolvedExerciseIds = [...(targetExerciseIds ?? [])]
    const seenExerciseIds = new Set(resolvedExerciseIds)
    const exerciseKeyMap = buildExerciseKeyMap(exercises)

    for (const exerciseKey of targetExerciseKeys ?? []) {
      const resolvedExerciseId = resolveExerciseIdFromMap(exerciseKeyMap, exerciseKey)

      if (resolvedExerciseId && !seenExerciseIds.has(resolvedExerciseId)) {
        seenExerciseIds.add(resolvedExerciseId)
        resolvedExerciseIds.push(resolvedExerciseId)
      }
    }

    return resolvedExerciseIds
  }, [exercises, targetExerciseIds, targetExerciseKeys])

  const scopedExercises = useMemo(() => {
    if (!scopedExerciseIds) {
      return exercises
        .filter((exercise) => exercise.is_main_lift || tmMap.has(exercise.id))
        .sort((left, right) => left.name.localeCompare(right.name))
    }

    const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

    return scopedExerciseIds
      .map((exerciseId) => exerciseById.get(exerciseId))
      .filter((exercise): exercise is Exercise => Boolean(exercise))
  }, [exercises, scopedExerciseIds, tmMap])

  return (
    <>
      <Card className={cn('surface-panel', className)}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Badge variant="secondary">{badgeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isExercisesLoading || isTrainingMaxesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="metric-tile flex flex-col gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : scopedExercises.length === 0 ? (
            <div className="rounded-[22px] border border-border/70 bg-background/55 px-4 py-6 text-sm text-muted-foreground">
              {resolvedEmptyStateHint}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {scopedExercises.map((exercise) => {
                return (
                  <Card key={exercise.id} size="sm" className="border-border/70 bg-card/82">
                    <CardContent className="flex h-full flex-col gap-4 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <CurrentTmDisplay
                          exerciseName={exercise.name}
                          weightLbs={tmMap.get(exercise.id)}
                          unit={preferredUnit}
                          effectiveDate={tmDateMap.get(exercise.id)}
                        />
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                          <Dumbbell />
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryExercise(exercise)}
                          className="w-full"
                        >
                          History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTmExercise(exercise)}
                          className="w-full"
                        >
                          {tmMap.has(exercise.id) ? panelActionCopy.updateActionLabel : panelActionCopy.createActionLabel}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {tmExercise && (
        <TrainingMaxForm
          key={`${tmExercise.id}-${inputMode}`}
          open={!!tmExercise}
          onOpenChange={(open) => !open && setTmExercise(null)}
          exerciseId={tmExercise.id}
          exerciseName={tmExercise.name}
          currentTm={tmMap.get(tmExercise.id)}
          mode={inputMode}
          unit={preferredUnit}
        />
      )}

      {historyExercise && (
        <TrainingMaxHistoryDialog
          open={!!historyExercise}
          onOpenChange={(open) => !open && setHistoryExercise(null)}
          exerciseId={historyExercise.id}
          exerciseName={historyExercise.name}
        />
      )}
    </>
  )
}

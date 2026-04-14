'use client'

import { useState } from 'react'
import { useExercises } from '@/hooks/useExercises'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { ExerciseList } from '@/components/exercises/ExerciseList'
import { CreateExerciseForm } from '@/components/exercises/CreateExerciseForm'
import { TrainingMaxForm } from '@/components/exercises/TrainingMaxForm'
import { CurrentTmDisplay } from '@/components/exercises/CurrentTmDisplay'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { Dumbbell, PlusIcon } from 'lucide-react'
import type { Tables } from '@/types/database'

type Exercise = Tables<'exercises'>

const MAIN_LIFTS = ['squat', 'bench', 'ohp', 'deadlift'] as const
const MAIN_LIFT_EXACT_NAMES: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  ohp: 'Overhead Press',
  deadlift: 'Deadlift',
}

export default function ExercisesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [tmExercise, setTmExercise] = useState<Exercise | null>(null)
  const [category, setCategory] = useState<string>('all')

  const preferredUnit = usePreferredUnit()
  const { data: exercises = [], isLoading } = useExercises()
  const { data: trainingMaxes = [] } = useCurrentTrainingMaxes()

  // Build TM map: exercise_id → weight_lbs
  const tmMap = new Map<number, number>()
  const tmDateMap = new Map<number, string>()
  for (const tm of trainingMaxes) {
    tmMap.set(tm.exercise_id, tm.weight_lbs)
    tmDateMap.set(tm.exercise_id, tm.effective_date)
  }

  // Build lookup: key → exercise (exact name match)
  const mainLiftMap = new Map<string, Exercise>()
  for (const key of MAIN_LIFTS) {
    const exactName = MAIN_LIFT_EXACT_NAMES[key]
    const match = exercises.find((e) => e.name === exactName)
    if (match) mainLiftMap.set(key, match)
  }

  const filteredExercises =
    category === 'all'
      ? exercises
      : category === 'main'
        ? exercises.filter((e) => e.is_main_lift)
        : exercises.filter((e) => !e.is_main_lift)

  if (isLoading) {
    return (
      <div className="page-shell max-w-5xl">
        <section className="page-header">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Library</span>
            <div className="flex flex-col gap-2">
              <h1 className="page-title">Exercises</h1>
              <p className="page-copy">Manage your movement library and training maxes.</p>
            </div>
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="metric-tile flex flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
        <div className="surface-panel p-5">
          <Skeleton className="h-10 w-56" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-shell max-w-5xl">
        <section className="page-header">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Library</span>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="page-title">Exercises</h1>
                <Badge variant="outline" className="rounded-full px-2.5">
                  {exercises.length} total
                </Badge>
              </div>
              <p className="page-copy">
                Browse and manage your movement library.
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="lg">
            <PlusIcon data-icon="inline-start" />
            Add Exercise
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="eyebrow">Training Maxes</h2>
            <Badge variant="secondary">Core lifts</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {MAIN_LIFTS.map((key) => {
              const exercise = mainLiftMap.get(key)
              return (
                <Card key={key} size="sm" className="border-border/70 bg-card/82">
                  <CardContent className="flex h-full flex-col gap-4 pt-3">
                    <div className="flex items-start justify-between gap-3">
                      <CurrentTmDisplay
                        exerciseName={MAIN_LIFT_EXACT_NAMES[key]}
                        weightLbs={exercise ? tmMap.get(exercise.id) : undefined}
                        unit={preferredUnit}
                        effectiveDate={exercise ? tmDateMap.get(exercise.id) : undefined}
                      />
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Dumbbell />
                      </div>
                    </div>
                    {exercise && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTmExercise(exercise)}
                        className="w-full"
                      >
                        {tmMap.has(exercise.id) ? 'Update' : 'Set TM'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="rounded-2xl border border-border/70 bg-card/72 p-1">
            <TabsTrigger value="all" className="rounded-lg">All ({exercises.length})</TabsTrigger>
            <TabsTrigger value="main" className="rounded-lg">
              Main ({exercises.filter((e) => e.is_main_lift).length})
            </TabsTrigger>
            <TabsTrigger value="accessory" className="rounded-lg">
              Accessory ({exercises.filter((e) => !e.is_main_lift).length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value={category} className="mt-4">
            <ExerciseList
              exercises={filteredExercises}
              trainingMaxes={tmMap}
              unit={preferredUnit}
              onSetTm={setTmExercise}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CreateExerciseForm open={createOpen} onOpenChange={setCreateOpen} />
      {tmExercise && (
        <TrainingMaxForm
          open={!!tmExercise}
          onOpenChange={(open) => !open && setTmExercise(null)}
          exerciseId={tmExercise.id}
          exerciseName={tmExercise.name}
          currentTm={tmMap.get(tmExercise.id)}
          unit={preferredUnit}
        />
      )}
    </>
  )
}

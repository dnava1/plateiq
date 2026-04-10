'use client'

import { useState } from 'react'
import { useExercises } from '@/hooks/useExercises'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { ExerciseList } from '@/components/exercises/ExerciseList'
import { CreateExerciseForm } from '@/components/exercises/CreateExerciseForm'
import { TrainingMaxForm } from '@/components/exercises/TrainingMaxForm'
import { CurrentTmDisplay } from '@/components/exercises/CurrentTmDisplay'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Tables } from '@/types/database'

type Exercise = Tables<'exercises'>

const MAIN_LIFTS = ['squat', 'bench', 'ohp', 'deadlift'] as const
const MAIN_LIFT_NAMES: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  ohp: 'Overhead Press',
  deadlift: 'Deadlift',
}

export default function ExercisesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [tmExercise, setTmExercise] = useState<Exercise | null>(null)
  const [category, setCategory] = useState<string>('all')

  const { data: exercises = [], isLoading } = useExercises()
  const { data: trainingMaxes = [] } = useCurrentTrainingMaxes()

  // Build TM map: exercise_id → weight_lbs
  const tmMap = new Map<number, number>()
  const tmDateMap = new Map<number, string>()
  for (const tm of trainingMaxes) {
    tmMap.set(tm.exercise_id, tm.weight_lbs)
    tmDateMap.set(tm.exercise_id, tm.effective_date)
  }

  // Find main lift exercise IDs from seed data
  const mainLiftExercises = exercises.filter((e) =>
    e.is_main_lift && MAIN_LIFTS.some((key) =>
      e.name.toLowerCase().includes(key === 'ohp' ? 'overhead press' : key)
    )
  )

  const filteredExercises =
    category === 'all'
      ? exercises
      : category === 'main'
        ? exercises.filter((e) => e.is_main_lift)
        : exercises.filter((e) => !e.is_main_lift)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading exercises...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <Button onClick={() => setCreateOpen(true)}>Add Exercise</Button>
      </div>

      {/* Training Max Overview */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Training Maxes</h2>
        <div className="space-y-2">
          {MAIN_LIFTS.map((key) => {
            const exercise = mainLiftExercises.find((e) =>
              e.name.toLowerCase().includes(key === 'ohp' ? 'overhead press' : key)
            )
            return (
              <div key={key} className="flex items-center justify-between">
                <CurrentTmDisplay
                  exerciseName={MAIN_LIFT_NAMES[key]}
                  weightLbs={exercise ? tmMap.get(exercise.id) : undefined}
                  effectiveDate={exercise ? tmDateMap.get(exercise.id) : undefined}
                />
                {exercise && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTmExercise(exercise)}
                  >
                    {tmMap.has(exercise.id) ? 'Update' : 'Set TM'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Exercise Browser */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList>
          <TabsTrigger value="all">All ({exercises.length})</TabsTrigger>
          <TabsTrigger value="main">
            Main ({exercises.filter((e) => e.is_main_lift).length})
          </TabsTrigger>
          <TabsTrigger value="accessory">
            Accessory ({exercises.filter((e) => !e.is_main_lift).length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value={category} className="mt-4">
          <ExerciseList
            exercises={filteredExercises}
            trainingMaxes={tmMap}
            onSetTm={setTmExercise}
          />
        </TabsContent>
      </Tabs>

      {/* Sheets */}
      <CreateExerciseForm open={createOpen} onOpenChange={setCreateOpen} />
      {tmExercise && (
        <TrainingMaxForm
          open={!!tmExercise}
          onOpenChange={(open) => !open && setTmExercise(null)}
          exerciseId={tmExercise.id}
          exerciseName={tmExercise.name}
          currentTm={tmMap.get(tmExercise.id)}
        />
      )}
    </div>
  )
}

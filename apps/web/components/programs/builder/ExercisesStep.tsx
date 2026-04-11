'use client'

import { useState } from 'react'
import { validateCustomProgramExerciseDay } from '@/lib/validations/program'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { ExerciseBlockEditor } from './ExerciseBlockEditor'
import { Button } from '@/components/ui/button'
import { PlusIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ExerciseBlock } from '@/types/template'

export function ExercisesStep() {
  const { draft, currentDayIndex, setDayIndex, updateDay, setStep } = useBuilderDraftStore()
  const [error, setError] = useState<string | null>(null)
  const day = draft.days[currentDayIndex]
  const isLastDay = currentDayIndex === draft.days.length - 1
  const isFirstDay = currentDayIndex === 0

  if (!day) {
    setStep('days')
    return null
  }

  const addExercise = () => {
    const newBlock: ExerciseBlock = {
      role: day.exercise_blocks.length === 0 ? 'primary' : 'accessory',
      exercise_key: '',
      sets: [{ sets: 3, reps: 5, intensity: draft.uses_training_max ? 0.75 : 135, intensity_type: draft.uses_training_max ? 'percentage_tm' : 'fixed_weight' }],
    }
    updateDay(currentDayIndex, {
      ...day,
      exercise_blocks: [...day.exercise_blocks, newBlock],
    })
    setError(null)
  }

  const updateBlock = (blockIdx: number, block: ExerciseBlock) => {
    const blocks = [...day.exercise_blocks]
    blocks[blockIdx] = block
    updateDay(currentDayIndex, { ...day, exercise_blocks: blocks })
    setError(null)
  }

  const removeBlock = (blockIdx: number) => {
    updateDay(currentDayIndex, {
      ...day,
      exercise_blocks: day.exercise_blocks.filter((_, i) => i !== blockIdx),
    })
    setError(null)
  }

  const handleNextDay = () => {
    const validationError = validateCustomProgramExerciseDay(day, currentDayIndex)

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)

    if (isLastDay) {
      setStep('progression')
    } else {
      setDayIndex(currentDayIndex + 1)
    }
  }

  const handlePrevDay = () => {
    setError(null)

    if (isFirstDay) {
      setStep('days')
    } else {
      setDayIndex(currentDayIndex - 1)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Day navigation header */}
      <div className="flex items-center justify-between rounded-xl bg-secondary p-3">
        <Button variant="ghost" size="sm" onClick={handlePrevDay}>
          <ChevronLeft className="size-4" data-icon="inline-start" />
          {isFirstDay ? 'Back' : 'Prev'}
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{day.label}</p>
          <p className="text-xs text-muted-foreground">Day {currentDayIndex + 1} of {draft.days.length}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleNextDay}>
          {isLastDay ? 'Next Step' : 'Next'}
          <ChevronRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>

      {/* Exercise blocks */}
      <div className="flex flex-col gap-3">
        {day.exercise_blocks.map((block, i) => (
          <ExerciseBlockEditor
            key={i}
            block={block}
            index={i}
            usesTrainingMax={draft.uses_training_max}
            onChange={(b) => updateBlock(i, b)}
            onRemove={() => removeBlock(i)}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}

      {/* Add exercise */}
      <Button variant="outline" onClick={addExercise} className="w-full border-dashed">
        <PlusIcon className="size-4" data-icon="inline-start" />
        Add Exercise
      </Button>

      {/* Bottom nav */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={handlePrevDay} className="flex-1">
          {isFirstDay ? 'Back to Days' : `← ${draft.days[currentDayIndex - 1]?.label}`}
        </Button>
        <Button onClick={handleNextDay} className="flex-1">
          {isLastDay ? 'Progression →' : `${draft.days[currentDayIndex + 1]?.label} →`}
        </Button>
      </div>
    </div>
  )
}

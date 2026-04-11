'use client'

import { useState } from 'react'
import { validateCustomProgramExerciseDay } from '@/lib/validations/program'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { ExerciseBlockEditor } from './ExerciseBlockEditor'
import { Button } from '@/components/ui/button'
import { PlusIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ExerciseBlock } from '@/types/template'

function createExerciseBlockId() {
  return `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

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
      block_id: createExerciseBlockId(),
      role: day.exercise_blocks.length === 0 ? 'primary' : 'accessory',
      exercise_id: undefined,
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
      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-border/70 bg-card/70 p-4">
        <Button variant="outline" size="sm" onClick={handlePrevDay}>
          <ChevronLeft className="size-4" data-icon="inline-start" />
          {isFirstDay ? 'Back' : 'Prev'}
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{day.label}</p>
          <p className="text-xs text-muted-foreground">Day {currentDayIndex + 1} of {draft.days.length}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleNextDay}>
          {isLastDay ? 'Review Progression' : 'Next'}
          <ChevronRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {day.exercise_blocks.length > 0 ? (
          day.exercise_blocks.map((block, i) => (
            <ExerciseBlockEditor
              key={block.block_id ?? `${block.exercise_id ?? block.exercise_key ?? 'empty'}-${i}`}
              block={block}
              index={i}
              usesTrainingMax={draft.uses_training_max}
              onChange={(b) => updateBlock(i, b)}
              onRemove={() => removeBlock(i)}
            />
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-border/80 bg-card/72 p-5 text-sm leading-6 text-muted-foreground">
            Add at least one exercise block for {day.label} before continuing. Each block can reuse an exercise from the library or create a custom one on the spot.
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}

      <Button variant="outline" onClick={addExercise} className="w-full border-dashed" size="lg">
        <PlusIcon className="size-4" data-icon="inline-start" />
        Add Exercise Block
      </Button>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={handlePrevDay} className="flex-1">
          {isFirstDay ? 'Back to Days' : `← ${draft.days[currentDayIndex - 1]?.label}`}
        </Button>
        <Button onClick={handleNextDay} className="flex-1">
          {isLastDay ? 'Continue to Progression' : `${draft.days[currentDayIndex + 1]?.label} →`}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { ExerciseBlockEditor } from './ExerciseBlockEditor'
import { Button } from '@/components/ui/button'
import { PlusIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ExerciseBlock } from '@/types/template'

export function ExercisesStep() {
  const { draft, currentDayIndex, setDayIndex, updateDay, setStep } = useBuilderDraftStore()
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
  }

  const updateBlock = (blockIdx: number, block: ExerciseBlock) => {
    const blocks = [...day.exercise_blocks]
    blocks[blockIdx] = block
    updateDay(currentDayIndex, { ...day, exercise_blocks: blocks })
  }

  const removeBlock = (blockIdx: number) => {
    updateDay(currentDayIndex, {
      ...day,
      exercise_blocks: day.exercise_blocks.filter((_, i) => i !== blockIdx),
    })
  }

  const handleNextDay = () => {
    if (isLastDay) {
      setStep('progression')
    } else {
      setDayIndex(currentDayIndex + 1)
    }
  }

  const handlePrevDay = () => {
    if (isFirstDay) {
      setStep('days')
    } else {
      setDayIndex(currentDayIndex - 1)
    }
  }

  return (
    <div className="space-y-4">
      {/* Day navigation header */}
      <div className="flex items-center justify-between rounded-xl bg-secondary p-3">
        <Button variant="ghost" size="sm" onClick={handlePrevDay}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {isFirstDay ? 'Back' : 'Prev'}
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{day.label}</p>
          <p className="text-xs text-muted-foreground">Day {currentDayIndex + 1} of {draft.days.length}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleNextDay}>
          {isLastDay ? 'Next Step' : 'Next'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Exercise blocks */}
      <div className="space-y-3">
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

      {/* Add exercise */}
      <Button variant="outline" onClick={addExercise} className="w-full border-dashed">
        <PlusIcon className="h-4 w-4 mr-1" />
        Add Exercise
      </Button>

      {/* Bottom nav */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={handlePrevDay} className="flex-1">
          {isFirstDay ? 'Back to Days' : `← ${draft.days[currentDayIndex - 1]?.label}`}
        </Button>
        <Button onClick={handleNextDay} className="flex-1" disabled={day.exercise_blocks.length === 0}>
          {isLastDay ? 'Progression →' : `${draft.days[currentDayIndex + 1]?.label} →`}
        </Button>
      </div>
    </div>
  )
}

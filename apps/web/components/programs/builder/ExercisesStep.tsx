'use client'

import { PlusIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { resolveEditableProgramDaySlots, updateProgramDay } from '@/lib/programs/week'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import type { ExerciseBlock } from '@/types/template'
import { ExerciseBlockEditor } from './ExerciseBlockEditor'
import { useBuilderStepNavigation } from './useBuilderStepNavigation'

function createExerciseBlockId() {
  return `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function ExercisesStep() {
  const { draft, currentDayIndex, patchDraft, setStep } = useBuilderDraftStore()
  const {
    clearStepError,
    goToNextExerciseDay,
    goToPreviousExerciseDay,
    stepError,
  } = useBuilderStepNavigation()
  const editableDaySlots = resolveEditableProgramDaySlots(draft)
  const currentSlot = editableDaySlots[currentDayIndex]
  const day = currentSlot?.day
  const isLastDay = currentDayIndex === editableDaySlots.length - 1
  const isFirstDay = currentDayIndex === 0
  const showsCycleWeeks = editableDaySlots.some((slot) => slot.weekNumber > 1)

  if (!currentSlot || !day) {
    setStep('days')
    return null
  }

  const persistDay = (nextDay: typeof day) => {
    patchDraft(updateProgramDay(draft, currentSlot, nextDay))
  }

  const addExercise = () => {
    const newBlock: ExerciseBlock = {
      block_id: createExerciseBlockId(),
      role: day.exercise_blocks.length === 0 ? 'primary' : 'accessory',
      exercise_id: undefined,
      exercise_key: '',
      sets: [
        {
          sets: 3,
          reps: 5,
          intensity: draft.uses_training_max ? 0.75 : 135,
          intensity_type: draft.uses_training_max ? 'percentage_tm' : 'fixed_weight',
        },
      ],
    }

    persistDay({
      ...day,
      exercise_blocks: [...day.exercise_blocks, newBlock],
    })
    clearStepError()
  }

  const updateBlock = (blockIdx: number, block: ExerciseBlock) => {
    const blocks = [...day.exercise_blocks]
    blocks[blockIdx] = block
    persistDay({ ...day, exercise_blocks: blocks })
    clearStepError()
  }

  const removeBlock = (blockIdx: number) => {
    persistDay({
      ...day,
      exercise_blocks: day.exercise_blocks.filter((_, index) => index !== blockIdx),
    })
    clearStepError()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-border/70 bg-card/70 p-4">
        <Button variant="outline" size="sm" onClick={goToPreviousExerciseDay}>
          <ChevronLeft className="size-4" data-icon="inline-start" />
          {isFirstDay ? 'Back' : 'Prev'}
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{day.label}</p>
          <p className="text-xs text-muted-foreground">
            {showsCycleWeeks
              ? `Week ${currentSlot.weekNumber} - ${currentSlot.weekLabel} - Session ${currentDayIndex + 1} of ${editableDaySlots.length}`
              : `Day ${currentDayIndex + 1} of ${editableDaySlots.length}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={goToNextExerciseDay}>
          {isLastDay ? 'Review Progression' : 'Next'}
          <ChevronRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {day.exercise_blocks.length > 0 ? (
          day.exercise_blocks.map((block, index) => (
            <ExerciseBlockEditor
              key={block.block_id ?? `${block.exercise_id ?? block.exercise_key ?? 'empty'}-${index}`}
              block={block}
              index={index}
              usesTrainingMax={draft.uses_training_max}
              onChange={(nextBlock) => updateBlock(index, nextBlock)}
              onRemove={() => removeBlock(index)}
            />
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-border/80 bg-card/72 p-5 text-sm leading-6 text-muted-foreground">
            Add at least one exercise block for {day.label} before continuing. Each block can reuse an exercise from the library or create a custom one on the spot.
          </div>
        )}
      </div>

      {stepError ? (
        <p role="alert" className="text-sm text-destructive">{stepError}</p>
      ) : null}

      <Button variant="outline" onClick={addExercise} className="w-full border-dashed" size="lg">
        <PlusIcon className="size-4" data-icon="inline-start" />
        Add Exercise Block
      </Button>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={goToPreviousExerciseDay} className="flex-1">
          {isFirstDay ? 'Back to Days' : `<- ${editableDaySlots[currentDayIndex - 1]?.day.label}`}
        </Button>
        <Button onClick={goToNextExerciseDay} className="flex-1">
          {isLastDay ? 'Continue to Progression' : `${editableDaySlots[currentDayIndex + 1]?.day.label} ->`}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_WORKOUT_NOTE_LENGTH = 500

const QUICK_NOTE_TEMPLATES = [
  { label: 'Load change', prefix: 'Load change: ' },
  { label: 'Rep change', prefix: 'Rep change: ' },
  { label: 'Rest extended', prefix: 'Rest extended: ' },
  { label: 'Exercise swap', prefix: 'Exercise swap: ' },
] as const

function appendWorkoutNote(currentNote: string, prefix: string) {
  if (!currentNote.trim()) {
    return prefix
  }

  const separator = currentNote.endsWith('\n') ? '' : '\n'
  return `${currentNote}${separator}${prefix}`
}

interface WorkoutSessionNoteCardProps {
  workoutId: number
}

export function WorkoutSessionNoteCard({ workoutId }: WorkoutSessionNoteCardProps) {
  const noteDraft = useWorkoutSessionStore((state) => state.workoutNoteDrafts[workoutId] ?? '')
  const clearWorkoutNoteDraft = useWorkoutSessionStore((state) => state.clearWorkoutNoteDraft)
  const setWorkoutNoteDraft = useWorkoutSessionStore((state) => state.setWorkoutNoteDraft)
  const noteFieldId = useMemo(() => `workout-note-${workoutId}`, [workoutId])

  return (
    <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Session note</span>
          <p className="text-sm text-muted-foreground">
            Capture a deviation, equipment swap, or small call you made during the session. PlateIQ will save it with this workout.
          </p>
        </div>

        {noteDraft ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => clearWorkoutNoteDraft(workoutId)}>
            Clear
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_NOTE_TEMPLATES.map((template) => (
          <Button
            key={template.label}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setWorkoutNoteDraft(workoutId, appendWorkoutNote(noteDraft, template.prefix))}
          >
            {template.label}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Label htmlFor={noteFieldId}>Workout note</Label>
        <Textarea
          id={noteFieldId}
          maxLength={MAX_WORKOUT_NOTE_LENGTH}
          placeholder="Optional note for deviations, equipment swaps, or calls you made today."
          rows={4}
          value={noteDraft}
          onChange={(event) => setWorkoutNoteDraft(workoutId, event.target.value.slice(0, MAX_WORKOUT_NOTE_LENGTH))}
          className="min-h-28 resize-none"
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {noteDraft.length}/{MAX_WORKOUT_NOTE_LENGTH} characters. Saved when you complete the workout.
      </p>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Flag, NotebookPen } from 'lucide-react'
import { useCompleteWorkout } from '@/hooks/useWorkouts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CompleteWorkoutButtonProps {
  cycleId: number
  onComplete: () => void
  workoutId: number
}

export function CompleteWorkoutButton({ cycleId, onComplete, workoutId }: CompleteWorkoutButtonProps) {
  const router = useRouter()
  const completeWorkout = useCompleteWorkout()
  const [notes, setNotes] = useState('')

  const handleComplete = () => {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

    completeWorkout.mutate(
      {
        workoutId,
        cycleId,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Workout completed')
          onComplete()
          router.replace('/workouts')
        },
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )

    if (!isOnline) {
      toast('Workout completion queued. It will sync when you reconnect.')
      onComplete()
      router.replace('/workouts')
    }
  }

  return (
    <Card className="surface-panel">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag />
          Complete Workout
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor="workout-notes" className="flex items-center gap-2">
            <NotebookPen />
            Notes (optional)
          </Label>
          <Textarea
            id="workout-notes"
            placeholder="How did it move? Any cues worth keeping for next time?"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <Button type="button" size="lg" onClick={handleComplete} disabled={completeWorkout.isPending}>
          {completeWorkout.isPending ? 'Saving…' : 'Complete Workout'}
        </Button>
      </CardContent>
    </Card>
  )
}
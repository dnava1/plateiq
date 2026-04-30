'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useCompleteWorkout } from '@/hooks/useWorkouts'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import { Button } from '@/components/ui/button'

interface CompleteWorkoutButtonProps {
  cycleId: number
  workoutId: number
}

export function CompleteWorkoutButton({ cycleId, workoutId }: CompleteWorkoutButtonProps) {
  const router = useRouter()
  const { data: user } = useUser()
  const completeWorkout = useCompleteWorkout()
  const clearPendingCompletion = useWorkoutSessionStore((state) => state.clearPendingCompletion)
  const completeWorkoutSession = useWorkoutSessionStore((state) => state.completeWorkoutSession)
  const pendingCompletionWorkoutId = useWorkoutSessionStore((state) => state.pendingCompletionWorkoutId)
  const queueWorkoutCompletion = useWorkoutSessionStore((state) => state.queueWorkoutCompletion)
  const isCompletionQueued = pendingCompletionWorkoutId === workoutId

  const handleComplete = () => {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

    completeWorkout.mutate(
      {
        cycleId,
        userId: user?.id,
        workoutId,
      },
      {
        onSuccess: () => {
          toast.success('Workout completed')
          completeWorkoutSession(workoutId)
          router.replace('/workouts')
        },
        onError: (error) => {
          clearPendingCompletion()
          toast.error(error.message)
        },
      },
    )

    if (!isOnline) {
      queueWorkoutCompletion(workoutId)
      toast('Workout completion queued. Keep this workout available until it syncs.')
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      onClick={handleComplete}
      disabled={completeWorkout.isPending || isCompletionQueued}
    >
      <Flag className="size-4" />
      {isCompletionQueued ? 'Completion queued' : completeWorkout.isPending ? 'Saving...' : 'Complete Workout'}
    </Button>
  )
}


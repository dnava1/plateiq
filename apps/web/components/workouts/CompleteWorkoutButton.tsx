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
  onCompleted?: () => void
  onQueued?: () => void
  redirectTo?: string | null
  userIdOverride?: string | null
  workoutId: number
}

export function CompleteWorkoutButton({
  cycleId,
  onCompleted,
  onQueued,
  redirectTo = '/workouts',
  userIdOverride,
  workoutId,
}: CompleteWorkoutButtonProps) {
  const router = useRouter()
  const { data: user } = useUser()
  const userId = userIdOverride ?? user?.id
  const completeWorkout = useCompleteWorkout()
  const clearPendingCompletion = useWorkoutSessionStore((state) => state.clearPendingCompletion)
  const completeWorkoutSession = useWorkoutSessionStore((state) => state.completeWorkoutSession)
  const pendingCompletionWorkoutId = useWorkoutSessionStore((state) => state.pendingCompletionWorkoutId)
  const queueWorkoutCompletion = useWorkoutSessionStore((state) => state.queueWorkoutCompletion)
  const isCompletionQueued = pendingCompletionWorkoutId === workoutId

  const handleComplete = () => {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

    if (!isOnline) {
      queueWorkoutCompletion(workoutId)
      onQueued?.()
      toast('Workout completion queued. Keep this workout available until it syncs.')
    }

    completeWorkout.mutate(
      {
        cycleId,
        userId,
        workoutId,
      },
      {
        onSuccess: () => {
          toast.success('Workout completed')
          completeWorkoutSession(workoutId)
          onCompleted?.()

          if (redirectTo) {
            router.replace(redirectTo)
          }
        },
        onError: (error) => {
          if (!isOnline) {
            return
          }

          clearPendingCompletion()
          toast.error(error.message)
        },
      },
    )
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

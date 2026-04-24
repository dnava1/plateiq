'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import { useCompleteWorkout } from '@/hooks/useWorkouts'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import { Button } from '@/components/ui/button'

interface CompleteWorkoutButtonProps {
  cycleId: number
  workoutId: number
}

export function CompleteWorkoutButton({ cycleId, workoutId }: CompleteWorkoutButtonProps) {
  const router = useRouter()
  const completeWorkout = useCompleteWorkout()
  const completeWorkoutSession = useWorkoutSessionStore((state) => state.completeWorkoutSession)

  const handleComplete = () => {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

    completeWorkout.mutate(
      {
        workoutId,
        cycleId,
      },
      {
        onSuccess: () => {
          toast.success('Workout completed')
          completeWorkoutSession(workoutId)
          router.replace('/workouts')
        },
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )

    if (!isOnline) {
      toast('Workout completion queued. It will sync when you reconnect.')
      completeWorkoutSession(workoutId)
      router.replace('/workouts')
    }
  }

  return (
    <Button type="button" size="lg" className="w-full" onClick={handleComplete} disabled={completeWorkout.isPending}>
      <Flag className="size-4" />
      {completeWorkout.isPending ? 'Saving…' : 'Complete Workout'}
    </Button>
  )
}

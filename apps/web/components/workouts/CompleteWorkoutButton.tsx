'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import { useCompleteWorkout } from '@/hooks/useWorkouts'
import { Button } from '@/components/ui/button'

interface CompleteWorkoutButtonProps {
  cycleId: number
  onComplete: () => void
  workoutId: number
}

export function CompleteWorkoutButton({ cycleId, onComplete, workoutId }: CompleteWorkoutButtonProps) {
  const router = useRouter()
  const completeWorkout = useCompleteWorkout()

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
    <Button type="button" size="lg" className="w-full" onClick={handleComplete} disabled={completeWorkout.isPending}>
      <Flag className="size-4" />
      {completeWorkout.isPending ? 'Saving…' : 'Complete Workout'}
    </Button>
  )
}
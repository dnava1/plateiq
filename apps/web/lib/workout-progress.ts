export interface WorkoutProgressState {
  completedWorkouts: number
  completionRatio: number
  remainingWorkouts: number
  totalPlannedWorkouts: number
}

export interface SuggestedWorkoutSelection {
  dayIndex: number
  weekNumber: number
}

interface MinimalWorkoutProgressRow {
  completed_at: string | null
  day_label: string | null
  week_number: number
}

export function findSuggestedWorkoutSelection(
  cycleLengthWeeks: number,
  dayLabels: string[],
  workouts: MinimalWorkoutProgressRow[] | undefined,
): SuggestedWorkoutSelection {
  for (let weekNumber = 1; weekNumber <= cycleLengthWeeks; weekNumber += 1) {
    for (let dayIndex = 0; dayIndex < dayLabels.length; dayIndex += 1) {
      const dayLabel = dayLabels[dayIndex]
      const workout = workouts?.find((entry) => entry.week_number === weekNumber && entry.day_label === dayLabel)

      if (!workout || !workout.completed_at) {
        return { dayIndex, weekNumber }
      }
    }
  }

  return { dayIndex: 0, weekNumber: 1 }
}

export function calculateCycleProgress(
  cycleLengthWeeks: number,
  dayCount: number,
  workouts: MinimalWorkoutProgressRow[] | undefined,
): WorkoutProgressState {
  const totalPlannedWorkouts = Math.max(0, cycleLengthWeeks * dayCount)
  const completedWorkouts = (workouts ?? []).filter((workout) => Boolean(workout.completed_at)).length
  const remainingWorkouts = Math.max(0, totalPlannedWorkouts - completedWorkouts)

  return {
    completedWorkouts,
    completionRatio: totalPlannedWorkouts === 0 ? 0 : completedWorkouts / totalPlannedWorkouts,
    remainingWorkouts,
    totalPlannedWorkouts,
  }
}

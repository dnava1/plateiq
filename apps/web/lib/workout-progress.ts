import type { ProgramTemplate } from '@/types/template'
import { countProgramPlannedWorkouts, resolveProgramDays } from '@/lib/programs/week'

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

type WorkoutProgressTemplate = Pick<ProgramTemplate, 'cycle_length_weeks' | 'days' | 'week_schemes'>

export function findSuggestedWorkoutSelection(
  template: WorkoutProgressTemplate | undefined,
  workouts: MinimalWorkoutProgressRow[] | undefined,
): SuggestedWorkoutSelection {
  if (!template) {
    return { dayIndex: 0, weekNumber: 1 }
  }

  for (let weekNumber = 1; weekNumber <= template.cycle_length_weeks; weekNumber += 1) {
    const dayLabels = resolveProgramDays(template, weekNumber).map((day) => day.label)

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
  template: WorkoutProgressTemplate | undefined,
  workouts: MinimalWorkoutProgressRow[] | undefined,
): WorkoutProgressState {
  const totalPlannedWorkouts = template ? countProgramPlannedWorkouts(template) : 0
  const completedWorkouts = (workouts ?? []).filter((workout) => Boolean(workout.completed_at)).length
  const remainingWorkouts = Math.max(0, totalPlannedWorkouts - completedWorkouts)

  return {
    completedWorkouts,
    completionRatio: totalPlannedWorkouts === 0 ? 0 : completedWorkouts / totalPlannedWorkouts,
    remainingWorkouts,
    totalPlannedWorkouts,
  }
}

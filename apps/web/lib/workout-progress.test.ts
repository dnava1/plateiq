import { describe, expect, it } from 'vitest'
import { calculateCycleProgress, findSuggestedWorkoutSelection } from './workout-progress'

describe('findSuggestedWorkoutSelection', () => {
  it('returns the first incomplete workout slot in week order', () => {
    const selection = findSuggestedWorkoutSelection(
      2,
      ['Day 1', 'Day 2'],
      [
        { week_number: 1, day_label: 'Day 1', completed_at: '2026-04-01T10:00:00Z' },
        { week_number: 1, day_label: 'Day 2', completed_at: null },
        { week_number: 2, day_label: 'Day 1', completed_at: null },
      ],
    )

    expect(selection).toEqual({ dayIndex: 1, weekNumber: 1 })
  })

  it('wraps back to week one when every workout is complete', () => {
    const selection = findSuggestedWorkoutSelection(
      1,
      ['A', 'B'],
      [
        { week_number: 1, day_label: 'A', completed_at: '2026-04-01T10:00:00Z' },
        { week_number: 1, day_label: 'B', completed_at: '2026-04-03T10:00:00Z' },
      ],
    )

    expect(selection).toEqual({ dayIndex: 0, weekNumber: 1 })
  })
})

describe('calculateCycleProgress', () => {
  it('counts completed workouts and remaining sessions', () => {
    const progress = calculateCycleProgress(4, 3, [
      { week_number: 1, day_label: 'A', completed_at: '2026-04-01T10:00:00Z' },
      { week_number: 1, day_label: 'B', completed_at: null },
      { week_number: 1, day_label: 'C', completed_at: '2026-04-05T10:00:00Z' },
    ])

    expect(progress).toEqual({
      completedWorkouts: 2,
      completionRatio: 2 / 12,
      remainingWorkouts: 10,
      totalPlannedWorkouts: 12,
    })
  })

  it('returns a zero ratio when the program does not define planned workouts', () => {
    expect(calculateCycleProgress(0, 0, undefined)).toEqual({
      completedWorkouts: 0,
      completionRatio: 0,
      remainingWorkouts: 0,
      totalPlannedWorkouts: 0,
    })
  })
})

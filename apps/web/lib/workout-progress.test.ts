import { describe, expect, it } from 'vitest'
import { calculateCycleProgress, findSuggestedWorkoutSelection } from './workout-progress'

describe('findSuggestedWorkoutSelection', () => {
  it('returns the first incomplete workout slot in week order', () => {
    const selection = findSuggestedWorkoutSelection(
      {
        cycle_length_weeks: 2,
        days: [{ label: 'Day 1', exercise_blocks: [] }, { label: 'Day 2', exercise_blocks: [] }],
      },
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
      {
        cycle_length_weeks: 1,
        days: [{ label: 'A', exercise_blocks: [] }, { label: 'B', exercise_blocks: [] }],
      },
      [
        { week_number: 1, day_label: 'A', completed_at: '2026-04-01T10:00:00Z' },
        { week_number: 1, day_label: 'B', completed_at: '2026-04-03T10:00:00Z' },
      ],
    )

    expect(selection).toEqual({ dayIndex: 0, weekNumber: 1 })
  })

  it('supports week-specific day labels across the cycle', () => {
    const selection = findSuggestedWorkoutSelection(
      {
        cycle_length_weeks: 2,
        days: [{ label: 'Week 1 OHP', exercise_blocks: [] }],
        week_schemes: {
          '2': {
            label: 'Week 2',
            days: [{ label: 'Week 2 Bench', exercise_blocks: [] }],
          },
        },
      },
      [
        { week_number: 1, day_label: 'Week 1 OHP', completed_at: '2026-04-01T10:00:00Z' },
      ],
    )

    expect(selection).toEqual({ dayIndex: 0, weekNumber: 2 })
  })
})

describe('calculateCycleProgress', () => {
  it('counts completed workouts and remaining sessions', () => {
    const progress = calculateCycleProgress({
      cycle_length_weeks: 4,
      days: [
        { label: 'A', exercise_blocks: [] },
        { label: 'B', exercise_blocks: [] },
        { label: 'C', exercise_blocks: [] },
      ],
    }, [
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
    expect(calculateCycleProgress(undefined, undefined)).toEqual({
      completedWorkouts: 0,
      completionRatio: 0,
      remainingWorkouts: 0,
      totalPlannedWorkouts: 0,
    })
  })

  it('counts week-specific day overrides in the planned workout total', () => {
    const progress = calculateCycleProgress(
      {
        cycle_length_weeks: 2,
        days: [{ label: 'Week 1 OHP', exercise_blocks: [] }],
        week_schemes: {
          '2': {
            label: 'Week 2',
            days: [
              { label: 'Week 2 Bench', exercise_blocks: [] },
              { label: 'Week 2 Row', exercise_blocks: [] },
            ],
          },
        },
      },
      [{ week_number: 1, day_label: 'Week 1 OHP', completed_at: '2026-04-01T10:00:00Z' }],
    )

    expect(progress).toEqual({
      completedWorkouts: 1,
      completionRatio: 1 / 3,
      remainingWorkouts: 2,
      totalPlannedWorkouts: 3,
    })
  })
})

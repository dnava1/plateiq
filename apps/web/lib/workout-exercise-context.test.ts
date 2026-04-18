import { describe, expect, it } from 'vitest'
import { buildExerciseContextById, summarizeRecentExerciseSession } from './workout-exercise-context'

describe('workout-exercise-context', () => {
  it('prefers the latest completed workout and highlights an AMRAP set when present', () => {
    const summary = summarizeRecentExerciseSession([
      {
        exercise_id: 3,
        is_amrap: false,
        logged_at: '2026-04-09T10:00:00.000Z',
        reps_actual: 5,
        reps_prescribed: 5,
        reps_prescribed_max: null,
        set_order: 2,
        weight_lbs: 205,
        workout_id: 41,
        workouts: {
          completed_at: '2026-04-09T10:30:00.000Z',
          day_label: 'Lower A',
          scheduled_date: '2026-04-09',
          week_number: 1,
        },
      },
      {
        exercise_id: 3,
        is_amrap: false,
        logged_at: '2026-04-16T10:00:00.000Z',
        reps_actual: 5,
        reps_prescribed: 5,
        reps_prescribed_max: null,
        set_order: 2,
        weight_lbs: 215,
        workout_id: 55,
        workouts: {
          completed_at: '2026-04-16T10:40:00.000Z',
          day_label: 'Lower B',
          scheduled_date: '2026-04-16',
          week_number: 2,
        },
      },
      {
        exercise_id: 3,
        is_amrap: true,
        logged_at: '2026-04-16T10:05:00.000Z',
        reps_actual: 8,
        reps_prescribed: 5,
        reps_prescribed_max: null,
        set_order: 3,
        weight_lbs: 225,
        workout_id: 55,
        workouts: {
          completed_at: '2026-04-16T10:40:00.000Z',
          day_label: 'Lower B',
          scheduled_date: '2026-04-16',
          week_number: 2,
        },
      },
    ])

    expect(summary).not.toBeNull()
    expect(summary?.workoutId).toBe(55)
    expect(summary?.referenceSet.isAmrap).toBe(true)
    expect(summary?.referenceSet.setOrder).toBe(3)
    expect(summary?.dayLabel).toBe('Lower B')
  })

  it('creates lightweight context entries for requested exercises', () => {
    const context = buildExerciseContextById(
      [3, 7],
      [
        {
          exercise_id: 3,
          is_amrap: false,
          logged_at: '2026-04-16T10:05:00.000Z',
          reps_actual: 6,
          reps_prescribed: 5,
          reps_prescribed_max: null,
          set_order: 3,
          weight_lbs: 225,
          workout_id: 55,
          workouts: {
            completed_at: '2026-04-16T10:40:00.000Z',
            day_label: 'Lower B',
            scheduled_date: '2026-04-16',
            week_number: 2,
          },
        },
      ],
    )

    expect(context[3]?.recentSession?.workoutId).toBe(55)
    expect(context[7]?.recentSession).toBeNull()
  })

  it('prefers the most recent comparable workout when the latest session has a different set target', () => {
    const summary = summarizeRecentExerciseSession(
      [
        {
          exercise_id: 3,
          is_amrap: false,
          logged_at: '2026-04-18T10:00:00.000Z',
          reps_actual: 8,
          reps_prescribed: 8,
          reps_prescribed_max: null,
          set_order: 2,
          weight_lbs: 195,
          workout_id: 60,
          workouts: {
            completed_at: '2026-04-18T10:35:00.000Z',
            day_label: 'Volume Day',
            scheduled_date: '2026-04-18',
            week_number: 3,
          },
        },
        {
          exercise_id: 3,
          is_amrap: false,
          logged_at: '2026-04-11T10:00:00.000Z',
          reps_actual: 5,
          reps_prescribed: 5,
          reps_prescribed_max: null,
          set_order: 2,
          weight_lbs: 225,
          workout_id: 55,
          workouts: {
            completed_at: '2026-04-11T10:40:00.000Z',
            day_label: 'Intensity Day',
            scheduled_date: '2026-04-11',
            week_number: 2,
          },
        },
      ],
      {
        isAmrap: false,
        repsPrescribed: 5,
        repsPrescribedMax: null,
      },
    )

    expect(summary).not.toBeNull()
    expect(summary?.workoutId).toBe(55)
    expect(summary?.referenceSet.weightLbs).toBe(225)
    expect(summary?.dayLabel).toBe('Intensity Day')
  })
})
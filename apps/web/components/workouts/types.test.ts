import { describe, expect, it } from 'vitest'
import {
  buildWorkoutExecutionCue,
  buildWorkoutExecutionSnapshot,
  estimateOneRepMax,
  formatDurationClock,
  getRecommendedRestSeconds,
  hasRemainingPendingWork,
  isEstimatedOneRepMaxPr,
  shouldAutoStartRestTimer,
  type WorkoutDisplaySet,
} from './types'

const baseWorkoutDisplaySet: WorkoutDisplaySet = {
  block_id: 'bench-main',
  block_order: 1,
  block_role: 'primary',
  exercise_key: 'bench',
  exercise_id: 1,
  execution_group: undefined,
  exerciseId: 1,
  exerciseName: 'Bench Press',
  intensity_type: 'percentage_tm',
  is_amrap: false,
  loggedAt: null,
  notes: undefined,
  prescribedWeightLbs: 185,
  reps_prescribed: 5,
  reps_prescribed_max: undefined,
  repsActual: null,
  rest_seconds: 180,
  rpe: undefined,
  set_order: 1,
  set_type: 'main',
  weight_lbs: 185,
  workoutId: 7,
}

function createWorkoutDisplaySet(overrides: Partial<WorkoutDisplaySet>): WorkoutDisplaySet {
  return {
    ...baseWorkoutDisplaySet,
    ...overrides,
  }
}

function buildGroupedSupersetSets(loggedSetOrders: number[] = []) {
  const executionGroup = {
    key: 'superset-a',
    label: 'Press + Pull',
    type: 'superset' as const,
  }

  return [
    createWorkoutDisplaySet({
      block_id: 'press-a',
      block_order: 1,
      block_role: 'variation',
      exercise_key: 'ohp',
      exercise_id: 3,
      exerciseId: 3,
      exerciseName: 'Overhead Press',
      execution_group: executionGroup,
      prescribedWeightLbs: 95,
      reps_prescribed: 8,
      rest_seconds: 90,
      set_order: 1,
      set_type: 'variation',
      weight_lbs: 95,
    }),
    createWorkoutDisplaySet({
      block_id: 'press-a',
      block_order: 1,
      block_role: 'variation',
      exercise_key: 'ohp',
      exercise_id: 3,
      exerciseId: 3,
      exerciseName: 'Overhead Press',
      execution_group: executionGroup,
      prescribedWeightLbs: 95,
      reps_prescribed: 8,
      rest_seconds: 90,
      set_order: 2,
      set_type: 'variation',
      weight_lbs: 95,
    }),
    createWorkoutDisplaySet({
      block_id: 'chin-a',
      block_order: 2,
      block_role: 'accessory',
      exercise_key: 'chin_up',
      exercise_id: 2,
      exerciseId: 2,
      exerciseName: 'Chin-Up',
      execution_group: executionGroup,
      intensity_type: 'bodyweight',
      prescribedWeightLbs: 0,
      reps_prescribed: 10,
      rest_seconds: 60,
      set_order: 3,
      set_type: 'accessory',
      weight_lbs: 0,
    }),
    createWorkoutDisplaySet({
      block_id: 'chin-a',
      block_order: 2,
      block_role: 'accessory',
      exercise_key: 'chin_up',
      exercise_id: 2,
      exerciseId: 2,
      exerciseName: 'Chin-Up',
      execution_group: executionGroup,
      intensity_type: 'bodyweight',
      prescribedWeightLbs: 0,
      reps_prescribed: 10,
      rest_seconds: 60,
      set_order: 4,
      set_type: 'accessory',
      weight_lbs: 0,
    }),
  ].map((set) =>
    loggedSetOrders.includes(set.set_order)
      ? {
          ...set,
          loggedAt: '2026-04-17T10:00:00.000Z',
          repsActual: set.reps_prescribed,
        }
      : set,
  )
}

describe('workout type helpers', () => {
  it('calculates the estimated 1RM from a completed set', () => {
    expect(estimateOneRepMax(225, 5)).toBeCloseTo(262.31, 2)
  })

  it('falls back to the lifted weight for singles and very high rep counts', () => {
    expect(estimateOneRepMax(225, 1)).toBe(225)
    expect(estimateOneRepMax(225, 40)).toBe(225)
  })

  it('treats the first estimate as a PR when no history exists', () => {
    expect(isEstimatedOneRepMaxPr(262.31, [])).toBe(true)
  })

  it('requires the new estimate to clear the epsilon threshold', () => {
    expect(isEstimatedOneRepMaxPr(262.6, [262.3])).toBe(false)
    expect(isEstimatedOneRepMaxPr(262.9, [262.3])).toBe(true)
  })

  it('formats rest durations as a clock string', () => {
    expect(formatDurationClock(125)).toBe('2:05')
  })

  it('only returns rest timing when the program explicitly defines it', () => {
    expect(getRecommendedRestSeconds({ block_role: 'primary', rest_seconds: undefined })).toBeNull()
    expect(getRecommendedRestSeconds({ block_role: 'accessory', rest_seconds: 45 })).toBe(45)
  })

  it('builds block and execution-group progress from workout sets', () => {
    const snapshot = buildWorkoutExecutionSnapshot([
      {
        block_id: 'bench-main',
        block_order: 1,
        block_role: 'primary',
        exercise_key: 'bench',
        exercise_id: 1,
        execution_group: undefined,
        exerciseId: 1,
        exerciseName: 'Bench Press',
        intensity_type: 'percentage_tm',
        is_amrap: false,
        loggedAt: '2026-04-17T10:00:00.000Z',
        notes: 'Pause every rep.',
        prescribedWeightLbs: 185,
        reps_prescribed: 5,
        reps_prescribed_max: undefined,
        repsActual: 5,
        rest_seconds: 180,
        rpe: undefined,
        set_order: 1,
        set_type: 'main',
        weight_lbs: 185,
        workoutId: 7,
      },
      {
        block_id: 'bench-main',
        block_order: 1,
        block_role: 'primary',
        exercise_key: 'bench',
        exercise_id: 1,
        execution_group: undefined,
        exerciseId: 1,
        exerciseName: 'Bench Press',
        intensity_type: 'percentage_tm',
        is_amrap: false,
        loggedAt: null,
        notes: 'Pause every rep.',
        prescribedWeightLbs: 185,
        reps_prescribed: 5,
        reps_prescribed_max: undefined,
        repsActual: null,
        rest_seconds: 180,
        rpe: undefined,
        set_order: 2,
        set_type: 'main',
        weight_lbs: 185,
        workoutId: 7,
      },
      {
        block_id: 'chin-a',
        block_order: 2,
        block_role: 'accessory',
        exercise_key: 'chin_up',
        exercise_id: 2,
        execution_group: {
          key: 'superset-a',
          label: 'Press + Pull',
          type: 'superset',
        },
        exerciseId: 2,
        exerciseName: 'Chin-Up',
        intensity_type: 'bodyweight',
        is_amrap: false,
        loggedAt: null,
        notes: 'Move right into these.',
        prescribedWeightLbs: 0,
        reps_prescribed: 8,
        reps_prescribed_max: undefined,
        repsActual: null,
        rest_seconds: 60,
        rpe: undefined,
        set_order: 3,
        set_type: 'accessory',
        weight_lbs: 0,
        workoutId: 7,
      },
      {
        block_id: 'press-a',
        block_order: 3,
        block_role: 'variation',
        exercise_key: 'ohp',
        exercise_id: 3,
        execution_group: {
          key: 'superset-a',
          label: 'Press + Pull',
          type: 'superset',
        },
        exerciseId: 3,
        exerciseName: 'Overhead Press',
        intensity_type: 'percentage_tm',
        is_amrap: false,
        loggedAt: null,
        notes: 'Stay crisp.',
        prescribedWeightLbs: 95,
        reps_prescribed: 8,
        reps_prescribed_max: undefined,
        repsActual: null,
        rest_seconds: 90,
        rpe: undefined,
        set_order: 4,
        set_type: 'variation',
        weight_lbs: 95,
        workoutId: 7,
      },
    ])

    expect(snapshot.totalBlocks).toBe(3)
    expect(snapshot.completedBlocks).toBe(0)
    expect(snapshot.completedSets).toBe(1)
    expect(snapshot.nextSet?.set_order).toBe(2)
    expect(snapshot.groups).toHaveLength(2)
    expect(snapshot.groups[1]).toMatchObject({
      completedCount: 0,
      kind: 'superset',
      label: 'Press + Pull',
      totalCount: 2,
    })
  })

  it('uses grouped execution rounds when choosing the next pending set', () => {
    expect(buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([1])).nextSet?.set_order).toBe(3)
    expect(buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([1, 3])).nextSet?.set_order).toBe(2)
    expect(buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([1, 3, 2])).nextSet?.set_order).toBe(4)
    expect(buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([1, 2, 3, 4])).nextSet).toBeNull()
  })

  it('keeps the next block aligned with grouped execution order', () => {
    const snapshot = buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([1]))

    expect(snapshot.nextSet?.set_order).toBe(3)
    expect(snapshot.nextBlock?.blockId).toBe('chin-a')
    expect(snapshot.nextBlock?.exerciseName).toBe('Chin-Up')
  })

  it('builds an explicit execution cue for grouped flow', () => {
    const cue = buildWorkoutExecutionCue(buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([1])))

    expect(cue).toMatchObject({
      blockProgressLabel: 'Set 1 of 2 in this block. 0 logged so far.',
      currentSetLabel: 'Chin-Up round 1 of 2',
      followUpLabel: 'After this, go back to Overhead Press for round 2.',
      groupProgressLabel: 'Superset step 2 of 2 in Press + Pull. 1 of 4 grouped sets logged.',
      roundLabel: 'Round 1 of 2',
      workoutProgressLabel: 'Workout 1 of 4 sets logged. 3 sets left.',
    })
  })

  it('only auto-starts rest timers at grouped round boundaries', () => {
    const snapshot = buildWorkoutExecutionSnapshot(buildGroupedSupersetSets())

    expect(shouldAutoStartRestTimer(snapshot, 1)).toBe(false)
    expect(shouldAutoStartRestTimer(snapshot, 3)).toBe(true)
    expect(shouldAutoStartRestTimer(snapshot, 2)).toBe(false)
    expect(shouldAutoStartRestTimer(snapshot, 4)).toBe(false)
  })

  it('skips already-logged grouped steps when deciding round-boundary rest', () => {
    const snapshot = buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([3]))

    expect(shouldAutoStartRestTimer(snapshot, 1)).toBe(true)
    expect(hasRemainingPendingWork(snapshot, 1)).toBe(true)
  })

  it('skips already-logged grouped steps when building the follow-up cue', () => {
    const cue = buildWorkoutExecutionCue(buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([3])))

    expect(cue).toMatchObject({
      currentSetLabel: 'Overhead Press round 1 of 2',
      followUpLabel: 'After this, go back to Overhead Press for round 2.',
      groupProgressLabel: 'Superset step 1 of 2 in Press + Pull. 1 of 4 grouped sets logged.',
      roundLabel: 'Round 1 of 2',
    })
  })

  it('only reports remaining pending work for unfinished sets later in execution order', () => {
    const snapshot = buildWorkoutExecutionSnapshot(buildGroupedSupersetSets([1, 2, 4]))

    expect(hasRemainingPendingWork(snapshot, 4)).toBe(false)
  })

  it('falls back to a single-block execution cue outside grouped flow', () => {
    const cue = buildWorkoutExecutionCue(buildWorkoutExecutionSnapshot([
      createWorkoutDisplaySet({
        set_order: 1,
        loggedAt: '2026-04-17T10:00:00.000Z',
        repsActual: 5,
      }),
      createWorkoutDisplaySet({
        set_order: 2,
      }),
      createWorkoutDisplaySet({
        block_id: 'row-main',
        block_order: 2,
        block_role: 'variation',
        exercise_key: 'barbell_row',
        exercise_id: 4,
        exerciseId: 4,
        exerciseName: 'Barbell Row',
        set_order: 3,
        set_type: 'variation',
        weight_lbs: 135,
        prescribedWeightLbs: 135,
        reps_prescribed: 8,
      }),
    ]))

    expect(cue).toMatchObject({
      blockProgressLabel: 'Set 2 of 2 in this block. 1 logged so far.',
      currentSetLabel: 'Bench Press set 2 of 2',
      followUpLabel: 'After this, move to Barbell Row set 1.',
      groupProgressLabel: null,
      roundLabel: null,
      workoutProgressLabel: 'Workout 1 of 3 sets logged. 2 sets left.',
    })
  })
})
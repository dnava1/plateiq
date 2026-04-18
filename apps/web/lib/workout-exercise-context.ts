import type { Tables } from '@/types/database'

type WorkoutSummary = Pick<Tables<'workouts'>, 'completed_at' | 'day_label' | 'scheduled_date' | 'week_number'>

export type ExerciseHistoryRow = Pick<
  Tables<'workout_sets'>,
  | 'exercise_id'
  | 'is_amrap'
  | 'logged_at'
  | 'reps_actual'
  | 'reps_prescribed'
  | 'reps_prescribed_max'
  | 'set_order'
  | 'weight_lbs'
  | 'workout_id'
> & {
  workouts: WorkoutSummary | null
}

export interface ExerciseReferenceSetSummary {
  isAmrap: boolean
  repsActual: number
  repsPrescribed: number
  repsPrescribedMax: number | null
  setOrder: number
  weightLbs: number
}

export interface RecentExerciseSessionSummary {
  completedAt: string | null
  dayLabel: string | null
  loggedSetCount: number
  referenceSet: ExerciseReferenceSetSummary
  scheduledDate: string
  weekNumber: number | null
  workoutId: number
}

export interface ExerciseContextEntry {
  exerciseId: number
  recentSession: RecentExerciseSessionSummary | null
}

export type ExerciseContextById = Record<number, ExerciseContextEntry>

export interface ExerciseContextTarget {
  isAmrap: boolean
  repsPrescribed: number
  repsPrescribedMax: number | null
}

export type ExerciseContextTargetById = Record<number, ExerciseContextTarget | undefined>

function getHistoryTimestamp(row: ExerciseHistoryRow) {
  const candidate = row.workouts?.completed_at ?? row.logged_at

  if (!candidate) {
    return 0
  }

  const timestamp = Date.parse(candidate)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function sortHistoryRows(left: ExerciseHistoryRow, right: ExerciseHistoryRow) {
  return getHistoryTimestamp(right) - getHistoryTimestamp(left)
}

function sortReferenceRows(left: ExerciseHistoryRow & { reps_actual: number }, right: ExerciseHistoryRow & { reps_actual: number }) {
  if (right.weight_lbs !== left.weight_lbs) {
    return right.weight_lbs - left.weight_lbs
  }

  if (right.reps_actual !== left.reps_actual) {
    return right.reps_actual - left.reps_actual
  }

  return right.set_order - left.set_order
}

function getCompletedRows(rows: ExerciseHistoryRow[]) {
  return rows.filter((row): row is ExerciseHistoryRow & { reps_actual: number } => row.reps_actual !== null)
}

function matchesContextTarget(
  row: ExerciseHistoryRow,
  target: ExerciseContextTarget,
) {
  return row.is_amrap === target.isAmrap
    && row.reps_prescribed === target.repsPrescribed
    && (row.reps_prescribed_max ?? null) === target.repsPrescribedMax
}

function pickComparableReferenceSet(rows: ExerciseHistoryRow[], target: ExerciseContextTarget) {
  const comparableRows = getCompletedRows(rows).filter((row) => matchesContextTarget(row, target))

  if (!comparableRows.length) {
    return null
  }

  return [...comparableRows].sort(sortReferenceRows)[0] ?? null
}

function pickFallbackReferenceSet(rows: ExerciseHistoryRow[]) {
  const completedRows = getCompletedRows(rows)

  if (!completedRows.length) {
    return null
  }

  const prioritizedRows = completedRows.some((row) => row.is_amrap)
    ? completedRows.filter((row) => row.is_amrap)
    : completedRows

  return [...prioritizedRows].sort(sortReferenceRows)[0] ?? null
}

export function summarizeRecentExerciseSession(
  rows: ExerciseHistoryRow[],
  target?: ExerciseContextTarget,
) {
  if (!rows.length) {
    return null
  }

  const rowsByWorkout = new Map<number, ExerciseHistoryRow[]>()

  for (const row of [...rows].sort(sortHistoryRows)) {
    const workoutRows = rowsByWorkout.get(row.workout_id)

    if (workoutRows) {
      workoutRows.push(row)
      continue
    }

    rowsByWorkout.set(row.workout_id, [row])
  }

  let selectedWorkoutRows: ExerciseHistoryRow[] | null = null
  let referenceSet: (ExerciseHistoryRow & { reps_actual: number }) | null = null

  for (const workoutRows of rowsByWorkout.values()) {
    if (!workoutRows.length) {
      continue
    }

    const comparableReferenceSet = target
      ? pickComparableReferenceSet(workoutRows, target)
      : null

    if (comparableReferenceSet) {
      selectedWorkoutRows = workoutRows
      referenceSet = comparableReferenceSet
      break
    }

    if (!selectedWorkoutRows) {
      selectedWorkoutRows = workoutRows
    }
  }

  if (!selectedWorkoutRows?.length) {
    return null
  }

  referenceSet = referenceSet ?? pickFallbackReferenceSet(selectedWorkoutRows)
  if (!referenceSet) {
    return null
  }

  const workout = selectedWorkoutRows[0]!.workouts

  return {
    completedAt: workout?.completed_at ?? null,
    dayLabel: workout?.day_label ?? null,
    loggedSetCount: selectedWorkoutRows.length,
    referenceSet: {
      isAmrap: referenceSet.is_amrap,
      repsActual: referenceSet.reps_actual,
      repsPrescribed: referenceSet.reps_prescribed,
      repsPrescribedMax: referenceSet.reps_prescribed_max ?? null,
      setOrder: referenceSet.set_order,
      weightLbs: referenceSet.weight_lbs,
    },
    scheduledDate: workout?.scheduled_date ?? '',
    weekNumber: workout?.week_number ?? null,
    workoutId: selectedWorkoutRows[0]!.workout_id,
  }
}

export function buildExerciseContextById(
  exerciseIds: number[],
  recentHistory: ExerciseHistoryRow[],
  targetsByExercise: ExerciseContextTargetById = {},
): ExerciseContextById {
  const contextById: ExerciseContextById = {}
  const historyByExercise = new Map<number, ExerciseHistoryRow[]>()

  for (const exerciseId of exerciseIds) {
    contextById[exerciseId] = {
      exerciseId,
      recentSession: null,
    }
  }

  for (const row of recentHistory) {
    const historyRows = historyByExercise.get(row.exercise_id)

    if (historyRows) {
      historyRows.push(row)
      continue
    }

    historyByExercise.set(row.exercise_id, [row])
  }

  for (const exerciseId of exerciseIds) {
    contextById[exerciseId] = {
      exerciseId,
      recentSession: summarizeRecentExerciseSession(
        historyByExercise.get(exerciseId) ?? [],
        targetsByExercise[exerciseId],
      ),
    }
  }

  return contextById
}
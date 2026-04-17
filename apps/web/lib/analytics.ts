import type { Json } from '@/types/database'
import { buildStrengthProfile, createEmptyStrengthProfile } from '@/lib/strength-profile'
import { estimateBenchmarkOneRepMax } from '@/lib/strength-benchmarks'
import { DEFAULT_WEIGHT_ROUNDING_LBS } from '@/lib/utils'
import type {
  AnalyticsConsistency,
  AnalyticsData,
  AnalyticsE1rmPoint,
  AnalyticsMuscleBalancePoint,
  AnalyticsPrPoint,
  AnalyticsStallPoint,
  AnalyticsTmProgressionPoint,
  AnalyticsVolumePoint,
  DashboardCycleSummary,
  DashboardData,
  DashboardProgramSummary,
  DashboardRecentWorkout,
  DashboardTrainingMax,
  DerivedRecentPr,
  StrengthProfileRawData,
  StrengthProfileRawLift,
  StrengthProfileRepMax,
  WeeklyActivitySummary,
  WeeklyVolumeSummary,
} from '@/types/analytics'

const RECENT_PR_EPSILON_LBS = 0.5
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const MILLISECONDS_PER_WEEK = 7 * MILLISECONDS_PER_DAY

export interface DashboardSourceProgram {
  id: number
  name: string
  templateKey: string
}

export interface DashboardSourceCycle {
  id: number
  cycleNumber: number
}

export interface DashboardSourceWorkout {
  id: number
  primaryExerciseId: number
  weekNumber: number
  completedAt: string | null
  scheduledDate: string
}

export interface DashboardSourceTrainingMax {
  exerciseId: number
  weightLbs: number
  effectiveDate: string
}

export interface AnalyticsSourceExercise {
  id: number
  isMainLift: boolean
  movementPattern: string
  name: string
}

export interface AnalyticsSourceWorkout {
  completedAt: string | null
  id: number
  scheduledDate: string
}

export interface AnalyticsSourceSet {
  exerciseId: number
  isAmrap: boolean
  repsActual: number | null
  repsPrescribed: number
  weightLbs: number
  workoutId: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function mapArray<T>(value: unknown, mapper: (entry: unknown) => T | null) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(mapper).filter((entry): entry is T => entry !== null)
}

function parseDashboardProgramSummary(value: unknown): DashboardProgramSummary | null {
  if (!isRecord(value)) return null

  const id = toNumber(value.id)
  const name = toString(value.name)
  const templateKey = toString(value.template_key)

  if (id === null || name === null || templateKey === null) {
    return null
  }

  return { id, name, templateKey }
}

function parseDashboardCycleSummary(value: unknown): DashboardCycleSummary | null {
  if (!isRecord(value)) return null

  const id = toNumber(value.id)
  const cycleNumber = toNumber(value.cycle_number)

  if (id === null || cycleNumber === null) {
    return null
  }

  return { id, cycleNumber }
}

function parseDashboardRecentWorkout(value: unknown): DashboardRecentWorkout | null {
  if (!isRecord(value)) return null

  const id = toNumber(value.id)
  const exerciseName = toString(value.exercise_name)
  const weekNumber = toNumber(value.week_number)
  const scheduledDate = toString(value.scheduled_date)

  if (id === null || exerciseName === null || weekNumber === null || scheduledDate === null) {
    return null
  }

  return {
    id,
    exerciseName,
    weekNumber,
    completedAt: toString(value.completed_at),
    scheduledDate,
  }
}

function parseDashboardTrainingMax(value: unknown): DashboardTrainingMax | null {
  if (!isRecord(value)) return null

  const exerciseId = toNumber(value.exercise_id)
  const exerciseName = toString(value.exercise_name)
  const weightLbs = toNumber(value.weight_lbs)
  const effectiveDate = toString(value.effective_date)

  if (exerciseId === null || exerciseName === null || weightLbs === null || effectiveDate === null) {
    return null
  }

  return {
    exerciseId,
    exerciseName,
    weightLbs,
    effectiveDate,
  }
}

function parseAnalyticsE1rmPoint(value: unknown): AnalyticsE1rmPoint | null {
  if (!isRecord(value)) return null

  const date = toString(value.date)
  const exerciseId = toNumber(value.exercise_id)
  const exerciseName = toString(value.exercise_name)
  const weight = toNumber(value.weight)
  const reps = toNumber(value.reps)
  const e1rm = toNumber(value.e1rm)

  if (date === null || exerciseId === null || exerciseName === null || weight === null || reps === null || e1rm === null) {
    return null
  }

  return { date, exerciseId, exerciseName, weight, reps, e1rm }
}

function parseAnalyticsVolumePoint(value: unknown): AnalyticsVolumePoint | null {
  if (!isRecord(value)) return null

  const weekStart = toString(value.week_start)
  const exerciseId = toNumber(value.exercise_id)
  const exerciseName = toString(value.exercise_name)
  const totalVolume = toNumber(value.total_volume)
  const totalSets = toNumber(value.total_sets)

  if (weekStart === null || exerciseId === null || exerciseName === null || totalVolume === null || totalSets === null) {
    return null
  }

  return { weekStart, exerciseId, exerciseName, totalVolume, totalSets }
}

function parseAnalyticsPrPoint(value: unknown): AnalyticsPrPoint | null {
  if (!isRecord(value)) return null

  const date = toString(value.date)
  const exerciseId = toNumber(value.exercise_id)
  const exerciseName = toString(value.exercise_name)
  const weight = toNumber(value.weight)
  const reps = toNumber(value.reps)
  const e1rm = toNumber(value.e1rm)

  if (date === null || exerciseId === null || exerciseName === null || weight === null || reps === null || e1rm === null) {
    return null
  }

  return { date, exerciseId, exerciseName, weight, reps, e1rm }
}

function parseAnalyticsConsistency(value: unknown): AnalyticsConsistency {
  if (!isRecord(value)) {
    return {
      totalSessions: 0,
      weeksActive: 0,
      firstSession: null,
      lastSession: null,
    }
  }

  return {
    totalSessions: toNumber(value.total_sessions) ?? 0,
    weeksActive: toNumber(value.weeks_active) ?? 0,
    firstSession: toString(value.first_session),
    lastSession: toString(value.last_session),
  }
}

function parseAnalyticsMuscleBalancePoint(value: unknown): AnalyticsMuscleBalancePoint | null {
  if (!isRecord(value)) return null

  const movementPattern = toString(value.movement_pattern)
  const totalVolume = toNumber(value.total_volume)
  const volumePct = toNumber(value.volume_pct)

  if (movementPattern === null || totalVolume === null || volumePct === null) {
    return null
  }

  return { movementPattern, totalVolume, volumePct }
}

function parseAnalyticsStallPoint(value: unknown): AnalyticsStallPoint | null {
  if (!isRecord(value)) return null

  const exerciseId = toNumber(value.exercise_id)
  const exerciseName = toString(value.exercise_name)
  const lastPrDate = toString(value.last_pr_date)
  const weeksSincePr = toNumber(value.weeks_since_pr)

  if (exerciseId === null || exerciseName === null || lastPrDate === null || weeksSincePr === null) {
    return null
  }

  return { exerciseId, exerciseName, lastPrDate, weeksSincePr }
}

function parseAnalyticsTmProgressionPoint(value: unknown): AnalyticsTmProgressionPoint | null {
  if (!isRecord(value)) return null

  const effectiveDate = toString(value.effective_date)
  const exerciseId = toNumber(value.exercise_id)
  const exerciseName = toString(value.exercise_name)
  const weightLbs = toNumber(value.weight_lbs)

  if (effectiveDate === null || exerciseId === null || exerciseName === null || weightLbs === null) {
    return null
  }

  return { effectiveDate, exerciseId, exerciseName, weightLbs }
}

function parseNumberRecord(value: unknown) {
  if (!isRecord(value)) {
    return {}
  }

  return Object.entries(value).reduce<Record<string, number>>((accumulator, [key, entry]) => {
    const numericValue = toNumber(entry)

    if (numericValue !== null && numericValue > 0) {
      accumulator[key] = numericValue
    }

    return accumulator
  }, {})
}

function parseStrengthProfileRepMax(value: unknown): StrengthProfileRepMax | null {
  if (!isRecord(value)) return null

  const reps = toNumber(value.reps)
  const weightLbs = toNumber(value.weight_lbs)

  if (reps === null || weightLbs === null) {
    return null
  }

  return { reps, weightLbs }
}

function parseStrengthProfileRawLift(value: unknown): StrengthProfileRawLift | null {
  if (!isRecord(value)) return null

  const liftSlug = toString(value.lift_slug)
  const displayName = toString(value.display_name)
  const categoryKey = toString(value.category_key)
  const categoryLabel = toString(value.category_label)
  const sourceExerciseId = toNumber(value.source_exercise_id)
  const sourceExerciseName = toString(value.source_exercise_name)
  const bestDate = toString(value.best_date)
  const bestReps = toNumber(value.best_reps)
  const bestExternalWeightLbs = toNumber(value.best_external_weight_lbs)
  const bestTotalLoadLbs = toNumber(value.best_total_load_lbs)
  const bestOneRepMaxLbs = toNumber(value.best_one_rm_lbs)
  const benchmarkOneRepMaxLbs = toNumber(value.benchmark_one_rm_lbs)

  if (
    liftSlug === null
    || displayName === null
    || categoryKey === null
    || categoryLabel === null
    || sourceExerciseId === null
    || sourceExerciseName === null
    || bestDate === null
    || bestReps === null
    || bestExternalWeightLbs === null
    || bestTotalLoadLbs === null
    || bestOneRepMaxLbs === null
    || benchmarkOneRepMaxLbs === null
  ) {
    return null
  }

  return {
    actualRepMaxes: mapArray(value.actual_rep_maxes, parseStrengthProfileRepMax),
    benchmarkOneRepMaxLbs,
    benchmarkRepMaxes: mapArray(value.benchmark_rep_maxes, parseStrengthProfileRepMax),
    bestDate,
    bestExternalWeightLbs,
    bestOneRepMaxLbs,
    bestReps,
    bestTotalLoadLbs,
    categoryKey,
    categoryLabel,
    displayName,
    liftSlug,
    muscleWeights: parseNumberRecord(value.muscle_weights),
    sourceExerciseId,
    sourceExerciseName,
  }
}

function parseStrengthProfileRawData(value: unknown): StrengthProfileRawData {
  if (!isRecord(value)) {
    return {
      lifts: [],
      minimumCategoryCount: 2,
      minimumLiftCount: 3,
      profile: {
        ageYears: null,
        bodyweightLbs: null,
        sex: null,
      },
    }
  }

  const rawAgeYears = toNumber(value.profile && isRecord(value.profile) ? value.profile.age_years : null)

  return {
    lifts: mapArray(value.lifts, parseStrengthProfileRawLift),
    minimumCategoryCount: toNumber(value.minimum_category_count) ?? 2,
    minimumLiftCount: toNumber(value.minimum_lift_count) ?? 3,
    profile: {
      ageYears: rawAgeYears !== null && Number.isInteger(rawAgeYears) ? rawAgeYears : null,
      bodyweightLbs: toNumber(value.profile && isRecord(value.profile) ? value.profile.bodyweight_lbs : null),
      sex: (() => {
        const sex = toString(value.profile && isRecord(value.profile) ? value.profile.sex : null)
        return sex === 'male' || sex === 'female' ? sex : null
      })(),
    },
  }
}

function sortByDate<T extends { date: string }>(entries: T[]) {
  return [...entries].sort((left, right) => left.date.localeCompare(right.date))
}

function parseDateInput(value: string | Date) {
  if (value instanceof Date) {
    return new Date(value.getTime())
  }

  return new Date(`${value}T00:00:00`)
}

function startOfWeek(value: string | Date) {
  const date = parseDateInput(value)
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = normalized.getDay()
  const distanceFromMonday = day === 0 ? 6 : day - 1
  normalized.setDate(normalized.getDate() - distanceFromMonday)
  return normalized
}

function formatWeekStart(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function normalizeDateKey(value: string | Date) {
  return value instanceof Date
    ? formatWeekStart(new Date(value.getFullYear(), value.getMonth(), value.getDate()))
    : value.slice(0, 10)
}

function isWithinRange(date: string, dateFrom?: string | null, dateTo?: string | null) {
  if (dateFrom && date < dateFrom) {
    return false
  }

  if (dateTo && date > dateTo) {
    return false
  }

  return true
}

export function estimateOneRepMax(weightLbs: number, reps: number) {
  return estimateBenchmarkOneRepMax(weightLbs, reps) ?? weightLbs
}

export function parseDashboardData(value: Json | null): DashboardData {
  const record = isRecord(value) ? value : {}

  return {
    activeProgram: parseDashboardProgramSummary(record.active_program),
    currentCycle: parseDashboardCycleSummary(record.current_cycle),
    recentWorkouts: mapArray(record.recent_workouts, parseDashboardRecentWorkout),
    currentTms: mapArray(record.current_tms, parseDashboardTrainingMax),
  }
}

export function parseAnalyticsData(value: Json | null, weightRoundingLbs: number = DEFAULT_WEIGHT_ROUNDING_LBS): AnalyticsData {
  const record = isRecord(value) ? value : {}

  return {
    e1rmTrend: mapArray(record.e1rm_trend, parseAnalyticsE1rmPoint),
    volumeTrend: mapArray(record.volume_trend, parseAnalyticsVolumePoint),
    prHistory: mapArray(record.pr_history, parseAnalyticsPrPoint),
    consistency: parseAnalyticsConsistency(record.consistency),
    muscleBalance: mapArray(record.muscle_balance, parseAnalyticsMuscleBalancePoint),
    stallDetection: mapArray(record.stall_detection, parseAnalyticsStallPoint),
    tmProgression: mapArray(record.tm_progression, parseAnalyticsTmProgressionPoint),
    strengthProfile: buildStrengthProfile(parseStrengthProfileRawData(record.strength_profile), weightRoundingLbs),
  }
}

export function hasAnalyticsData(analytics: AnalyticsData) {
  return analytics.e1rmTrend.length > 0
    || analytics.volumeTrend.length > 0
    || analytics.prHistory.length > 0
    || analytics.muscleBalance.length > 0
    || analytics.stallDetection.length > 0
    || analytics.consistency.totalSessions > 0
}

export function deriveRecentPrs(prHistory: AnalyticsPrPoint[], limit: number = 4): DerivedRecentPr[] {
  const bestByExercise = new Map<number, number>()
  const discoveredPrs: DerivedRecentPr[] = []

  for (const point of sortByDate(prHistory)) {
    const previousBest = bestByExercise.get(point.exerciseId)
    const isNewPr = previousBest === undefined || point.e1rm > previousBest + RECENT_PR_EPSILON_LBS

    if (!isNewPr) {
      continue
    }

    discoveredPrs.push({
      ...point,
      improvementLbs: previousBest === undefined ? null : point.e1rm - previousBest,
    })
    bestByExercise.set(point.exerciseId, point.e1rm)
  }

  return discoveredPrs
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit)
}

export function buildDashboardData({
  activeProgram,
  currentCycle,
  exercises,
  recentWorkouts,
  trainingMaxes,
}: {
  activeProgram: DashboardSourceProgram | null
  currentCycle: DashboardSourceCycle | null
  exercises: Array<Pick<AnalyticsSourceExercise, 'id' | 'name'>>
  recentWorkouts: DashboardSourceWorkout[]
  trainingMaxes: DashboardSourceTrainingMax[]
}): DashboardData {
  const exerciseNames = new Map(exercises.map((exercise) => [exercise.id, exercise.name]))
  const latestTrainingMaxes = new Map<number, DashboardTrainingMax>()

  for (const trainingMax of [...trainingMaxes].sort((left, right) => right.effectiveDate.localeCompare(left.effectiveDate))) {
    if (latestTrainingMaxes.has(trainingMax.exerciseId)) {
      continue
    }

    latestTrainingMaxes.set(trainingMax.exerciseId, {
      exerciseId: trainingMax.exerciseId,
      exerciseName: exerciseNames.get(trainingMax.exerciseId) ?? 'Unknown exercise',
      weightLbs: trainingMax.weightLbs,
      effectiveDate: trainingMax.effectiveDate,
    })
  }

  return {
    activeProgram: activeProgram
      ? {
          id: activeProgram.id,
          name: activeProgram.name,
          templateKey: activeProgram.templateKey,
        }
      : null,
    currentCycle: currentCycle
      ? {
          id: currentCycle.id,
          cycleNumber: currentCycle.cycleNumber,
        }
      : null,
    recentWorkouts: [...recentWorkouts]
      .sort((left, right) => right.scheduledDate.localeCompare(left.scheduledDate))
      .slice(0, 5)
      .map((workout) => ({
        id: workout.id,
        exerciseName: exerciseNames.get(workout.primaryExerciseId) ?? 'Unknown exercise',
        weekNumber: workout.weekNumber,
        completedAt: workout.completedAt,
        scheduledDate: workout.scheduledDate,
      })),
    currentTms: Array.from(latestTrainingMaxes.values()),
  }
}

export function buildAnalyticsData({
  currentDate = new Date(),
  dateFrom,
  dateTo,
  exerciseId,
  exercises,
  sets,
  workouts,
}: {
  currentDate?: string | Date
  dateFrom?: string | null
  dateTo?: string | null
  exerciseId?: number | null
  exercises: AnalyticsSourceExercise[]
  sets: AnalyticsSourceSet[]
  workouts: AnalyticsSourceWorkout[]
}): AnalyticsData {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]))
  const normalizedDateFrom = dateFrom ? normalizeDateKey(dateFrom) : null
  const normalizedDateTo = dateTo ? normalizeDateKey(dateTo) : null
  const inRangeSets = sets.filter((set) => {
    const workout = workoutById.get(set.workoutId)

    if (!workout || set.repsActual === null) {
      return false
    }

    return isWithinRange(workout.scheduledDate, normalizedDateFrom, normalizedDateTo)
  })
  const e1rmTrend = inRangeSets
    .filter((set) => set.isAmrap && set.repsActual !== null && set.repsActual > 0 && (!exerciseId || set.exerciseId === exerciseId))
    .map((set) => {
      const exercise = exerciseById.get(set.exerciseId)
      const workout = workoutById.get(set.workoutId)!
      return {
        date: workout.scheduledDate,
        exerciseId: set.exerciseId,
        exerciseName: exercise?.name ?? 'Unknown exercise',
        weight: set.weightLbs,
        reps: set.repsActual!,
        e1rm: roundToSingleDecimal(estimateOneRepMax(set.weightLbs, set.repsActual!)),
      }
    })
    .sort((left, right) => left.date.localeCompare(right.date))
  const volumeByWeekAndExercise = new Map<string, AnalyticsVolumePoint>()

  for (const set of inRangeSets) {
    if (exerciseId && set.exerciseId !== exerciseId) {
      continue
    }

    const exercise = exerciseById.get(set.exerciseId)
    const workout = workoutById.get(set.workoutId)

    if (!exercise || !workout) {
      continue
    }

    const weekStart = formatWeekStart(startOfWeek(workout.scheduledDate))
    const key = `${weekStart}:${set.exerciseId}`
    const current = volumeByWeekAndExercise.get(key)
    const setVolume = set.weightLbs * (set.repsActual ?? set.repsPrescribed)

    if (current) {
      current.totalVolume += setVolume
      current.totalSets += 1
      continue
    }

    volumeByWeekAndExercise.set(key, {
      weekStart,
      exerciseId: set.exerciseId,
      exerciseName: exercise.name,
      totalVolume: setVolume,
      totalSets: 1,
    })
  }

  const prByExerciseAndDate = new Map<string, AnalyticsPrPoint>()

  for (const point of e1rmTrend) {
    const key = `${point.exerciseId}:${point.date}`
    const current = prByExerciseAndDate.get(key)

    if (!current || point.e1rm > current.e1rm) {
      prByExerciseAndDate.set(key, point)
    }
  }

  const completedWorkoutsInRange = workouts
    .filter((workout) => workout.completedAt && isWithinRange(workout.scheduledDate, normalizedDateFrom, normalizedDateTo))
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate))
  const activeWeeks = new Set(completedWorkoutsInRange.map((workout) => formatWeekStart(startOfWeek(workout.scheduledDate))))
  const muscleBalanceTotals = new Map<string, number>()

  for (const set of inRangeSets) {
    const exercise = exerciseById.get(set.exerciseId)
    const movementPattern = exercise?.movementPattern ?? 'other'
    const totalVolume = muscleBalanceTotals.get(movementPattern) ?? 0
    muscleBalanceTotals.set(movementPattern, totalVolume + set.weightLbs * (set.repsActual ?? set.repsPrescribed))
  }

  const totalMuscleBalanceVolume = Array.from(muscleBalanceTotals.values()).reduce((total, value) => total + value, 0)
  const currentDateValue = parseDateInput(currentDate)
  const staleThreshold = new Date(currentDateValue.getTime() - 4 * MILLISECONDS_PER_WEEK)
  const lastPrByExercise = new Map<number, { exerciseName: string; lastPrDate: string }>()

  for (const set of sets) {
    if (!set.isAmrap || set.repsActual === null) {
      continue
    }

    const exercise = exerciseById.get(set.exerciseId)
    const workout = workoutById.get(set.workoutId)

    if (!exercise?.isMainLift || !workout) {
      continue
    }

    const current = lastPrByExercise.get(set.exerciseId)
    if (!current || workout.scheduledDate > current.lastPrDate) {
      lastPrByExercise.set(set.exerciseId, {
        exerciseName: exercise.name,
        lastPrDate: workout.scheduledDate,
      })
    }
  }

  return {
    e1rmTrend,
    volumeTrend: Array.from(volumeByWeekAndExercise.values()).sort((left, right) => left.weekStart.localeCompare(right.weekStart)),
    prHistory: Array.from(prByExerciseAndDate.values()).sort((left, right) => left.date.localeCompare(right.date)),
    consistency: {
      totalSessions: completedWorkoutsInRange.length,
      weeksActive: activeWeeks.size,
      firstSession: completedWorkoutsInRange[0]?.scheduledDate ?? null,
      lastSession: completedWorkoutsInRange.length > 0
        ? completedWorkoutsInRange[completedWorkoutsInRange.length - 1].scheduledDate
        : null,
    },
    muscleBalance: Array.from(muscleBalanceTotals.entries())
      .map(([movementPattern, totalVolume]) => ({
        movementPattern,
        totalVolume,
        volumePct: totalMuscleBalanceVolume > 0
          ? roundToSingleDecimal((totalVolume * 100) / totalMuscleBalanceVolume)
          : 0,
      }))
      .sort((left, right) => right.totalVolume - left.totalVolume),
    stallDetection: Array.from(lastPrByExercise.entries())
      .map(([currentExerciseId, value]) => ({
        exerciseId: currentExerciseId,
        exerciseName: value.exerciseName,
        lastPrDate: value.lastPrDate,
        weeksSincePr: Math.floor((currentDateValue.getTime() - parseDateInput(value.lastPrDate).getTime()) / MILLISECONDS_PER_WEEK),
      }))
      .filter((entry) => parseDateInput(entry.lastPrDate) < staleThreshold)
      .sort((left, right) => left.lastPrDate.localeCompare(right.lastPrDate)),
    tmProgression: [],
    strengthProfile: createEmptyStrengthProfile(),
  }
}

export function aggregateWeeklyVolume(volumeTrend: AnalyticsVolumePoint[]): WeeklyVolumeSummary[] {
  const weeklyVolume = new Map<string, WeeklyVolumeSummary>()

  for (const point of volumeTrend) {
    const current = weeklyVolume.get(point.weekStart)

    if (current) {
      current.totalVolume += point.totalVolume
      current.totalSets += point.totalSets
      continue
    }

    weeklyVolume.set(point.weekStart, {
      weekStart: point.weekStart,
      totalVolume: point.totalVolume,
      totalSets: point.totalSets,
    })
  }

  return Array.from(weeklyVolume.values()).sort((left, right) => left.weekStart.localeCompare(right.weekStart))
}

export function buildWeeklyActivity(
  volumeTrend: AnalyticsVolumePoint[],
  weekCount: number,
  anchorDate: string | Date = new Date(),
): WeeklyActivitySummary[] {
  const weeklyVolume = new Map(
    aggregateWeeklyVolume(volumeTrend).map((entry) => [entry.weekStart, entry]),
  )
  const endWeek = startOfWeek(anchorDate)
  const activity: WeeklyActivitySummary[] = []

  for (let index = weekCount - 1; index >= 0; index -= 1) {
    const currentWeek = new Date(endWeek.getTime() - index * MILLISECONDS_PER_WEEK)
    const weekStart = formatWeekStart(currentWeek)
    const summary = weeklyVolume.get(weekStart)

    activity.push({
      weekStart,
      totalVolume: summary?.totalVolume ?? 0,
      totalSets: summary?.totalSets ?? 0,
      isActive: Boolean(summary && summary.totalSets > 0),
    })
  }

  return activity
}

export function getLatestE1rmPoint(points: AnalyticsE1rmPoint[], exerciseId?: number | null) {
  const filteredPoints = exerciseId
    ? points.filter((point) => point.exerciseId === exerciseId)
    : points

  return [...filteredPoints].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null
}

export function getLatestPrPoint(points: AnalyticsPrPoint[], exerciseId?: number | null) {
  const filteredPoints = exerciseId
    ? points.filter((point) => point.exerciseId === exerciseId)
    : points

  return [...filteredPoints].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null
}

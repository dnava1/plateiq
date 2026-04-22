import type { Json } from '@/types/database'
import { buildStrengthProfile, createEmptyStrengthProfile } from '@/lib/strength-profile'
import { estimateBenchmarkOneRepMax } from '@/lib/strength-benchmarks'
import { DEFAULT_WEIGHT_ROUNDING_LBS } from '@/lib/utils'
import type {
  AnalyticsBodyweightExerciseSummary,
  AnalyticsBodyweightLane,
  AnalyticsBodyweightLoadPoint,
  AnalyticsBodyweightStrictRepPoint,
  AnalyticsConsistency,
  AnalyticsCoverage,
  AnalyticsCoverageFamily,
  AnalyticsCoverageReasonCode,
  AnalyticsCoverageStatus,
  AnalyticsData,
  AnalyticsE1rmPoint,
  AnalyticsMetricCoverage,
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

const COVERAGE_REASON_CODES = new Set<AnalyticsCoverageReasonCode>([
  'bodyweight_only_scope',
  'limited_history',
  'no_amrap_sets',
  'no_bodyweight_sets',
  'no_completed_sessions',
  'no_external_load_sets',
  'no_main_lift_sets',
  'no_training_max_history',
  'strength_profile_insufficient_data',
  'strength_profile_missing_profile',
])

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
  intensityType?: string | null
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

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

function isCoverageStatus(value: string | null): value is AnalyticsCoverageStatus {
  return value === 'ready' || value === 'limited' || value === 'not_applicable'
}

function createMetricCoverage(
  family: AnalyticsCoverageFamily,
  status: AnalyticsCoverageStatus,
  signalCount: number,
  reasonCodes: AnalyticsCoverageReasonCode[] = [],
): AnalyticsMetricCoverage {
  return {
    family,
    reasonCodes,
    signalCount,
    status,
  }
}

export function createEmptyAnalyticsBodyweightLane(): AnalyticsBodyweightLane {
  return {
    exerciseSummaries: [],
    relevant: false,
    strictRepTrend: [],
    weightedLoadTrend: [],
  }
}

export function createEmptyAnalyticsCoverage(): AnalyticsCoverage {
  return {
    metrics: {
      bodyweightLane: createMetricCoverage('bodyweight_specific', 'not_applicable', 0, ['no_bodyweight_sets']),
      consistency: createMetricCoverage('general_logging', 'not_applicable', 0, ['no_completed_sessions']),
      e1rmTrend: createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['no_main_lift_sets']),
      muscleBalance: createMetricCoverage('general_logging', 'not_applicable', 0, ['no_external_load_sets']),
      prHistory: createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['no_main_lift_sets']),
      stallDetection: createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['no_main_lift_sets']),
      strengthProfile: createMetricCoverage('benchmark_profile', 'not_applicable', 0, ['strength_profile_insufficient_data']),
      tmProgression: createMetricCoverage('training_max', 'not_applicable', 0, ['no_training_max_history']),
      volumeTrend: createMetricCoverage('general_logging', 'not_applicable', 0, ['no_external_load_sets']),
    },
  }
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

function parseAnalyticsMetricCoverage(
  value: unknown,
  defaultFamily: AnalyticsCoverageFamily,
): AnalyticsMetricCoverage | null {
  if (!isRecord(value)) {
    return null
  }

  const family = toString(value.family)
  const status = toString(value.status)
  const signalCount = toNumber(value.signal_count ?? value.signalCount)
  const reasonCodes = parseStringArray(value.reason_codes ?? value.reasonCodes)
    .filter((entry): entry is AnalyticsCoverageReasonCode => COVERAGE_REASON_CODES.has(entry as AnalyticsCoverageReasonCode))

  if (!isCoverageStatus(status) || signalCount === null) {
    return null
  }

  return {
    family: family === 'general_logging'
      || family === 'main_lift_amrap'
      || family === 'training_max'
      || family === 'benchmark_profile'
      || family === 'bodyweight_specific'
      ? family
      : defaultFamily,
    reasonCodes,
    signalCount,
    status,
  }
}

function parseAnalyticsBodyweightExerciseSummary(value: unknown): AnalyticsBodyweightExerciseSummary | null {
  if (!isRecord(value)) return null

  const exerciseId = toNumber(value.exercise_id ?? value.exerciseId)
  const exerciseName = toString(value.exercise_name ?? value.exerciseName)
  const strictSessionCount = toNumber(value.strict_session_count ?? value.strictSessionCount)
  const weightedSessionCount = toNumber(value.weighted_session_count ?? value.weightedSessionCount)

  if (
    exerciseId === null
    || exerciseName === null
    || strictSessionCount === null
    || weightedSessionCount === null
  ) {
    return null
  }

  return {
    exerciseId,
    exerciseName,
    lastSessionDate: toString(value.last_session_date ?? value.lastSessionDate),
    latestAddedLoadLbs: toNumber(value.latest_added_load_lbs ?? value.latestAddedLoadLbs),
    latestStrictRepBest: toNumber(value.latest_strict_rep_best ?? value.latestStrictRepBest),
    strictSessionCount,
    weightedSessionCount,
  }
}

function parseAnalyticsBodyweightStrictRepPoint(value: unknown): AnalyticsBodyweightStrictRepPoint | null {
  if (!isRecord(value)) return null

  const bestReps = toNumber(value.best_reps ?? value.bestReps)
  const date = toString(value.date)
  const exerciseId = toNumber(value.exercise_id ?? value.exerciseId)
  const exerciseName = toString(value.exercise_name ?? value.exerciseName)

  if (bestReps === null || date === null || exerciseId === null || exerciseName === null) {
    return null
  }

  return {
    bestReps,
    date,
    exerciseId,
    exerciseName,
  }
}

function parseAnalyticsBodyweightLoadPoint(value: unknown): AnalyticsBodyweightLoadPoint | null {
  if (!isRecord(value)) return null

  const addedWeightLbs = toNumber(value.added_weight_lbs ?? value.addedWeightLbs)
  const date = toString(value.date)
  const exerciseId = toNumber(value.exercise_id ?? value.exerciseId)
  const exerciseName = toString(value.exercise_name ?? value.exerciseName)
  const reps = toNumber(value.reps)

  if (addedWeightLbs === null || date === null || exerciseId === null || exerciseName === null || reps === null) {
    return null
  }

  return {
    addedWeightLbs,
    date,
    exerciseId,
    exerciseName,
    reps,
  }
}

function parseAnalyticsBodyweightLane(value: unknown): AnalyticsBodyweightLane {
  if (!isRecord(value)) {
    return createEmptyAnalyticsBodyweightLane()
  }

  return {
    exerciseSummaries: mapArray(value.exercise_summaries ?? value.exerciseSummaries, parseAnalyticsBodyweightExerciseSummary),
    relevant: value.relevant === true,
    strictRepTrend: mapArray(value.strict_rep_trend ?? value.strictRepTrend, parseAnalyticsBodyweightStrictRepPoint),
    weightedLoadTrend: mapArray(value.weighted_load_trend ?? value.weightedLoadTrend, parseAnalyticsBodyweightLoadPoint),
  }
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

function mergeAnalyticsCoverage(
  fallbackCoverage: AnalyticsCoverage,
  parsedCoverage: Partial<AnalyticsCoverage['metrics']>,
): AnalyticsCoverage {
  return {
    metrics: {
      bodyweightLane: parsedCoverage.bodyweightLane ?? fallbackCoverage.metrics.bodyweightLane,
      consistency: parsedCoverage.consistency ?? fallbackCoverage.metrics.consistency,
      e1rmTrend: parsedCoverage.e1rmTrend ?? fallbackCoverage.metrics.e1rmTrend,
      muscleBalance: parsedCoverage.muscleBalance ?? fallbackCoverage.metrics.muscleBalance,
      prHistory: parsedCoverage.prHistory ?? fallbackCoverage.metrics.prHistory,
      stallDetection: parsedCoverage.stallDetection ?? fallbackCoverage.metrics.stallDetection,
      strengthProfile: parsedCoverage.strengthProfile ?? fallbackCoverage.metrics.strengthProfile,
      tmProgression: parsedCoverage.tmProgression ?? fallbackCoverage.metrics.tmProgression,
      volumeTrend: parsedCoverage.volumeTrend ?? fallbackCoverage.metrics.volumeTrend,
    },
  }
}

function buildFallbackCoverage(analytics: {
  bodyweightLane: AnalyticsBodyweightLane
  consistency: AnalyticsConsistency
  e1rmTrend: AnalyticsE1rmPoint[]
  muscleBalance: AnalyticsMuscleBalancePoint[]
  prHistory: AnalyticsPrPoint[]
  stallDetection: AnalyticsStallPoint[]
  strengthProfile: AnalyticsData['strengthProfile']
  tmProgression: AnalyticsTmProgressionPoint[]
  volumeTrend: AnalyticsVolumePoint[]
}): AnalyticsCoverage {
  const strengthSignalCount = Math.max(analytics.e1rmTrend.length, analytics.prHistory.length, analytics.stallDetection.length)
  const bodyweightSignalCount = analytics.bodyweightLane.exerciseSummaries.length
    + analytics.bodyweightLane.strictRepTrend.length
    + analytics.bodyweightLane.weightedLoadTrend.length

  return {
    metrics: {
      consistency: analytics.consistency.totalSessions > 1
        ? createMetricCoverage('general_logging', 'ready', analytics.consistency.totalSessions)
        : analytics.consistency.totalSessions === 1
          ? createMetricCoverage('general_logging', 'limited', 1, ['limited_history'])
          : createMetricCoverage('general_logging', 'not_applicable', 0, ['no_completed_sessions']),
      volumeTrend: analytics.volumeTrend.length > 1
        ? createMetricCoverage('general_logging', 'ready', analytics.volumeTrend.length)
        : analytics.volumeTrend.length === 1
          ? createMetricCoverage('general_logging', 'limited', 1, ['limited_history'])
          : analytics.bodyweightLane.relevant
            ? createMetricCoverage('general_logging', 'not_applicable', 0, ['bodyweight_only_scope'])
            : createMetricCoverage('general_logging', 'not_applicable', 0, ['no_external_load_sets']),
      muscleBalance: analytics.muscleBalance.length > 1
        ? createMetricCoverage('general_logging', 'ready', analytics.muscleBalance.length)
        : analytics.muscleBalance.length === 1
          ? createMetricCoverage('general_logging', 'limited', 1, ['limited_history'])
          : analytics.bodyweightLane.relevant
            ? createMetricCoverage('general_logging', 'not_applicable', 0, ['bodyweight_only_scope'])
            : createMetricCoverage('general_logging', 'not_applicable', 0, ['no_external_load_sets']),
      e1rmTrend: analytics.e1rmTrend.length > 1
        ? createMetricCoverage('main_lift_amrap', 'ready', analytics.e1rmTrend.length)
        : analytics.e1rmTrend.length === 1
          ? createMetricCoverage('main_lift_amrap', 'limited', 1, ['limited_history'])
          : analytics.bodyweightLane.relevant
            ? createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['bodyweight_only_scope'])
            : createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['no_main_lift_sets']),
      prHistory: analytics.prHistory.length > 1
        ? createMetricCoverage('main_lift_amrap', 'ready', analytics.prHistory.length)
        : analytics.prHistory.length === 1
          ? createMetricCoverage('main_lift_amrap', 'limited', 1, ['limited_history'])
          : analytics.bodyweightLane.relevant
            ? createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['bodyweight_only_scope'])
            : createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['no_main_lift_sets']),
      stallDetection: strengthSignalCount > 1
        ? createMetricCoverage('main_lift_amrap', 'ready', strengthSignalCount)
        : strengthSignalCount === 1
          ? createMetricCoverage('main_lift_amrap', 'limited', 1, ['limited_history'])
          : analytics.bodyweightLane.relevant
            ? createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['bodyweight_only_scope'])
            : createMetricCoverage('main_lift_amrap', 'not_applicable', 0, ['no_main_lift_sets']),
      tmProgression: analytics.tmProgression.length > 1
        ? createMetricCoverage('training_max', 'ready', analytics.tmProgression.length)
        : analytics.tmProgression.length === 1
          ? createMetricCoverage('training_max', 'limited', 1, ['limited_history'])
          : createMetricCoverage('training_max', 'not_applicable', 0, ['no_training_max_history']),
      strengthProfile: analytics.strengthProfile.status === 'ready'
        ? createMetricCoverage('benchmark_profile', 'ready', analytics.strengthProfile.availableLiftCount)
        : analytics.strengthProfile.status === 'missing_profile'
          ? createMetricCoverage('benchmark_profile', 'limited', analytics.strengthProfile.availableLiftCount, ['strength_profile_missing_profile'])
          : analytics.strengthProfile.status === 'insufficient_data'
            ? createMetricCoverage('benchmark_profile', 'limited', analytics.strengthProfile.availableLiftCount, ['strength_profile_insufficient_data'])
            : createMetricCoverage('benchmark_profile', 'not_applicable', 0, ['strength_profile_insufficient_data']),
      bodyweightLane: bodyweightSignalCount > 1
        ? createMetricCoverage('bodyweight_specific', 'ready', bodyweightSignalCount)
        : analytics.bodyweightLane.relevant
          ? createMetricCoverage('bodyweight_specific', 'limited', bodyweightSignalCount, ['limited_history'])
          : createMetricCoverage('bodyweight_specific', 'not_applicable', 0, ['no_bodyweight_sets']),
    },
  }
}

function parseAnalyticsCoverage(value: unknown, fallbackCoverage: AnalyticsCoverage): AnalyticsCoverage {
  if (!isRecord(value)) {
    return fallbackCoverage
  }

  const metrics = value.metrics && isRecord(value.metrics) ? value.metrics : null

  return mergeAnalyticsCoverage(fallbackCoverage, {
    bodyweightLane: parseAnalyticsMetricCoverage(metrics?.bodyweight_lane ?? metrics?.bodyweightLane, 'bodyweight_specific') ?? undefined,
    consistency: parseAnalyticsMetricCoverage(metrics?.consistency, 'general_logging') ?? undefined,
    e1rmTrend: parseAnalyticsMetricCoverage(metrics?.e1rm_trend ?? metrics?.e1rmTrend, 'main_lift_amrap') ?? undefined,
    muscleBalance: parseAnalyticsMetricCoverage(metrics?.muscle_balance ?? metrics?.muscleBalance, 'general_logging') ?? undefined,
    prHistory: parseAnalyticsMetricCoverage(metrics?.pr_history ?? metrics?.prHistory, 'main_lift_amrap') ?? undefined,
    stallDetection: parseAnalyticsMetricCoverage(metrics?.stall_detection ?? metrics?.stallDetection, 'main_lift_amrap') ?? undefined,
    strengthProfile: parseAnalyticsMetricCoverage(metrics?.strength_profile ?? metrics?.strengthProfile, 'benchmark_profile') ?? undefined,
    tmProgression: parseAnalyticsMetricCoverage(metrics?.tm_progression ?? metrics?.tmProgression, 'training_max') ?? undefined,
    volumeTrend: parseAnalyticsMetricCoverage(metrics?.volume_trend ?? metrics?.volumeTrend, 'general_logging') ?? undefined,
  })
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

  const bodyweightLane = parseAnalyticsBodyweightLane(record.bodyweight_lane)
  const analyticsCore = {
    bodyweightLane,
    consistency: parseAnalyticsConsistency(record.consistency),
    e1rmTrend: mapArray(record.e1rm_trend, parseAnalyticsE1rmPoint),
    muscleBalance: mapArray(record.muscle_balance, parseAnalyticsMuscleBalancePoint),
    prHistory: mapArray(record.pr_history, parseAnalyticsPrPoint),
    stallDetection: mapArray(record.stall_detection, parseAnalyticsStallPoint),
    tmProgression: mapArray(record.tm_progression, parseAnalyticsTmProgressionPoint),
    volumeTrend: mapArray(record.volume_trend, parseAnalyticsVolumePoint),
    strengthProfile: buildStrengthProfile(parseStrengthProfileRawData(record.strength_profile), weightRoundingLbs),
  }
  const coverage = parseAnalyticsCoverage(record.coverage, buildFallbackCoverage(analyticsCore))

  return {
    bodyweightLane,
    coverage,
    e1rmTrend: analyticsCore.e1rmTrend,
    volumeTrend: analyticsCore.volumeTrend,
    prHistory: analyticsCore.prHistory,
    consistency: analyticsCore.consistency,
    muscleBalance: analyticsCore.muscleBalance,
    stallDetection: analyticsCore.stallDetection,
    tmProgression: analyticsCore.tmProgression,
    strengthProfile: analyticsCore.strengthProfile,
  }
}

export function hasRenderableAnalyticsData(analytics: AnalyticsData) {
  return analytics.e1rmTrend.length > 0
    || analytics.volumeTrend.length > 0
    || analytics.prHistory.length > 0
    || analytics.muscleBalance.length > 0
    || analytics.stallDetection.length > 0
    || analytics.consistency.totalSessions > 0
    || analytics.tmProgression.length > 0
    || analytics.bodyweightLane.relevant
    || analytics.strengthProfile.status !== 'missing_profile'
}

export function hasInsightEligibleAnalyticsData(analytics: AnalyticsData) {
  return analytics.coverage.metrics.consistency.signalCount > 0
    || analytics.coverage.metrics.volumeTrend.signalCount > 0
    || analytics.coverage.metrics.e1rmTrend.signalCount > 0
    || analytics.coverage.metrics.prHistory.signalCount > 0
    || analytics.coverage.metrics.stallDetection.signalCount > 0
    || analytics.coverage.metrics.tmProgression.signalCount > 0
    || analytics.coverage.metrics.bodyweightLane.signalCount > 0
    || analytics.coverage.metrics.strengthProfile.signalCount > 0
}

export function hasAnalyticsData(analytics: AnalyticsData) {
  return hasRenderableAnalyticsData(analytics)
}

export function formatAnalyticsCoverageFamily(family: AnalyticsCoverageFamily) {
  switch (family) {
    case 'general_logging':
      return 'General logging'
    case 'main_lift_amrap':
      return 'Main-lift strength'
    case 'training_max':
      return 'Training max'
    case 'benchmark_profile':
      return 'Strength profile'
    case 'bodyweight_specific':
      return 'Bodyweight review'
    default:
      return 'Coverage'
  }
}

export function describeAnalyticsCoverageReasons(reasonCodes: AnalyticsCoverageReasonCode[]) {
  if (reasonCodes.includes('bodyweight_only_scope')) {
    return 'This scope is bodyweight-led, so load-based metrics are intentionally withheld.'
  }

  if (reasonCodes.includes('no_completed_sessions')) {
    return 'Finish more sessions to build this view.'
  }

  if (reasonCodes.includes('no_external_load_sets')) {
    return 'This metric needs logged external-load sets.'
  }

  if (reasonCodes.includes('no_amrap_sets') || reasonCodes.includes('no_main_lift_sets')) {
    return 'This metric needs comparable main-lift strength history.'
  }

  if (reasonCodes.includes('no_training_max_history')) {
    return 'Training max history has not been recorded for this scope.'
  }

  if (reasonCodes.includes('strength_profile_missing_profile')) {
    return 'Complete the strength profile inputs to unlock this view.'
  }

  if (reasonCodes.includes('strength_profile_insufficient_data')) {
    return 'More benchmark-ready lift history is needed here.'
  }

  if (reasonCodes.includes('no_bodyweight_sets')) {
    return 'No bodyweight work landed in this filter window.'
  }

  if (reasonCodes.includes('limited_history')) {
    return 'The signal is present, but the history is still thin.'
  }

  return 'Coverage depends on the available training signal.'
}

export function summarizeAnalyticsCoverageFamilies(coverage: AnalyticsCoverage) {
  const summaries = new Map<AnalyticsCoverageFamily, {
    family: AnalyticsCoverageFamily
    reasonCodes: AnalyticsCoverageReasonCode[]
    signalCount: number
    status: AnalyticsCoverageStatus
  }>()

  for (const metric of Object.values(coverage.metrics)) {
    const current = summaries.get(metric.family)

    if (!current) {
      summaries.set(metric.family, {
        family: metric.family,
        reasonCodes: [...metric.reasonCodes],
        signalCount: metric.signalCount,
        status: metric.status,
      })
      continue
    }

    current.signalCount += metric.signalCount
    current.reasonCodes = Array.from(new Set([...current.reasonCodes, ...metric.reasonCodes]))

    if (current.status !== 'ready' && metric.status === 'ready') {
      current.status = 'ready'
    } else if (current.status === 'not_applicable' && metric.status === 'limited') {
      current.status = 'limited'
    }
  }

  return [
    'general_logging',
    'main_lift_amrap',
    'training_max',
    'benchmark_profile',
    'bodyweight_specific',
  ].map((family) => summaries.get(family as AnalyticsCoverageFamily) ?? {
    family: family as AnalyticsCoverageFamily,
    reasonCodes: [],
    signalCount: 0,
    status: 'not_applicable' as AnalyticsCoverageStatus,
  })
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

function isBodyweightSet(set: Pick<AnalyticsSourceSet, 'intensityType'>) {
  return set.intensityType === 'bodyweight'
}

function buildBodyweightLane(
  scopedSets: AnalyticsSourceSet[],
  exerciseById: Map<number, AnalyticsSourceExercise>,
  workoutById: Map<number, AnalyticsSourceWorkout>,
): AnalyticsBodyweightLane {
  const bodyweightSets = scopedSets.filter((set) => isBodyweightSet(set) && set.repsActual !== null)

  if (!bodyweightSets.length) {
    return createEmptyAnalyticsBodyweightLane()
  }

  const summaries = new Map<number, {
    exerciseId: number
    exerciseName: string
    lastSessionDate: string | null
    latestAddedLoadLbs: number | null
    latestStrictDate: string | null
    latestStrictRepBest: number | null
    strictWorkoutIds: Set<number>
    weightedWorkoutIds: Set<number>
  }>()
  const strictTrend = new Map<string, AnalyticsBodyweightStrictRepPoint>()
  const weightedTrend = new Map<string, AnalyticsBodyweightLoadPoint>()

  for (const set of bodyweightSets) {
    const exercise = exerciseById.get(set.exerciseId)
    const workout = workoutById.get(set.workoutId)

    if (!exercise || !workout || set.repsActual === null) {
      continue
    }

    const currentSummary = summaries.get(set.exerciseId) ?? {
      exerciseId: set.exerciseId,
      exerciseName: exercise.name,
      lastSessionDate: null,
      latestAddedLoadLbs: null,
      latestStrictDate: null,
      latestStrictRepBest: null,
      strictWorkoutIds: new Set<number>(),
      weightedWorkoutIds: new Set<number>(),
    }
    const isWeighted = set.weightLbs > 0

    if (!currentSummary.lastSessionDate || workout.scheduledDate > currentSummary.lastSessionDate) {
      currentSummary.lastSessionDate = workout.scheduledDate
    }

    if (isWeighted) {
      currentSummary.weightedWorkoutIds.add(set.workoutId)

      if (
        currentSummary.latestAddedLoadLbs === null
        || set.weightLbs > currentSummary.latestAddedLoadLbs
        || currentSummary.lastSessionDate === workout.scheduledDate
      ) {
        currentSummary.latestAddedLoadLbs = set.weightLbs
      }

      const weightedKey = `${workout.scheduledDate}:${set.exerciseId}`
      const existingWeightedPoint = weightedTrend.get(weightedKey)

      if (
        !existingWeightedPoint
        || set.weightLbs > existingWeightedPoint.addedWeightLbs
        || (set.weightLbs === existingWeightedPoint.addedWeightLbs && set.repsActual > existingWeightedPoint.reps)
      ) {
        weightedTrend.set(weightedKey, {
          addedWeightLbs: set.weightLbs,
          date: workout.scheduledDate,
          exerciseId: set.exerciseId,
          exerciseName: exercise.name,
          reps: set.repsActual,
        })
      }
    } else {
      currentSummary.strictWorkoutIds.add(set.workoutId)

      if (!currentSummary.latestStrictDate || workout.scheduledDate > currentSummary.latestStrictDate) {
        currentSummary.latestStrictDate = workout.scheduledDate
        currentSummary.latestStrictRepBest = set.repsActual
      } else if (workout.scheduledDate === currentSummary.latestStrictDate) {
        currentSummary.latestStrictRepBest = Math.max(currentSummary.latestStrictRepBest ?? 0, set.repsActual)
      }

      const strictKey = `${workout.scheduledDate}:${set.exerciseId}`
      const existingStrictPoint = strictTrend.get(strictKey)

      if (!existingStrictPoint || set.repsActual > existingStrictPoint.bestReps) {
        strictTrend.set(strictKey, {
          bestReps: set.repsActual,
          date: workout.scheduledDate,
          exerciseId: set.exerciseId,
          exerciseName: exercise.name,
        })
      }
    }

    summaries.set(set.exerciseId, currentSummary)
  }

  return {
    exerciseSummaries: Array.from(summaries.values())
      .map((summary) => ({
        exerciseId: summary.exerciseId,
        exerciseName: summary.exerciseName,
        lastSessionDate: summary.lastSessionDate,
        latestAddedLoadLbs: summary.latestAddedLoadLbs,
        latestStrictRepBest: summary.latestStrictRepBest,
        strictSessionCount: summary.strictWorkoutIds.size,
        weightedSessionCount: summary.weightedWorkoutIds.size,
      }))
      .sort((left, right) => {
        if (left.lastSessionDate && right.lastSessionDate && left.lastSessionDate !== right.lastSessionDate) {
          return right.lastSessionDate.localeCompare(left.lastSessionDate)
        }

        return left.exerciseName.localeCompare(right.exerciseName)
      }),
    relevant: true,
    strictRepTrend: Array.from(strictTrend.values()).sort((left, right) => left.date.localeCompare(right.date)),
    weightedLoadTrend: Array.from(weightedTrend.values()).sort((left, right) => left.date.localeCompare(right.date)),
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
  const scopedSets = inRangeSets.filter((set) => !exerciseId || set.exerciseId === exerciseId)
  const externalLoadScopedSets = scopedSets.filter((set) => !isBodyweightSet(set))
  const mainLiftAmrapScopedSets = externalLoadScopedSets.filter((set) => {
    const exercise = exerciseById.get(set.exerciseId)
    return Boolean(exercise?.isMainLift && set.isAmrap && set.repsActual !== null && set.repsActual > 0)
  })
  const bodyweightLane = buildBodyweightLane(scopedSets, exerciseById, workoutById)
  const e1rmTrend = mainLiftAmrapScopedSets
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

  for (const set of externalLoadScopedSets) {
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

  const scopedWorkoutIds = new Set(scopedSets.map((set) => set.workoutId))
  const completedWorkoutsInRange = workouts
    .filter(
      (workout) => workout.completedAt
        && isWithinRange(workout.scheduledDate, normalizedDateFrom, normalizedDateTo)
        && (!exerciseId || scopedWorkoutIds.has(workout.id)),
    )
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate))
  const activeWeeks = new Set(completedWorkoutsInRange.map((workout) => formatWeekStart(startOfWeek(workout.scheduledDate))))
  const muscleBalanceTotals = new Map<string, number>()

  for (const set of externalLoadScopedSets) {
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
    if (!set.isAmrap || set.repsActual === null || isBodyweightSet(set) || (exerciseId && set.exerciseId !== exerciseId)) {
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

  const analytics = {
    bodyweightLane,
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

  return {
    ...analytics,
    coverage: buildFallbackCoverage(analytics),
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

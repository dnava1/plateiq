import type { StrengthProfileSex } from './domain'

export interface DashboardProgramSummary {
  id: number
  name: string
  templateKey: string
}

export interface DashboardCycleSummary {
  id: number
  cycleNumber: number
}

export interface DashboardRecentWorkout {
  id: number
  exerciseName: string
  weekNumber: number
  completedAt: string | null
  scheduledDate: string
}

export interface DashboardTrainingMax {
  exerciseId: number
  exerciseName: string
  weightLbs: number
  effectiveDate: string
}

export interface DashboardData {
  activeProgram: DashboardProgramSummary | null
  currentCycle: DashboardCycleSummary | null
  recentWorkouts: DashboardRecentWorkout[]
  currentTms: DashboardTrainingMax[]
}

export interface AnalyticsE1rmPoint {
  date: string
  exerciseId: number
  exerciseName: string
  weight: number
  reps: number
  e1rm: number
}

export interface AnalyticsVolumePoint {
  weekStart: string
  exerciseId: number
  exerciseName: string
  totalVolume: number
  totalSets: number
}

export interface AnalyticsPrPoint {
  date: string
  exerciseId: number
  exerciseName: string
  weight: number
  reps: number
  e1rm: number
}

export interface AnalyticsConsistency {
  totalSessions: number
  weeksActive: number
  firstSession: string | null
  lastSession: string | null
}

export interface AnalyticsMuscleBalancePoint {
  movementPattern: string
  totalVolume: number
  volumePct: number
}

export interface AnalyticsStallPoint {
  exerciseId: number
  exerciseName: string
  lastPrDate: string
  weeksSincePr: number
}

export interface AnalyticsTmProgressionPoint {
  effectiveDate: string
  exerciseId: number
  exerciseName: string
  weightLbs: number
}

export type StrengthProfileStatus = 'missing_profile' | 'insufficient_data' | 'ready'
export type StrengthProfileMissingField = 'sex' | 'ageYears' | 'bodyweightLbs'

export interface StrengthProfileRepMax {
  reps: number
  weightLbs: number
}

export interface StrengthProfileProfile {
  sex: StrengthProfileSex | null
  ageYears: number | null
  bodyweightLbs: number | null
}

export interface StrengthProfileRawLift {
  liftSlug: string
  displayName: string
  categoryKey: string
  categoryLabel: string
  sourceExerciseId: number
  sourceExerciseName: string
  bestDate: string
  bestReps: number
  bestExternalWeightLbs: number
  bestTotalLoadLbs: number
  bestOneRepMaxLbs: number
  benchmarkOneRepMaxLbs: number
  muscleWeights: Record<string, number>
  actualRepMaxes: StrengthProfileRepMax[]
  benchmarkRepMaxes: StrengthProfileRepMax[]
}

export interface StrengthProfileRawData {
  profile: StrengthProfileProfile
  minimumLiftCount: number
  minimumCategoryCount: number
  lifts: StrengthProfileRawLift[]
}

export interface StrengthProfileCategoryScore {
  categoryKey: string
  categoryLabel: string
  liftSlug: string
  liftName: string
  score: number
  strengthLabel: string
}

export interface StrengthProfileHighlight {
  liftSlug: string
  displayName: string
  deviationFromTotalPct: number
  actualOneRepMaxLbs: number
  expectedOneRepMaxLbs: number
}

export interface StrengthProfileMuscleGroup {
  muscleKey: string
  title: string
  score: number
  strengthLabel: string
}

export interface StrengthProfileLift extends StrengthProfileRawLift {
  score: number
  strengthLabel: string
  expectedOneRepMaxLbs: number | null
  expectedRepMaxes: StrengthProfileRepMax[]
  expectedAtTotalScoreLbs: number | null
  deviationFromTotalPct: number | null
}

export interface StrengthProfileData {
  status: StrengthProfileStatus
  missingFields: StrengthProfileMissingField[]
  profile: StrengthProfileProfile
  availableLiftCount: number
  availableCategoryCount: number
  minimumLiftCount: number
  minimumCategoryCount: number
  totalScore: number | null
  totalLabel: string | null
  symmetryScore: number | null
  strongestLift: StrengthProfileHighlight | null
  weakestLift: StrengthProfileHighlight | null
  categories: StrengthProfileCategoryScore[]
  lifts: StrengthProfileLift[]
  muscleGroups: StrengthProfileMuscleGroup[]
}

export interface AnalyticsData {
  e1rmTrend: AnalyticsE1rmPoint[]
  volumeTrend: AnalyticsVolumePoint[]
  prHistory: AnalyticsPrPoint[]
  consistency: AnalyticsConsistency
  muscleBalance: AnalyticsMuscleBalancePoint[]
  stallDetection: AnalyticsStallPoint[]
  tmProgression: AnalyticsTmProgressionPoint[]
  strengthProfile: StrengthProfileData
}

export interface DerivedRecentPr extends AnalyticsPrPoint {
  improvementLbs: number | null
}

export interface WeeklyVolumeSummary {
  weekStart: string
  totalVolume: number
  totalSets: number
}

export interface WeeklyActivitySummary extends WeeklyVolumeSummary {
  isActive: boolean
}
